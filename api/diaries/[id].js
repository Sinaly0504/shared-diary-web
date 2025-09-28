// /api/diaries/[id].js

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
    // 1. 从请求的 URL 中获取动态的 id
    const { id } = req.query;

    // 2. 编写带有 JOIN 和 WHERE 的 SQL 查询
    const query = `
      SELECT
        diaries.id,
        diaries.title,
        diaries.content,
        diaries.created_at,
        users.username
      FROM diaries
      INNER JOIN users ON diaries.author_id = users.id
      WHERE diaries.id = $1;
    `;

    // 3. 执行查询，并将 id 作为参数传入以防 SQL 注入
    const { rows } = await pool.query(query, [id]);

    // 4. 判断是否找到了日记
    if (rows.length > 0) {
      // 找到了，返回第一条（也是唯一一条）记录
      res.status(200).json(rows[0]);
    } else {
      // 没找到，返回 404 Not Found 错误
      res.status(404).json({ message: 'Diary not found' });
    }

  } catch (error) {
    console.error('获取单篇日记时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}