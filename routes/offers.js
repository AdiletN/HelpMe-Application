const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const { validTime } = require('../lib/matching');

router.get('/mine', (req, res) => {
  const offers = db.prepare('SELECT course_id, topic_id FROM help_offers WHERE user_id = ?').all(req.userId);
  const availability = db.prepare('SELECT day, start_time, end_time FROM availability WHERE user_id = ?').all(req.userId);
  res.json({ offers, availability });
});

// Diagram 6: save / update help offer.
// KEY BUSINESS RULE (Diagram 4) is enforced HERE on the backend.
router.post('/', (req, res) => {
  const { topicIds = [], availability = [] } = req.body || {};
  if (!Array.isArray(topicIds) || !Array.isArray(availability) || topicIds.length > 100 || availability.length > 28) return res.status(400).json({ error: 'Too many topics or time slots.' });
  if (!topicIds.length) return res.status(400).json({ error: 'Select at least one topic you can explain.' });
  if (!availability.length) return res.status(400).json({ error: 'Add at least one available time slot.' });

  const me = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId);
  const check = db.prepare(`SELECT t.topic_id, t.course_id FROM topics t
    JOIN courses c ON c.course_id = t.course_id
    WHERE t.topic_id = ? AND c.specialization_id = ?`);
  const rows = [];
  for (const id of new Set(topicIds.map(Number))) {
    const r = check.get(id, me.specialization_id);
    if (!r) return res.status(403).json({ error: 'You can offer help only within your registered specialization.' });
    rows.push(r);
  }
  for (const a of availability) {
    if (!DAYS.includes(a.day) || !validTime(a.start_time) || !validTime(a.end_time) || a.start_time >= a.end_time)
      return res.status(400).json({ error: 'Each time slot needs a day and a start time earlier than the end time.' });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM help_offers WHERE user_id = ?').run(req.userId);
    const insO = db.prepare('INSERT INTO help_offers(user_id, course_id, topic_id) VALUES (?,?,?)');
    rows.forEach(r => insO.run(req.userId, r.course_id, r.topic_id));
    db.prepare('DELETE FROM availability WHERE user_id = ?').run(req.userId);
    const insA = db.prepare('INSERT INTO availability(user_id, day, start_time, end_time) VALUES (?,?,?,?)');
    availability.forEach(a => insA.run(req.userId, a.day, a.start_time, a.end_time));
  })();
  res.json({ ok: true });
});

module.exports = router;
