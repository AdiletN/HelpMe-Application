const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validDate, validTime, available } = require('../lib/matching');
const router = express.Router();
router.use(requireAuth);

const helperDetails = id => {
  const h = db.prepare(`SELECT u.user_id, u.full_name, u.university, u.year, u.specialization_id,
    s.name AS specialization, ROUND(AVG(r.rating),1) AS rating, COUNT(r.rating) AS review_count
    FROM users u JOIN specializations s ON s.specialization_id = u.specialization_id
    LEFT JOIN ratings r ON r.reviewed_user_id = u.user_id
    WHERE u.user_id = ? GROUP BY u.user_id`).get(id);
  if (!h) return null;
  h.offers = db.prepare(`SELECT o.course_id, o.topic_id, c.name AS course_name, t.name AS topic_name
    FROM help_offers o JOIN courses c ON c.course_id = o.course_id
    JOIN topics t ON t.topic_id = o.topic_id WHERE o.user_id = ? ORDER BY course_name, topic_name`).all(id);
  h.availability = db.prepare('SELECT day, start_time, end_time FROM availability WHERE user_id = ? ORDER BY availability_id').all(id);
  h.reviews = db.prepare(`SELECT r.rating, r.feedback, r.created_at, u.full_name AS reviewer_name
    FROM ratings r JOIN users u ON u.user_id = r.reviewer_id
    WHERE r.reviewed_user_id = ? ORDER BY r.rating_id DESC LIMIT 12`).all(id);
  return h;
};

router.get('/', (req, res) => {
  const me = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId);
  const ids = db.prepare(`SELECT DISTINCT u.user_id FROM users u
    JOIN help_offers o ON o.user_id = u.user_id
    WHERE u.specialization_id = ? AND u.user_id != ? ORDER BY u.user_id DESC`)
    .all(me.specialization_id, req.userId);
  let helpers = ids.map(row => helperDetails(row.user_id));
  const course = req.query.course_id ? Number(req.query.course_id) : null;
  const topic = req.query.topic_id ? Number(req.query.topic_id) : null;
  if (course || topic) helpers = helpers.filter(h => h.offers.some(o => (!course || o.course_id === course) && (!topic || o.topic_id === topic)));
  if (req.query.date && req.query.time) {
    if (!validDate(req.query.date) || !validTime(req.query.time)) return res.status(400).json({ error: 'Invalid date or time.' });
    helpers = helpers.filter(h => available(h.user_id, req.query.date, req.query.time));
  }
  res.json(helpers.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.review_count - a.review_count));
});
router.get('/:id', (req, res) => {
  const me = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId);
  const h = helperDetails(req.params.id);
  if (!h || h.specialization_id !== me.specialization_id || h.user_id === req.userId)
    return res.status(404).json({ error: 'Helper not found in your specialization.' });
  res.json(h);
});
module.exports = router;
