// Extract email addresses and names from Gmail messages
export function parseEmailMessage(message) {
  const headers = message.payload.headers;
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('From');
  const to = getHeader('To');
  const cc = getHeader('Cc');
  const subject = getHeader('Subject');
  const date = getHeader('Date');

  const snippet = message.snippet || '';
  const body = extractBody(message.payload);

  return {
    messageId: message.id,
    threadId: message.threadId,
    from: parseEmailAddress(from),
    to: parseEmailAddressList(to),
    cc: parseEmailAddressList(cc),
    subject,
    date: new Date(date),
    snippet,
    body,
    labels: message.labelIds || []
  };
}

function extractBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // Fallback to HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }

  return '';
}

function parseEmailAddress(str) {
  if (!str) return null;
  
  const match = str.match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
  if (!match) return null;

  return {
    name: match[1]?.trim() || match[2]?.split('@')[0] || '',
    email: match[2]?.trim().toLowerCase() || ''
  };
}

function parseEmailAddressList(str) {
  if (!str) return [];
  
  return str.split(',')
    .map(s => parseEmailAddress(s.trim()))
    .filter(Boolean);
}

export function extractContacts(parsedMessage, accountEmail) {
  const contacts = new Map();

  const addContact = (person) => {
    if (!person || !person.email) return;
    
    // Skip self
    if (person.email.toLowerCase() === accountEmail.toLowerCase()) return;

    if (!contacts.has(person.email)) {
      contacts.set(person.email, {
        email: person.email,
        name: person.name || person.email.split('@')[0],
        firstSeen: parsedMessage.date,
        lastSeen: parsedMessage.date
      });
    } else {
      const existing = contacts.get(person.email);
      if (parsedMessage.date < existing.firstSeen) {
        existing.firstSeen = parsedMessage.date;
      }
      if (parsedMessage.date > existing.lastSeen) {
        existing.lastSeen = parsedMessage.date;
      }
    }
  };

  addContact(parsedMessage.from);
  parsedMessage.to.forEach(addContact);
  parsedMessage.cc.forEach(addContact);

  return Array.from(contacts.values());
}

export default { parseEmailMessage, extractContacts };
