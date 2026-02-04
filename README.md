# Relationship Intel

Professional relationship intelligence dashboard. Automatically tracks and organizes your professional network by project, pulling from email and calendar.

## Features

- **Project-based organization** - Group contacts by project (Cinderella, Listid, etc.)
- **Auto-sync from Gmail** - Pulls emails and calendar events
- **Relationship tracking** - See last contact, upcoming meetings, interaction history
- **Smart search & filtering** - Find people by name, company, status, timeline
- **Manual notes** - Add context, status updates, relationship notes

## Architecture

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express API
- **Database:** Google Firestore
- **Email/Calendar:** Google Gmail & Calendar APIs

## Setup

### Prerequisites

- Node.js 18+
- Google OAuth tokens (already configured at `/home/ubuntu/.config/google/`)
- Firebase project with Firestore enabled

### Install

```bash
# Install API dependencies
cd api
npm install

# Install web dependencies
cd ../web
npm install
```

### Configure

```bash
# Copy example env
cp api/.env.example api/.env

# Edit as needed (defaults should work)
nano api/.env
```

### Run

```bash
# Development (API + Web together)
npm run dev

# Or run separately:
npm run dev:api   # API on http://localhost:3001
npm run dev:web   # Web on http://localhost:3000
```

### Initial Sync

```bash
# Sync Cinderella emails (last 60 days)
npm run sync
```

## Usage

1. **Sync emails** - Run `npm run sync` to pull latest emails/calendar
2. **Open dashboard** - Visit http://localhost:3000
3. **Browse contacts** - See all people in the project
4. **View interactions** - Click any contact for full email/meeting history
5. **Add notes** - Update relationship status, next steps, context

## Deploy

### API (Railway)

```bash
cd api
railway init
railway up
```

### Web (GitHub Pages)

```bash
cd web
npm run build
# Push to gh-pages branch
```

## Data Model

### Collections

**projects**
- `id` - Project slug (cinderella, listid)
- `name` - Display name
- `keywords` - Search keywords for email filtering
- `contactCount`, `interactionCount` - Stats

**contacts**
- `email` - Primary key
- `name` - Display name
- `projects[]` - Project IDs this contact belongs to
- `firstSeen`, `lastSeen` - Timestamps
- `notes`, `status`, `tags` - Manual fields

**interactions**
- `type` - email | meeting
- `projectId` - Associated project
- `from`, `to`, `subject`, `date` - Email metadata
- `eventId`, `title`, `attendees` - Meeting metadata
- `body`, `snippet` - Content preview

## Development

- `api/server.js` - Express API server
- `api/sync-emails.js` - Email/calendar sync script
- `api/gmail.js` - Gmail API wrapper
- `api/parser.js` - Email parsing utilities
- `api/firestore.js` - Firestore initialization
- `web/src/` - React app

## License

MIT
