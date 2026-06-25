# Reflex Rush 🎯

A fast-paced reflex clicker game built with Next.js + React. Targets pop up
around the arena — click them before they vanish. Chain hits to raise your combo
multiplier, grab the gold targets for 5× points, and beat your high score before
the 30-second clock runs out.

**Stage 1 deliverable** for the Brave Career AI residency.

## How it plays

- 30-second rounds.
- Each normal target is worth 10 points, gold targets 50.
- Every 5 hits in a row bumps your multiplier (×1 → ×2 → ×3 …).
- Letting a target expire, or clicking empty space, resets your combo.
- Your best score persists in the browser (`localStorage`).

## Run it locally

> One-time cleanup: this folder may contain a `node_modules` / `.next` built on
> Linux. Delete them first so you install the right binaries for your machine:
>
> ```bash
> rm -rf node_modules .next package-lock.json
> ```

```bash
npm install
npm run dev          # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

## Deploy to Vercel

You have two paths — the dashboard is the easiest.

**Option A — Vercel dashboard (recommended)**

1. Push this project to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Reflex Rush — Stage 1 website"
   gh repo create reflex-rush --public --source=. --push
   ```
   (or create the repo on github.com and `git push` to it.)
2. Go to https://vercel.com → **Add New… → Project**.
3. **Import** the `reflex-rush` repo. Vercel auto-detects Next.js — no config needed.
4. Click **Deploy**. In ~30 seconds you get a live URL like
   `https://reflex-rush.vercel.app`.
5. Every future `git push` to `main` auto-deploys.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel            # follow the prompts, accept the Next.js defaults
vercel --prod     # promote to your production URL
```

## Ship it (Stage 1 checklist)

- [ ] Live Vercel URL works on desktop and mobile
- [ ] Posted on LinkedIn with the link, tagging **Leyuan** + **Brave Career**
- [ ] Wrote the 2–3 paragraph reflection (see `REFLECTION.md`)

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · plain CSS. No external game
libraries — the spawn engine, combo logic, and timer are hand-rolled in
`app/Game.tsx`.
