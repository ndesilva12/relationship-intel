# Quick Start Guide

## ✅ Status

**Working:**
- ✅ Email sync (all 3 Gmail accounts)
- ✅ Calendar integration
- ✅ SQLite database
- ✅ REST API (Express)
- ✅ Simple web UI (dark theme)
- ✅ GitHub repo created: https://github.com/ndesilva12/relationship-intel

**First sync results:**
- **79 contacts**
- **414 emails**
- **2 meetings**
- **Last 60 days of Cinderella project**

## 🚀 Run Locally (Right Now)

### 1. API is already running!

```bash
# Check health
curl http://localhost:3001/api/health

# View project stats
curl http://localhost:3001/api/projects/cinderella | python3 -m json.tool

# List all contacts
curl http://localhost:3001/api/projects/cinderella/contacts | python3 -m json.tool
```

### 2. Open the web UI

**Option A: Python HTTP server**

```bash
cd /home/ubuntu/clawd/relationship-intel/web-simple
python3 -m http.server 8080
```

Then open: http://localhost:8080

**Option B: Direct file**

```bash
xdg-open /home/ubuntu/clawd/relationship-intel/web-simple/index.html
# or just open the file in any browser
```

## 🔄 Re-sync Data

```bash
cd /home/ubuntu/clawd/relationship-intel/api
node sync-emails.js
```

This will:
- Pull latest emails from all 3 accounts
- Extract new contacts
- Update interaction history
- Refresh calendar events

## 📊 View Data

### Web UI Features:
- **Stats dashboard** - Total contacts, interactions, this week's activity
- **Contact list** - Searchable, sortable
- **Status indicators** - Active (< 7 days), Warm (< 30 days), Cold (> 30 days)
- **Interaction counts** - See who you communicate with most
- **Last contact dates** - Track relationship recency

### API Endpoints:

```bash
# Get all projects
curl http://localhost:3001/api/projects

# Get project details
curl http://localhost:3001/api/projects/cinderella

# Get contacts for project
curl http://localhost:3001/api/projects/cinderella/contacts

# Get single contact
curl http://localhost:3001/api/contacts/adrian@sc.holdings

# Get interactions for contact
curl 'http://localhost:3001/api/contacts/adrian@sc.holdings/interactions?projectId=cinderella'

# Trigger sync
curl -X POST http://localhost:3001/api/sync
```

## 🎨 Customization

### Add More Keywords

Edit `api/.env`:

```bash
CINDERELLA_KEYWORDS=cinderella,ncaa,college basketball,pe acquisition,wrexham,d1 basketball,university acquisition,your-new-keyword
```

Then re-sync.

### Add Notes to Contacts

```bash
curl -X PATCH http://localhost:3001/api/contacts/adrian@sc.holdings \
  -H 'Content-Type: application/json' \
  -d '{"notes": "Key investor, very responsive", "status": "active"}'
```

### Change Sync Period

In `api/sync-emails.js`, line 13:

```javascript
const messages = await searchEmails(KEYWORDS, 60);  // Change 60 to desired days
```

## 🌐 Deploy to Production

See `DEPLOY.md` for:
- Railway deployment (free tier)
- GitHub Pages for frontend
- systemd service for self-hosting
- Auto-sync cron jobs

## 🛠 Troubleshooting

**No contacts found?**
- Check keywords match your email content
- Verify date range (default: last 60 days)
- Check token refresh: `bash /home/ubuntu/clawd/scripts/refresh_all_google_tokens.sh`

**API errors?**
- Check logs: `tail -f /tmp/relationship-intel-api.log`
- Restart: `pkill -f "node server.js" && cd api && node server.js &`

**Database locked?**
- Don't run sync while API is writing
- Stop API first: `pkill -f "node server.js"`

## 📁 Project Structure

```
relationship-intel/
├── api/                    # Express API + sync scripts
│   ├── server.js          # API server
│   ├── sync-emails.js     # Email/calendar sync
│   ├── db.js              # SQLite schema
│   ├── gmail.js           # Gmail API wrapper
│   └── parser.js          # Email parsing utilities
├── data/                  # SQLite database
│   └── relationship-intel.db
├── web-simple/            # Static web UI
│   └── index.html         # Dashboard (Tailwind CSS)
├── web/                   # React app (future)
└── README.md
```

## 🔜 Next Steps

1. **Deploy to Railway** - Get public API URL
2. **Set up GitHub Pages** - Host web UI at ndesilva12.github.io
3. **Add Listid project** - Sync 3-4 years of data
4. **Build contact detail view** - Full interaction timeline
5. **Add manual notes UI** - In-browser editing
6. **Auto-sync cron** - Every 6 hours
7. **Email notifications** - Alert on important contacts

---

**Need help?** Check `README.md` and `DEPLOY.md` for detailed docs.
