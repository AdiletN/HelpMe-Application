const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Public: needed on the registration page
router.get('/specializations', (req, res) => {
  res.json(db.prepare('SELECT * FROM specializations ORDER BY name').all());
});

// Courses + topics of the LOGGED-IN student's specialization only
router.get('/catalog', requireAuth, (req, res) => {
  const me = db.prepare(`SELECT u.specialization_id, s.name FROM users u
    JOIN specializations s ON s.specialization_id = u.specialization_id WHERE u.user_id = ?`).get(req.userId);
  const courses = db.prepare('SELECT course_id, name FROM courses WHERE specialization_id = ? ORDER BY name').all(me.specialization_id);
  const topicsStmt = db.prepare('SELECT topic_id, name FROM topics WHERE course_id = ? ORDER BY name');
  res.json({ specialization: me.name, courses: courses.map(c => ({ ...c, topics: topicsStmt.all(c.course_id) })) });
});

module.exports = router;
