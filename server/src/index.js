require('dotenv').config();

const { createApp } = require('./app');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, host, () => {
  console.log(`PlaneHelper server listening on http://${host}:${port}`);
});
