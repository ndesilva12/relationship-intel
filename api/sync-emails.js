#!/usr/bin/env node
import 'dotenv/config';
import { searchEmails, getCalendarEvents } from './gmail.js';
import { parseEmailMessage, extractContacts } from './parser.js';
import db from './db.js';

const PROJECT_ID = 'cinderella';
const KEYWORDS = process.env.CINDERELLA_KEYWORDS?.split(',').map(k => k.trim()) || ['cinderella'];

async function syncEmails() {
  console.log('🔍 Starting email sync for Cinderella project...');
  console.log(`   Keywords: ${KEYWORDS.join(', ')}`);

  try {
    // Fetch emails
    const messages = await searchEmails(KEYWORDS, 60);
    console.log(`\n📧 Found ${messages.length} total messages`);

    const contactsMap = new Map();
    const interactions = [];

    // Process each message
    for (const msg of messages) {
      const parsed = parseEmailMessage(msg.data);
      const contacts = extractContacts(parsed, msg.account);

      // Store interaction
      interactions.push({
        type: 'email',
        projectId: PROJECT_ID,
        messageId: parsed.messageId,
        threadId: parsed.threadId,
        account: msg.account,
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        date: parsed.date,
        snippet: parsed.snippet,
        body: parsed.body.substring(0, 5000),
      });

      // Merge contacts
      contacts.forEach(contact => {
        if (contactsMap.has(contact.email)) {
          const existing = contactsMap.get(contact.email);
          if (contact.firstSeen < existing.firstSeen) existing.firstSeen = contact.firstSeen;
          if (contact.lastSeen > existing.lastSeen) existing.lastSeen = contact.lastSeen;
        } else {
          contactsMap.set(contact.email, contact);
        }
      });
    }

    console.log(`\n👥 Extracted ${contactsMap.size} unique contacts`);

    // Fetch calendar events
    const events = await getCalendarEvents(60);
    
    // Get all contacts we've found in emails
    const contactEmails = new Set(Array.from(contactsMap.keys()));
    
    // Filter events: must have keywords OR include one of our contacts
    const relevantEvents = events.filter(event => {
      const text = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
      const hasKeyword = KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
      
      // Check if any attendees match our contacts
      const attendees = event.attendees || [];
      const hasRelevantAttendee = attendees.some(a => contactEmails.has(a.email));
      
      return hasKeyword || hasRelevantAttendee;
    });

    console.log(`\n📅 Found ${relevantEvents.length} relevant calendar events`);

    // Process calendar events
    for (const event of relevantEvents) {
      const attendees = event.attendees || [];
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      
      interactions.push({
        type: 'meeting',
        projectId: PROJECT_ID,
        eventId: event.id,
        title: event.summary,
        date: eventDate,
        description: event.description || '',
        attendees: attendees.map(a => ({ email: a.email, name: a.displayName || a.email })),
      });

      // Add attendees to contacts
      attendees.forEach(attendee => {
        if (!attendee.email) return;
        
        if (contactsMap.has(attendee.email)) {
          const existing = contactsMap.get(attendee.email);
          if (eventDate < existing.firstSeen) existing.firstSeen = eventDate;
          if (eventDate > existing.lastSeen) existing.lastSeen = eventDate;
        } else {
          contactsMap.set(attendee.email, {
            email: attendee.email,
            name: attendee.displayName || attendee.email.split('@')[0],
            firstSeen: eventDate,
            lastSeen: eventDate
          });
        }
      });
    }

    // Write to database
    console.log('\n💾 Writing to database...');

    // Create/update project
    const upsertProject = db.prepare(`
      INSERT INTO projects (id, name, description, keywords, last_sync, contact_count, interaction_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_sync = excluded.last_sync,
        contact_count = excluded.contact_count,
        interaction_count = excluded.interaction_count
    `);

    upsertProject.run(
      PROJECT_ID,
      'Cinderella',
      'PE acquisition of NCAA D1 basketball program',
      KEYWORDS.join(','),
      Math.floor(Date.now() / 1000),
      contactsMap.size,
      interactions.length
    );

    // Insert contacts
    const upsertContact = db.prepare(`
      INSERT INTO contacts (email, name, first_seen, last_seen, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        first_seen = MIN(first_seen, excluded.first_seen),
        last_seen = MAX(last_seen, excluded.last_seen),
        updated_at = excluded.updated_at
    `);

    const linkContactProject = db.prepare(`
      INSERT OR IGNORE INTO contact_projects (contact_email, project_id)
      VALUES (?, ?)
    `);

    const insertMany = db.transaction((contacts) => {
      for (const contact of contacts) {
        upsertContact.run(
          contact.email,
          contact.name,
          Math.floor(contact.firstSeen.getTime() / 1000),
          Math.floor(contact.lastSeen.getTime() / 1000),
          Math.floor(Date.now() / 1000)
        );
        linkContactProject.run(contact.email, PROJECT_ID);
      }
    });

    insertMany(Array.from(contactsMap.values()));

    // Insert interactions
    const insertInteraction = db.prepare(`
      INSERT INTO interactions (
        type, project_id, message_id, thread_id, event_id,
        from_email, from_name, subject, title, date,
        snippet, body, account
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParticipant = db.prepare(`
      INSERT INTO interaction_participants (interaction_id, email, name, role)
      VALUES (?, ?, ?, ?)
    `);

    const insertInteractionWithParticipants = db.transaction((interactions) => {
      for (const interaction of interactions) {
        const result = insertInteraction.run(
          interaction.type,
          interaction.projectId,
          interaction.messageId || null,
          interaction.threadId || null,
          interaction.eventId || null,
          interaction.from?.email || null,
          interaction.from?.name || null,
          interaction.subject || null,
          interaction.title || null,
          Math.floor(interaction.date.getTime() / 1000),
          interaction.snippet || null,
          interaction.body || null,
          interaction.account || null
        );

        const interactionId = result.lastInsertRowid;

        // Add participants
        if (interaction.to) {
          interaction.to.forEach(p => {
            insertParticipant.run(interactionId, p.email, p.name, 'to');
          });
        }

        if (interaction.attendees) {
          interaction.attendees.forEach(p => {
            insertParticipant.run(interactionId, p.email, p.name, 'attendee');
          });
        }
      }
    });

    insertInteractionWithParticipants(interactions);

    console.log('\n✅ Sync complete!');
    console.log(`   Contacts: ${contactsMap.size}`);
    console.log(`   Interactions: ${interactions.length}`);
    console.log(`     - Emails: ${interactions.filter(i => i.type === 'email').length}`);
    console.log(`     - Meetings: ${interactions.filter(i => i.type === 'meeting').length}`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncEmails()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default syncEmails;
