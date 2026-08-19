// api/scripts.js
// GET    -> list all scripts, most recently edited first
// POST   -> create a new (blank) script
// PUT    -> update a script by ?id= (title, body, and/or shot status)
// DELETE -> remove a script by ?id=

import { getDb, ensureSchema } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const db = getDb();
    const now = new Date().toISOString();

    if (req.method === "GET") {
      const result = await db.execute("SELECT * FROM scripts ORDER BY updated_at DESC");
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const title = (req.body && req.body.title) || "Untitled";
      const body = (req.body && req.body.body) || "";
      const result = await db.execute({
        sql: `INSERT INTO scripts (title, body, shot, created_at, updated_at)
              VALUES (?, ?, 0, ?, ?)`,
        args: [title, body, now, now],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid) });
    }

    if (req.method === "PUT") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const fields = [];
      const args = [];
      if (req.body.title !== undefined) { fields.push("title = ?"); args.push(req.body.title); }
      if (req.body.body !== undefined) { fields.push("body = ?"); args.push(req.body.body); }
      if (req.body.shot !== undefined) { fields.push("shot = ?"); args.push(req.body.shot ? 1 : 0); }
      fields.push("updated_at = ?"); args.push(now);
      args.push(id);

      await db.execute({
        sql: `UPDATE scripts SET ${fields.join(", ")} WHERE id = ?`,
        args,
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await db.execute({ sql: "DELETE FROM scripts WHERE id = ?", args: [id] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({
      error: "Database connection failed",
      details: err.message || String(err),
    });
  }
}
