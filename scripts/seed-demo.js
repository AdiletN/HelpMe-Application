/** OPTIONAL local demo data — never run against a real user database. */
const bcrypt = require('bcryptjs');
const db = require('../db');
const password = bcrypt.hashSync('Demo1234!', 10);
const future = new Date(); future.setDate(future.getDate() + 4);
const date = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][future.getDay()];
const getSpec = name => db.prepare('SELECT specialization_id FROM specializations WHERE name = ?').get(name).specialization_id;
const getTopic = (spec, course, topic) => db.prepare(`SELECT c.course_id, t.topic_id FROM topics t
 JOIN courses c ON t.course_id = c.course_id JOIN specializations s ON c.specialization_id = s.specialization_id
 WHERE s.name = ? AND c.name = ? AND t.name = ?`).get(spec, course, topic);
const alice = ['Adilet Student','adilet@demo.edu','SDU','Computer Science',4];
const arman = ['Arman Helper','arman@demo.edu','SDU','Computer Science',3];
const aigerim = ['Aigerim Helper','aigerim@demo.edu','SDU','Computer Science',4];
const dina = ['Dina Student','dina@demo.edu','SDU','Medicine',2];
const idFor = row => {
 const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(row[1]);
 if (existing) return existing.user_id;
 return db.prepare('INSERT INTO users(full_name,email,password,university,specialization_id,year) VALUES (?,?,?,?,?,?)')
   .run(row[0],row[1],password,row[2],getSpec(row[3]),row[4]).lastInsertRowid;
};
const upsertOffer = (userId, topic, timeDay=day) => {
 db.prepare('INSERT OR IGNORE INTO help_offers(user_id,course_id,topic_id) VALUES (?,?,?)')
   .run(userId,topic.course_id,topic.topic_id);
 if (!db.prepare('SELECT 1 FROM availability WHERE user_id = ? AND day = ? AND start_time = ?').get(userId,timeDay,'15:00'))
   db.prepare('INSERT INTO availability(user_id,day,start_time,end_time) VALUES (?,?,?,?)').run(userId,timeDay,'15:00','19:00');
};
const createRequest = (requester, topic, text, status='pending', helper=null) => {
 const found = db.prepare('SELECT request_id FROM help_requests WHERE requester_id = ? AND description = ?').get(requester,text);
 if (found) return found.request_id;
 return db.prepare(`INSERT INTO help_requests(requester_id,helper_id,course_id,topic_id,description,preferred_date,preferred_time,study_format,status)
 VALUES (?,?,?,?,?,?,?,?,?)`).run(requester,helper,topic.course_id,topic.topic_id,text,date,'16:00','Online',status).lastInsertRowid;
};
db.transaction(() => {
 const a=idFor(alice), b=idFor(arman), c=idFor(aigerim), d=idFor(dina);
 const recursion=getTopic('Computer Science','Algorithms','Recursion');
 const sql=getTopic('Computer Science','Database','JOIN');
 const sorting=getTopic('Computer Science','Algorithms','Sorting');
 const anatomy=getTopic('Medicine','Anatomy','Skeletal System');
 upsertOffer(b,recursion);upsertOffer(b,sql);upsertOffer(c,sorting);upsertOffer(d,anatomy);
 createRequest(a,recursion,'I understand recursion but need help writing the base case in Python.');
 createRequest(a,sorting,'Could someone explain merge sort using a simple example?');
 createRequest(a,sql,'I need to understand INNER JOIN and LEFT JOIN.', 'accepted', b);
 const completed=createRequest(a,sorting,'I learned binary sorting basics and want to review the solution.','completed',c);
 db.prepare('INSERT OR IGNORE INTO ratings(request_id,reviewer_id,reviewed_user_id,rating,feedback) VALUES (?,?,?,?,?)')
  .run(completed,a,c,5,'Clear explanation with a helpful example.');
})();
console.log('HelpMe demo users ready. Password for each: Demo1234!');
console.log('Logins: adilet@demo.edu / arman@demo.edu / aigerim@demo.edu / dina@demo.edu');
console.log(`Requests use ${date} (${day}) at 16:00.`);
