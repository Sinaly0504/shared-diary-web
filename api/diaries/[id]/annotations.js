// /api/diaries/[id]/annotations.js (V2.0 - 使用坐标)

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
    const { id: diaryId } = req.query;

    // 【修改】SQL 查询语句，获取坐标而不是段落ID
    const query = `
      SELECT
        a.id,
        a.content,
        a.position_x,
        a.position_y,
        a.created_at,
        u.username
      FROM annotations a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.diary_id = $1
      ORDER BY a.created_at ASC;
    `;
    
    const { rows } = await pool.query(query, [diaryId]);
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取批注列表时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}