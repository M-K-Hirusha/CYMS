const app = require("./src/app");
const connectDB = require("./src/config/db");
const { PORT } = require("./src/config/env");

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start();
