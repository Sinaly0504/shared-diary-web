// /api/diaries/mine.js (V3.0 - 支持排序)

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权的访问' });
    }
    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: '无效的 token' });
    }
    const currentUserId = decodedToken.userId;

    let orderByClause = 'ORDER BY d.created_at DESC';
    if (sortBy === 'likes') {
      orderByClause = 'ORDER BY like_count DESC';
    }

    const query = `
      SELECT
        d.id, d.title, d.content, d.created_at, u.username,
        COUNT(l.id)::int AS like_count,
        CASE WHEN $1::UUID IS NOT NULL AND EXISTS (
          SELECT 1 FROM likes WHERE diary_id = d.id AND user_id = $1
        ) THEN TRUE ELSE FALSE END AS user_has_liked
      FROM diaries d
      INNER JOIN users u ON d.author_id = u.id
      LEFT JOIN likes l ON d.id = l.diary_id
      WHERE d.author_id = $1
      GROUP BY d.id, u.username
      ${orderByClause};
    `;
    
    const { rows } = await pool.query(query, [currentUserId]);
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取“我的日记”时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}