const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../middleware/auth');
const router = express.Router();

const publicUser = id => db.prepare(`
  SELECT u.user_id, u.full_name, u.email, u.university, u.year, u.specialization_id,
         s.name AS specialization
  FROM users u JOIN specializations s ON s.specialization_id = u.specialization_id
  WHERE u.user_id = ?`).get(id);

// Diagram 2: registration. Specialization is REQUIRED.
router.post('/register', (req, res) => {
  const { full_name, email, password, university, specialization_id, year } = req.body || {};
  if (!full_name || !email || !password || !university || !specialization_id || !year)
    return res.status(400).json({ error: 'All fields are required, including your specialization.' });
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid university e-mail.' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 80 || typeof university !== 'string' || university.trim().length < 2 || university.length > 100)
    return res.status(400).json({ error: 'Please enter your full name and university.' });
  const y = Number(year);
  if (!(y >= 1 && y <= 6)) return res.status(400).json({ error: 'Year of study must be between 1 and 6.' });
  if (!db.prepare('SELECT 1 FROM specializations WHERE specialization_id = ?').get(specialization_id))
    return res.status(400).json({ error: 'Unknown specialization.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'This e-mail is already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`INSERT INTO users(full_name,email,password,university,specialization_id,year)
                           VALUES (?,?,?,?,?,?)`)
    .run(full_name.trim(), email.toLowerCase(), hash, university, specialization_id, y);
  res.status(201).json({ token: sign(info.lastInsertRowid), user: publicUser(info.lastInsertRowid) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return res.status(400).json({ error: 'Enter e-mail and password.' });
  const row = db.prepare('SELECT user_id, password FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password))
    return res.status(401).json({ error: 'Wrong e-mail or password.' });
  res.json({ token: sign(row.user_id), user: publicUser(row.user_id) });
});

module.exports = router;
module.exports.publicUser = publicUser;
