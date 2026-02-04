# Deployment Guide

## Local Development

### Quick Start

```bash
# 1. Run initial sync
cd api
node sync-emails.js

# 2. Start API server
node server.js

# 3. Open web UI
# Open web-simple/index.html in your browser
```

### Or use the all-in-one script:

```bash
./start.sh
```

## Production Deployment

### Option 1: Railway (Recommended)

**Deploy API:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd api
railway init

# Set environment variables
railway variables set GOOGLE_TOKEN_DIR=/home/ubuntu/.config/google
railway variables set CINDERELLA_KEYWORDS="cinderella,ncaa,college basketball,pe acquisition"

# Deploy
railway up
```

**Configure cron for auto-sync:**

In Railway dashboard:
- Add Cron job: `0 */6 * * *` (every 6 hours)
- Command: `node sync-emails.js`

### Option 2: Self-hosted (This Server)

**Run as systemd service:**

```bash
sudo nano /etc/systemd/system/relationship-intel.service
```

```ini
[Unit]
Description=Relationship Intel API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/clawd/relationship-intel/api
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable relationship-intel
sudo systemctl start relationship-intel
```

**Add cron for syncing:**

```bash
crontab -e
```

Add:
```
0 */6 * * * cd /home/ubuntu/clawd/relationship-intel/api && node sync-emails.js >> /tmp/relationship-intel-sync.log 2>&1
```

### Web Frontend

**Option A: GitHub Pages (Static)**

```bash
# Build simple web (already static)
# Just commit and push to gh-pages branch

cd /home/ubuntu/clawd/relationship-intel
git checkout -b gh-pages
git add web-simple/
git commit -m "Deploy web UI"
git push origin gh-pages
```

Access at: `https://ndesilva12.github.io/relationship-intel/web-simple/`

**Update API URL in index.html:**

Change `const API_URL = 'http://localhost:3001/api';` to your Railway URL.

**Option B: Netlify/Vercel**

Simpler - just connect GitHub repo and deploy `web-simple/` folder.

## GitHub Setup

```bash
cd /home/ubuntu/clawd/relationship-intel

# Create GitHub repo first at github.com/ndesilva12/relationship-intel

git remote add origin https://github.com/ndesilva12/relationship-intel.git
git add .
git commit -m "Initial commit: Relationship Intel dashboard"
git push -u origin master
```

## Environment Variables

Required for API:

- `GOOGLE_TOKEN_DIR` - Path to Google OAuth tokens (default: `/home/ubuntu/.config/google`)
- `CINDERELLA_KEYWORDS` - Comma-separated keywords for email filtering
- `PORT` - API port (default: 3001)

Optional:

- `NODE_ENV` - Set to `production` for prod deployments

## Database

SQLite database stored at: `data/relationship-intel.db`

**Backup:**

```bash
cp data/relationship-intel.db data/backups/backup-$(date +%Y%m%d).db
```

**Reset:**

```bash
rm data/relationship-intel.db
node sync-emails.js  # Rebuilds from scratch
```

## Security Notes

- **Never commit Google OAuth tokens** (already in .gitignore)
- API has CORS enabled - lock down in production if needed
- Database contains email content - keep secure
- Consider adding auth middleware for production

## Monitoring

**Check API health:**

```bash
curl http://localhost:3001/api/health
```

**View logs:**

```bash
# systemd service
sudo journalctl -u relationship-intel -f

# manual run
tail -f /tmp/relationship-intel-sync.log
```

## Troubleshooting

**"invalid_request" errors:**

Tokens expired. Refresh:

```bash
bash /home/ubuntu/clawd/scripts/refresh_all_google_tokens.sh
```

**No emails found:**

Check keywords match your emails. Test with broader terms first.

**Database locked:**

Only one process should write at a time. Stop server before running sync manually.

## Future: Firestore Migration

To switch to Firestore later:

1. Create Firebase project
2. Download service account key
3. Uncomment Firestore code in `api/firestore.js`
4. Run migration script to copy SQLite → Firestore
5. Update server.js to use Firestore imports

(Migration script TBD - ping me when ready)
