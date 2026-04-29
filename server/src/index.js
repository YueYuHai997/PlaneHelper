require('dotenv').config();

const { createApp } = require('./app');

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, () => {
  // 只输出必要启动信息，便于本地确认端口。
  console.log(`PlaneHelper server listening on http://localhost:${port}`);
});
