const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'local-helpme-development-secret';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('Set JWT_SECRET in production.');

function sign(userId) {
  return jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try {
    req.userId = jwt.verify(token, SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

module.exports = { sign, requireAuth };
