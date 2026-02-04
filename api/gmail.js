import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';

const TOKEN_DIR = process.env.GOOGLE_TOKEN_DIR || '/home/ubuntu/.config/google';

const ACCOUNTS = [
  { email: 'norman.desilva@gmail.com', tokenFile: 'token_norman_desilva_gmail_com.json' },
  { email: 'norman@listid.us', tokenFile: 'token_norman_listid_us.json' },
  { email: 'normancdesilva@gmail.com', tokenFile: 'token_normancdesilva_gmail_com.json' }
];

function getAuthClient(tokenPath) {
  const token = JSON.parse(readFileSync(tokenPath, 'utf8'));
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

export async function searchEmails(keywords, daysAgo = 60) {
  const results = [];
  const after = Math.floor(Date.now() / 1000) - (daysAgo * 86400);
  
  const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');
  const query = `(${keywordQuery}) after:${after}`;

  for (const account of ACCOUNTS) {
    try {
      const tokenPath = join(TOKEN_DIR, account.tokenFile);
      const auth = getAuthClient(tokenPath);
      const gmail = google.gmail({ version: 'v1', auth });

      console.log(`Searching ${account.email} for: ${query}`);

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500
      });

      if (!response.data.messages) {
        console.log(`  No messages found in ${account.email}`);
        continue;
      }

      console.log(`  Found ${response.data.messages.length} messages in ${account.email}`);

      for (const msg of response.data.messages) {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        results.push({
          id: msg.id,
          threadId: msg.threadId,
          account: account.email,
          data: fullMsg.data
        });
      }

    } catch (error) {
      console.error(`Error searching ${account.email}:`, error.message);
    }
  }

  return results;
}

export async function getCalendarEvents(daysAgo = 60) {
  const results = [];
  const timeMin = new Date(Date.now() - (daysAgo * 86400000)).toISOString();

  // Use primary account for calendar
  const account = ACCOUNTS[0];
  
  try {
    const tokenPath = join(TOKEN_DIR, account.tokenFile);
    const auth = getAuthClient(tokenPath);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      maxResults: 1000,
      singleEvents: true,
      orderBy: 'startTime',
    });

    if (response.data.items) {
      console.log(`Found ${response.data.items.length} calendar events`);
      results.push(...response.data.items);
    }

  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
  }

  return results;
}

export default { searchEmails, getCalendarEvents };
