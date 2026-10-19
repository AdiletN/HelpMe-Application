const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { qualified, validDate, validTime, available } = require('../lib/matching');
const router = express.Router();
router.use(requireAuth);

const requestRow = id => db.prepare(`
  SELECT r.*, c.name AS course_name, c.specialization_id,
    t.name AS topic_name, u.full_name AS requester_name, u.university AS requester_university,
    u.year AS requester_year, h.full_name AS helper_name, h.university AS helper_university,
    a.rating AS my_rating, a.feedback AS my_feedback
  FROM help_requests r
  JOIN courses c ON c.course_id = r.course_id
  JOIN topics t ON t.topic_id = r.topic_id
  JOIN users u ON u.user_id = r.requester_id
  LEFT JOIN users h ON h.user_id = r.helper_id
  LEFT JOIN ratings a ON a.request_id = r.request_id
  WHERE r.request_id = ?`).get(id);

const mayAccept = (r, userId) => r.status === 'pending' &&
  (!r.helper_id || r.helper_id === userId) && qualified(userId, r);

// Public request board scoped to a student's degree. Requests aimed at another helper never appear.
router.get('/feed', (req, res) => {
  const me = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId);
  const rows = db.prepare(`SELECT r.request_id FROM help_requests r
    JOIN courses c ON c.course_id = r.course_id
    LEFT JOIN request_dismissals d ON d.request_id = r.request_id AND d.user_id = ?
    WHERE c.specialization_id = ? AND r.requester_id != ?
    AND r.status = 'pending' AND (r.helper_id IS NULL OR r.helper_id = ?)
    AND d.request_id IS NULL ORDER BY r.request_id DESC LIMIT 100`)
    .all(req.userId, me.specialization_id, req.userId, req.userId);
  res.json(rows.map(({ request_id }) => {
    const r = requestRow(request_id);
    return { ...r, can_accept: mayAccept(r, req.userId), targeted: r.helper_id === req.userId };
  }));
});

// A request can also be sent directly to a suitable helper from a helper's profile.
router.post('/', (req, res) => {
  const { course_id, topic_id, description, preferred_date, preferred_time, study_format, helper_id } = req.body || {};
  if (!course_id || !topic_id || typeof description !== 'string' || !description.trim() || !preferred_date || !preferred_time)
    return res.status(400).json({ error: 'Course, topic, description, date and time are required.' });
  if (description.trim().length > 1500) return res.status(400).json({ error: 'Describe your question in 1500 characters or fewer.' });
  if (!validDate(preferred_date) || !validTime(preferred_time)) return res.status(400).json({ error: 'Invalid date or time.' });
  if (preferred_date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Choose a future date.' });
  if (study_format && !['Online', 'In person (campus)'].includes(study_format))
    return res.status(400).json({ error: 'Choose a valid study format.' });
  const me = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId);
  const ok = db.prepare(`SELECT 1 FROM topics t JOIN courses c ON c.course_id = t.course_id
    WHERE t.topic_id = ? AND c.course_id = ? AND c.specialization_id = ?`)
    .get(topic_id, course_id, me.specialization_id);
  if (!ok) return res.status(403).json({ error: 'Only courses and topics within your specialization are allowed.' });
  const target = helper_id ? Number(helper_id) : null;
  if (helper_id && (!Number.isSafeInteger(target) || target === req.userId))
    return res.status(400).json({ error: 'Choose another student as your helper.' });
  if (target && !qualified(target, { specialization_id: me.specialization_id, requester_id: req.userId,
    course_id: Number(course_id), topic_id: Number(topic_id), preferred_date, preferred_time }))
    return res.status(400).json({ error: 'This helper does not offer this topic at that time. Choose another helper or create an open request.' });
  const info = db.prepare(`INSERT INTO help_requests
    (requester_id, helper_id, course_id, topic_id, description, preferred_date, preferred_time, study_format)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(req.userId, target, course_id, topic_id, description.trim(), preferred_date, preferred_time, study_format || null);
  res.status(201).json({ request_id: info.lastInsertRowid, status: 'pending' });
});

router.get('/mine', (req, res) => {
  const ids = db.prepare('SELECT request_id FROM help_requests WHERE requester_id = ? ORDER BY request_id DESC').all(req.userId);
  res.json(ids.map(r => requestRow(r.request_id)));
});
router.get('/incoming', (req, res) => {
  const ids = db.prepare(`SELECT request_id FROM help_requests WHERE helper_id = ? ORDER BY request_id DESC`).all(req.userId);
  res.json(ids.map(r => requestRow(r.request_id)));
});

// Atomic UPDATE means two helpers cannot accept the same open request.
router.post('/:id/accept', (req, res) => {
  const result = db.transaction(() => {
    const r = requestRow(req.params.id);
    if (!r || !mayAccept(r, req.userId) || r.preferred_date < new Date().toISOString().slice(0, 10)) return false;
    const updated = db.prepare(`UPDATE help_requests SET helper_id = ?, status = 'accepted'
      WHERE request_id = ? AND status = 'pending' AND (helper_id IS NULL OR helper_id = ?)`)
      .run(req.userId, req.params.id, req.userId);
    return updated.changes > 0;
  })();
  if (!result) return res.status(409).json({ error: 'This request is no longer available, or your offer/time does not match.' });
  res.json({ ok: true, request: requestRow(req.params.id) });
});

// Only a specifically invited helper can reject. Open-board requests remain open to others.
router.post('/:id/reject', (req, res) => {
  const result = db.prepare(`UPDATE help_requests SET status = 'rejected'
    WHERE request_id = ? AND helper_id = ? AND status = 'pending'`).run(req.params.id, req.userId);
  if (!result.changes) return res.status(409).json({ error: 'Only pending invitations can be declined.' });
  res.json({ ok: true });
});
router.post('/:id/dismiss', (req, res) => {
  const r = requestRow(req.params.id);
  if (!r || r.status !== 'pending' || r.helper_id || r.requester_id === req.userId ||
      r.specialization_id !== db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(req.userId).specialization_id)
    return res.status(403).json({ error: 'Only open requests in your specialization can be hidden.' });
  db.prepare('INSERT OR IGNORE INTO request_dismissals(request_id, user_id) VALUES (?, ?)').run(req.params.id, req.userId);
  res.json({ ok: true });
});
router.post('/:id/cancel', (req, res) => {
  const result = db.prepare(`UPDATE help_requests SET status = 'cancelled'
    WHERE request_id = ? AND requester_id = ? AND status IN ('pending', 'accepted')`)
    .run(req.params.id, req.userId);
  if (!result.changes) return res.status(409).json({ error: 'Only pending or accepted requests can be cancelled.' });
  res.json({ ok: true });
});
router.post('/:id/withdraw', (req, res) => {
  const result = db.prepare(`UPDATE help_requests SET helper_id = NULL, status = 'pending'
    WHERE request_id = ? AND helper_id = ? AND status = 'accepted'`)
    .run(req.params.id, req.userId);
  if (!result.changes) return res.status(409).json({ error: 'You can withdraw only from an accepted session.' });
  res.json({ ok: true });
});
router.post('/:id/complete', (req, res) => {
  const result = db.prepare(`UPDATE help_requests SET status = 'completed'
    WHERE request_id = ? AND requester_id = ? AND status = 'accepted'`)
    .run(req.params.id, req.userId);
  if (!result.changes) return res.status(409).json({ error: 'Only the requester can confirm an accepted session is complete.' });
  res.json({ ok: true });
});
router.post('/:id/rate', (req, res) => {
  const r = requestRow(req.params.id);
  const score = Number(req.body?.rating);
  const feedback = req.body?.feedback == null ? '' : req.body.feedback;
  if (typeof feedback !== 'string') return res.status(400).json({ error: 'Feedback must be text.' });
  if (!r || r.requester_id !== req.userId || r.status !== 'completed' || !r.helper_id)
    return res.status(403).json({ error: 'You can rate a helper only after your completed session.' });
  if (!Number.isInteger(score) || score < 1 || score > 5 || typeof feedback !== 'string' || feedback.length > 600)
    return res.status(400).json({ error: 'Choose 1–5 stars and optional feedback (up to 600 characters).' });
  const result = db.prepare(`INSERT OR IGNORE INTO ratings(request_id, reviewer_id, reviewed_user_id, rating, feedback)
    VALUES (?, ?, ?, ?, ?)`).run(r.request_id, req.userId, r.helper_id, score, feedback.trim());
  if (!result.changes) return res.status(409).json({ error: 'You have already reviewed this session.' });
  res.status(201).json({ ok: true });
});

module.exports = router;
