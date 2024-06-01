require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: "default",
  host: "ep-green-frog-a43mj1ha-pooler.us-east-1.aws.neon.tech",
  database: "verceldb",
  password: "1HChEVbp3UvR",
  port: 5432,
  ssl: true
});

module.exports = pool;
