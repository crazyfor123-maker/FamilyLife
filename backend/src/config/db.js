// ===== 数据库配置 (MySQL) =====
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'family_life_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+08:00',
});

// 健康检查
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL 数据库已连接:', conn.config.database || 'family_life_db');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL 数据库连接失败:', err.message);
  });

// 封装 promise 化的查询方法
async function run(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(sql, params);
    return { id: result.insertId, changes: result.affectedRows };
  } finally {
    conn.release();
  }
}

async function get(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

async function all(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

async function exec(sql) {
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

module.exports = { pool, run, get, all, exec };
