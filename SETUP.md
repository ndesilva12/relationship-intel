# Setup Instructions

## ✅ What's Already Done

- ✅ GitHub repo created: https://github.com/ndesilva12/relationship-intel
- ✅ API code pushed
- ✅ Web UI pushed to gh-pages branch
- ✅ Initial data sync complete (79 contacts, 414+ emails)

## 🎯 What You Need to Do

### 1. Enable GitHub Pages (2 minutes)

1. Go to: https://github.com/ndesilva12/relationship-intel/settings/pages
2. Under "Build and deployment":
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` / `/ (root)`
3. Click **Save**
4. Wait 1-2 minutes, then visit: **https://ndesilva12.github.io/relationship-intel/**

**Note:** The web UI will show errors until you deploy the API (next step).

---

### 2. Deploy API to Railway (5 minutes)

**Install Railway CLI:**

```bash
npm install -g @railway/cli
```

**Deploy:**

```bash
cd /home/ubuntu/clawd/relationship-intel/api
railway login
# Browser will open - authorize Railway

railway init
# Name: relationship-intel-api
# Choose: Empty project

# Deploy
railway up

# Get the URL
railway domain
# Copy the URL (e.g., https://relationship-intel-api-production.up.railway.app)
```

**Set Environment Variables:**

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

**Important:** You'll need to upload Google OAuth tokens to Railway:

```bash
# Create a config folder in Railway deployment
railway run bash
# Then inside Railway shell:
mkdir -p /app/config
exit

# Upload tokens (do this from your local machine where tokens exist)
railway run cp /home/ubuntu/.config/google/token_*.json /app/config/
```

**Alternative (easier):** For now, keep the API running on this server and use ngrok/tunneling.

---

### 3. Update Web UI with API URL

Once you have the Railway URL (or ngrok URL):

```bash
cd /home/ubuntu/clawd/relationship-intel
nano index.html
```

Change line 58:
```javascript
const API_URL = 'http://localhost:3001/api';
```

To:
```javascript
const API_URL = 'https://YOUR-RAILWAY-URL.railway.app/api';
```

Save, commit, push:

```bash
git add index.html
git commit -m "Update API URL for production"
git push origin gh-pages
git push origin master
```

---

### 4. Set Up Auto-Sync (Optional, 2 minutes)

**Option A: Railway Cron (if API is on Railway)**

In Railway dashboard:
- Go to your deployment
- Add a new service: Cron Job
- Schedule: `0 */6 * * *` (every 6 hours)
- Command: `node sync-emails.js`

**Option B: Server Cron (if API stays on this server)**

```bash
crontab -e
```

Add:
```
0 */6 * * * cd /home/ubuntu/clawd/relationship-intel/api && /usr/bin/node sync-emails.js >> /tmp/relationship-intel-sync.log 2>&1
```

---

## 🚀 Quick Test (Local)

**Right now, before deployment:**

1. API is running at: http://localhost:3001
2. Open the web UI locally:

```bash
cd /home/ubuntu/clawd/relationship-intel
python3 -m http.server 9000
```

Then visit: http://localhost:9000

(Or just open `index.html` in a browser directly)

---

## 🔧 Easier Alternative: Keep API on This Server

If Railway setup is annoying, you can:

1. **Keep API running here** (this server)
2. **Use ngrok for public URL:**

```bash
# Install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Get auth token from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN

# Start tunnel
ngrok http 3001
```

Copy the `https://xxxx.ngrok-free.app` URL and use it in `index.html`.

---

## 📊 Current Data

- **Contacts:** 79
- **Emails:** 414
- **Meetings:** 2 (will be more after re-sync with improved detection)

---

## 🐛 Troubleshooting

**Web UI shows CORS errors?**
- API needs to allow your GitHub Pages domain
- Add to `api/server.js`:

```javascript
app.use(cors({
  origin: 'https://ndesilva12.github.io'
}));
```

**No data loading?**
- Check API URL in `index.html`
- Check API is running: `curl http://localhost:3001/api/health`
- Check browser console for errors

**Sync not finding emails?**
- Refresh tokens: `bash /home/ubuntu/clawd/scripts/refresh_all_google_tokens.sh`
- Check keywords in `api/.env`

---

## Next Steps After Deployment

1. Test the live web UI
2. Re-sync with improved calendar detection
3. Add Listid project
4. Build contact detail modal
5. Add manual note editing
