// ===== 数据库初始化（MySQL 建表） =====
const { exec, run } = require('../config/db');
const fs = require('fs');
const path = require('path');

// 读取建表 SQL 文件
const sqlFile = path.join(__dirname, 'init_tables.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// 分割成单条 SQL 语句
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

let completed = 0;

async function init() {
  for (const stmt of statements) {
    try {
      await run(stmt);
      completed++;
    } catch (err) {
      // CREATE TABLE IF NOT EXISTS 在表存在时会报错，忽略
      const ignored = ['already exists', 'Duplicate key name', 'Duplicate column name', "Unknown column", 'Duplicate entry', "Duplicate index", 'already in use'];
      if (!ignored.some(k => err.message.includes(k))) {
        console.error(`❌ 建表失败: ${err.message}`);
        console.error(`SQL: ${stmt.substring(0, 100)}...`);
        process.exit(1);
      }
    }
  }
  console.log(`✅ 所有数据表初始化完成 (${completed} 条语句执行成功, MySQL)`);
}

init();
