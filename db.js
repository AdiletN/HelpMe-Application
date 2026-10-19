// Database layer (SQLite). Tables follow the ER diagram (Diagram 10).
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'helpme.db'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS specializations (
  specialization_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  university TEXT NOT NULL,
  specialization_id INTEGER NOT NULL REFERENCES specializations(specialization_id),
  year INTEGER NOT NULL,
  profile_photo TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialization_id INTEGER NOT NULL REFERENCES specializations(specialization_id)
);
CREATE TABLE IF NOT EXISTS topics (
  topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(course_id)
);
CREATE TABLE IF NOT EXISTS help_offers (
  offer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  topic_id INTEGER NOT NULL REFERENCES topics(topic_id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, topic_id)
);
CREATE TABLE IF NOT EXISTS availability (
  availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS help_requests (
  request_id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(user_id),
  helper_id INTEGER REFERENCES users(user_id),      -- assigned when a helper accepts
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  topic_id INTEGER NOT NULL REFERENCES topics(topic_id),
  description TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  study_format TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ratings (                
  rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES help_requests(request_id),
  reviewer_id INTEGER NOT NULL REFERENCES users(user_id),
  reviewed_user_id INTEGER NOT NULL REFERENCES users(user_id),
  rating INTEGER NOT NULL,
  feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS request_dismissals (
  request_id INTEGER NOT NULL REFERENCES help_requests(request_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  PRIMARY KEY(request_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rating_per_request ON ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_request_status ON help_requests(status, helper_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_offers_topic ON help_offers(topic_id, user_id);
`);

// ---- Seed data (only the first time) ----
const seed = {
  'Computer Science': {
    'Algorithms': ['Recursion', 'Sorting', 'Graphs', 'Dynamic Programming'],
    'Programming': ['Variables and Loops', 'Functions', 'Object-Oriented Programming'],
    'Database': ['SQL Basics', 'JOIN', 'Normalization'],
    'Web Development': ['HTML and CSS', 'JavaScript', 'REST APIs']
  },
  'Medicine': {
    'Anatomy': ['Skeletal System', 'Muscular System', 'Nervous System'],
    'Biochemistry': ['Enzymes', 'Metabolism']
  },
  'Law': {
    'Constitutional Law': ['Separation of Powers', 'Fundamental Rights'],
    'Civil Law': ['Contracts', 'Property Law']
  },
  'Architecture': {
    'Architectural History': ['Renaissance', 'Modernism'],
    'Structures': ['Loads', 'Beams and Columns']
  },
  'Economics': {
    'Microeconomics': ['Supply and Demand', 'Market Structures'],
    'Statistics': ['Probability', 'Hypothesis Testing']
  }
};

if (db.prepare('SELECT COUNT(*) AS n FROM specializations').get().n === 0) {
  const insSpec = db.prepare('INSERT INTO specializations(name) VALUES (?)');
  const insCourse = db.prepare('INSERT INTO courses(name, specialization_id) VALUES (?, ?)');
  const insTopic = db.prepare('INSERT INTO topics(name, course_id) VALUES (?, ?)');
  db.transaction(() => {
    for (const [spec, courses] of Object.entries(seed)) {
      const sid = insSpec.run(spec).lastInsertRowid;
      for (const [course, topics] of Object.entries(courses)) {
        const cid = insCourse.run(course, sid).lastInsertRowid;
        topics.forEach(t => insTopic.run(t, cid));
      }
    }
  })();
  console.log('Database seeded with specializations, courses and topics.');
}

module.exports = db;
