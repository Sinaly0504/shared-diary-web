// /api/diaries/list.js (V4.0 - 支持排序)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

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
    const { sortBy } = req.query;
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        console.log("Invalid token, proceeding as guest.");
      }
    }

    let orderByClause = 'ORDER BY d.created_at DESC';
    if (sortBy === 'likes') {
      orderByClause = 'ORDER BY like_count DESC';
    }

    const query = `
      SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        u.username,
        COUNT(l.id)::int AS like_count,
        CASE WHEN $1::UUID IS NOT NULL AND EXISTS (
          SELECT 1 FROM likes WHERE diary_id = d.id AND user_id = $1
        ) THEN TRUE ELSE FALSE END AS user_has_liked
      FROM diaries d
      INNER JOIN users u ON d.author_id = u.id
      LEFT JOIN likes l ON d.id = l.diary_id
      WHERE d.privacy_level = 'public'
      GROUP BY d.id, u.username
      ${orderByClause};
    `;

    const { rows } = await pool.query(query, [userId]);
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取日记列表时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}