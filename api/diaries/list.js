// /api/diaries/list.js

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  // 我们只接受 GET 请求来获取列表
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 这是一条带有 JOIN 的 SQL 查询语句
    const query = `
      SELECT
        diaries.id,
        diaries.title,
        diaries.content,
        diaries.created_at,
        users.username
      FROM diaries
      INNER JOIN users ON diaries.author_id = users.id
      ORDER BY diaries.created_at DESC;
    `;

    const { rows } = await pool.query(query);

    // 返回查询到的日记列表
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取日记列表时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}