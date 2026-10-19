const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

// npm test: launch the actual Express/SQLite server with a disposable database.
test('complete peer-help flow, authorization, and atomic acceptance', { timeout: 25000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helpme-test-'));
  const dbPath = path.join(tmp, 'test.db');
  const port = 23000 + Math.floor(Math.random() * 10000);
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DB_PATH: dbPath, JWT_SECRET: 'integration-test-secret', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverErrors = '';
  server.stderr.on('data', chunk => serverErrors += chunk);
  const base = `http://127.0.0.1:${port}`;
  async function request(route, body, token, method) {
    const r = await fetch(base + '/api' + route, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw Error('Server failed: ' + serverErrors);
      try { const r = await request('/specializations'); if (r.status === 200) { ready = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    assert.ok(ready, 'Server should start: ' + serverErrors);
    const specs = (await request('/specializations')).data;
    const cs = specs.find(s => s.name === 'Computer Science').specialization_id;
    const medicine = specs.find(s => s.name === 'Medicine').specialization_id;
    async function register(name, major) {
      const result = await request('/auth/register', {
        full_name: name, email: `${name.toLowerCase().replace(/ /g, '')}@test.edu`, password: 'SecureDemo12',
        university: 'SDU', specialization_id: major, year: 3
      });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      return result.data;
    }
    const asker = await register('Asker Student', cs);
    const h1 = await register('Helper One', cs);
    const h2 = await register('Helper Two', cs);
    const med = await register('Medicine Student', medicine);
    const cat = (await request('/catalog', undefined, asker.token)).data;
    const alg = cat.courses.find(c => c.name === 'Algorithms');
    const topic = alg.topics.find(t => t.name === 'Recursion');
    const mcat = (await request('/catalog', undefined, med.token)).data;
    assert.ok(!mcat.courses.some(c => c.name === 'Algorithms'));
    const dayDate = new Date(); dayDate.setDate(dayDate.getDate() + 5);
    const preferred_date = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;
    const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayDate.getDay()];
    const offer = { topicIds: [topic.topic_id], availability: [{ day, start_time: '15:00', end_time: '19:00' }] };
    assert.equal((await request('/offers', offer, h1.token)).status, 200);
    assert.equal((await request('/offers', offer, h2.token)).status, 200);
    // The server, not the browser, enforces academic specialization restrictions.
    assert.equal((await request('/offers', offer, med.token)).status, 403);
    const create = await request('/requests', { course_id: alg.course_id, topic_id: topic.topic_id,
      description: 'Can someone explain recursion?', preferred_date, preferred_time: '16:00', study_format: 'Online' }, asker.token);
    assert.equal(create.status, 201);
    const rid = create.data.request_id;
    assert.equal((await request('/requests/feed', undefined, med.token)).data.length, 0);
    assert.equal((await request('/requests/feed', undefined, asker.token)).data.length, 0);
    const feed = (await request('/requests/feed', undefined, h1.token)).data;
    assert.equal(feed[0].request_id, rid);
    assert.equal(feed[0].can_accept, true);
    assert.equal((await request(`/requests/${rid}/accept`, {}, med.token)).status, 409);
    const races = await Promise.all([
      request(`/requests/${rid}/accept`, {}, h1.token),
      request(`/requests/${rid}/accept`, {}, h2.token)
    ]);
    assert.deepEqual(races.map(r => r.status).sort(), [200,409]);
    const winner = races[0].status === 200 ? h1 : h2;
    const loser = races[0].status === 200 ? h2 : h1;
    const accepted = (await request('/requests/mine', undefined, asker.token)).data[0];
    assert.equal(accepted.status, 'accepted');
    assert.equal((await request(`/requests/${rid}/complete`, {}, loser.token)).status, 409);
    assert.equal((await request(`/requests/${rid}/complete`, {}, asker.token)).status, 200);
    assert.equal((await request(`/requests/${rid}/rate`, { rating: 5, feedback: 'Great help!' }, asker.token)).status, 201);
    assert.equal((await request(`/requests/${rid}/rate`, { rating: 5 }, asker.token)).status, 409);
    assert.equal((await request(`/requests/${rid}/rate`, { rating: 5 }, med.token)).status, 403);
    const results = (await request('/helpers', undefined, asker.token)).data;
    assert.equal(results.find(h => h.user_id === winner.user.user_id).review_count, 1);
    // Personal invitation can only be declined by the invited helper.
    const targeted = await request('/requests', { course_id: alg.course_id, topic_id: topic.topic_id,
      description: 'Can you help me personally?', preferred_date, preferred_time: '16:00', helper_id: winner.user.user_id }, asker.token);
    assert.equal(targeted.status, 201);
    assert.equal((await request('/requests/feed', undefined, loser.token)).data.length, 0);
    assert.equal((await request(`/requests/${targeted.data.request_id}/reject`, {}, loser.token)).status, 409);
    assert.equal((await request(`/requests/${targeted.data.request_id}/reject`, {}, winner.token)).status, 200);
    assert.equal((await request(`/requests/${targeted.data.request_id}/accept`, {}, winner.token)).status, 409);
  } finally {
    server.kill('SIGTERM');
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
});
