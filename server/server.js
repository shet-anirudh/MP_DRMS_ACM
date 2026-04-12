const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { router: syncRoute } = require('./routes/sync');
const p2pRoute = require('./routes/p2p');

const app = express();

// Use cors to allow all origins
app.use(cors());

// Use body-parser for JSON with a 10mb limit
app.use(bodyParser.json({ limit: '10mb' }));

// Mount routes
app.use('/sync', syncRoute);
app.use('/p2p-sync', p2pRoute);

// Add health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
