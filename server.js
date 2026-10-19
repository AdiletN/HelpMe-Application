const express = require('express');
const path = require('path');
require('./db');                       // creates tables + seed data

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/helpers', require('./routes/helpers'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HelpMe running at http://localhost:${PORT}`));
