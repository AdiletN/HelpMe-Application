const db = require('../db');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const weekday = date => DAY_NAMES[new Date(date + 'T12:00:00Z').getUTCDay()];
const available = (userId, date, time) => {
  if (!validDate(date) || !validTime(time)) return false;
  return !!db.prepare(`SELECT 1 FROM availability WHERE user_id = ? AND day = ?
    AND start_time <= ? AND end_time > ? LIMIT 1`).get(userId, weekday(date), time, time);
};
const qualified = (userId, request) => {
  const helper = db.prepare('SELECT specialization_id FROM users WHERE user_id = ?').get(userId);
  if (!helper || helper.specialization_id !== request.specialization_id || userId === request.requester_id) return false;
  const offer = db.prepare('SELECT 1 FROM help_offers WHERE user_id = ? AND course_id = ? AND topic_id = ?')
    .get(userId, request.course_id, request.topic_id);
  return !!offer && available(userId, request.preferred_date, request.preferred_time);
};
module.exports = { validDate, validTime, weekday, available, qualified };
