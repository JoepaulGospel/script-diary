# Tiziano Scripts — setup

Same pattern as Logger: a small backend that saves everything to
a Turso database, so your scripts sync across every device.

## What's in here

- `index.html`, `styles.css`, `script.js` — the app
- `api/scripts.js` — one server function: list, create, update
  (including autosave and the "Shot already" toggle), delete
- `lib/db.js` — shared database connection + table setup
- `package.json` — tells Vercel to install `@libsql/client`

## One-time setup

1. **Turso database** — you can reuse the same one Logger uses,
   or create a fresh one at turso.tech (either works, this app
   makes its own `scripts` table and won't touch Logger's data).
   Copy the **Database URL** and an **Auth Token**.

2. **Push this folder to GitHub** as its own repo — everything
   here needs to sit at the root of the repo (not nested inside
   another folder), same as Logger.

3. **Import into Vercel** as a new project. Before deploying,
   add Environment Variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   Then Deploy.

4. **Open the live URL.** Tap **+** to start a new script, type —
   it saves on its own a moment after you stop typing. Tap "Shot
   already" once you've filmed it. Open the same URL on your
   phone and you'll see the same list.

## If you see a red banner at the top

It means the app couldn't reach Turso — the message underneath
tells you the real reason, almost always a wrong or missing
`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`. Fix it in Vercel's
Environment Variables, then Deployments → ⋯ → Redeploy.

## Screenplay formatting

Above the writing area, six buttons — Scene, Action, Character,
Parenthetical, Dialogue, Transition — indent whatever line your
cursor is on to match standard industry margins (the same ones
Final Draft uses). Click into a line, tap the matching button.

## Downloading a script

Open any script and click "Download PDF." It builds a proper
title page (title + "by" + writer name) followed by the script
itself in Courier, with page numbers and a faint "Tiziano Films"
watermark across every page. Works the same on any device.
