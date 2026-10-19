const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', (req, res) => {
  const offers = db.prepare(`SELECT c.name AS course_name, t.name AS topic_name FROM help_offers o
    JOIN courses c ON c.course_id = o.course_id JOIN topics t ON t.topic_id = o.topic_id
    WHERE o.user_id = ? ORDER BY c.name, t.name`).all(req.userId);
  const availability = db.prepare('SELECT day, start_time, end_time FROM availability WHERE user_id = ?').all(req.userId);
  const reviews = db.prepare(`SELECT r.rating, r.feedback, r.created_at, u.full_name AS reviewer_name
    FROM ratings r JOIN users u ON u.user_id = r.reviewer_id
    WHERE r.reviewed_user_id = ? ORDER BY r.rating_id DESC`).all(req.userId);
  res.json({ user: publicUser(req.userId), offers, availability, reviews });
});
router.put('/', (req, res) => {
  const { full_name, university, year } = req.body || {};
  const y = Number(year);
  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 80 ||
      typeof university !== 'string' || !university.trim() || university.length > 100 || !Number.isInteger(y) || y < 1 || y > 6)
    return res.status(400).json({ error: 'Enter a name, university, and study year (1–6).' });
  db.prepare('UPDATE users SET full_name = ?, university = ?, year = ? WHERE user_id = ?')
    .run(full_name.trim(), university.trim(), y, req.userId);
  res.json({ user: publicUser(req.userId) });
});
module.exports = router;
