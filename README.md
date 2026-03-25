# Let's Go! — Research Interview App

AI-powered user research interview tool for the Let's Go! car buying advisor MVP.

## What it does

- Runs a structured 60-minute research interview via Claude
- Automatically generates a synthesis document after each session
- Saves all sessions to browser localStorage (per device)
- Admin panel to review all completed sessions

---

## Deploy to Vercel (10 minutes)

### Step 1 — Push to GitHub

1. Create a new repository on GitHub (e.g. `letsgo-research`)
2. In your terminal, from this folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/letsgo-research.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New → Project**
3. Import your `letsgo-research` GitHub repository
4. Framework preset: **Vite** (Vercel detects this automatically)
5. Click **Deploy** — it will fail on first deploy because the API key isn't set yet. That's fine.

### Step 3 — Add your Anthropic API key

1. In your Vercel project, go to **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your Anthropic API key (from console.anthropic.com)
   - **Environments:** Production, Preview, Development (tick all three)
3. Click **Save**

### Step 4 — Redeploy

1. Go to the **Deployments** tab
2. Click the three dots on the latest deployment → **Redeploy**
3. Wait ~30 seconds

Your app is now live at `https://letsgo-research.vercel.app` (or similar).

---

## Share with participants

Send them the Vercel URL. That's it. No account needed, no install, works on mobile too.

---

## View results

Open the app → click **"View research results"** at the bottom of the welcome screen.

Note: Each participant's data is saved in their own browser's localStorage. To see all sessions in one place, you (the researcher) need to run sessions from the same browser/device, or participants need to share their synthesis with you via the "Copy synthesis" button.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Add your API key to .env.local
npm run dev
```

---

## Project structure

```
letsgo-research/
├── api/
│   └── chat.js          # Vercel serverless function — proxies Anthropic API
├── src/
│   ├── main.jsx         # React entry point
│   └── App.jsx          # Full interview app
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```
