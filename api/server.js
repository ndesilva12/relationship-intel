import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import syncEmails from './sync-emails.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project details
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contacts for a project
app.get('/api/projects/:id/contacts', (req, res) => {
  try {
    const projectId = req.params.id;
    
    const contacts = db.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT i.id) as interaction_count
      FROM contacts c
      JOIN contact_projects cp ON c.email = cp.contact_email
      LEFT JOIN interactions i ON i.project_id = ?
        AND (i.from_email = c.email OR EXISTS (
          SELECT 1 FROM interaction_participants ip 
          WHERE ip.interaction_id = i.id AND ip.email = c.email
        ))
      WHERE cp.project_id = ?
      GROUP BY c.email
      ORDER BY c.last_seen DESC
    `).all(projectId, projectId);
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single contact
app.get('/api/contacts/:email', (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE email = ?').get(req.params.email);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get projects
    const projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN contact_projects cp ON p.id = cp.project_id
      WHERE cp.contact_email = ?
    `).all(req.params.email);

    res.json({ ...contact, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get interactions for a contact
app.get('/api/contacts/:email/interactions', (req, res) => {
  try {
    const email = req.params.email;
    const projectId = req.query.projectId;
    
    let query = `
      SELECT DISTINCT i.*
      FROM interactions i
      LEFT JOIN interaction_participants ip ON i.id = ip.interaction_id
      WHERE (i.from_email = ? OR ip.email = ?)
    `;
    
    const params = [email, email];
    
    if (projectId) {
      query += ' AND i.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY i.date DESC LIMIT 100';
    
    const interactions = db.prepare(query).all(...params);
    
    // Attach participants to each interaction
    const withParticipants = interactions.map(interaction => {
      const participants = db.prepare(`
        SELECT email, name, role
        FROM interaction_participants
        WHERE interaction_id = ?
      `).all(interaction.id);
      
      return { ...interaction, participants };
    });
    
    res.json(withParticipants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update contact notes
app.patch('/api/contacts/:email', (req, res) => {
  try {
    const { notes, status, tags } = req.body;
    
    const updates = [];
    const params = [];
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(typeof tags === 'string' ? tags : tags.join(','));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(req.params.email);
    
    db.prepare(`
      UPDATE contacts
      SET ${updates.join(', ')}
      WHERE email = ?
    `).run(...params);
    
    const contact = db.prepare('SELECT * FROM contacts WHERE email = ?').get(req.params.email);
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger email sync
app.post('/api/sync', async (req, res) => {
  try {
    // Run sync in background
    syncEmails().catch(err => console.error('Sync error:', err));
    
    res.json({ message: 'Sync started', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Relationship Intel API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
