// /api/diaries/list.js (V2.0 - 带隐私筛选)

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 【关键修改】在 SQL 查询中增加了 WHERE 条件
    const query = `
      SELECT
        diaries.id,
        diaries.title,
        diaries.content,
        diaries.created_at,
        users.username
      FROM diaries
      INNER JOIN users ON diaries.author_id = users.id
      WHERE diaries.privacy_level = 'public'  -- 只选择公开的日记
      ORDER BY diaries.created_at DESC;
    `;

    const { rows } = await pool.query(query);

    res.status(200).json(rows);

  } catch (error) {
    console.error('获取日记列表时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}