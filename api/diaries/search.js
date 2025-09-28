// /api/diaries/search.js (V2.0 - 支持范围搜索)

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
    const { q, scope } = req.query; // 新增获取 scope 参数

    if (!q) {
      return res.status(400).json({ message: '搜索关键词不能为空' });
    }

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

    let queryText = `
      SELECT
        d.id, d.title, d.content, d.created_at, u.username,
        COUNT(l.id)::int AS like_count,
        CASE WHEN $2::UUID IS NOT NULL AND EXISTS (
          SELECT 1 FROM likes WHERE diary_id = d.id AND user_id = $2
        ) THEN TRUE ELSE FALSE END AS user_has_liked
      FROM diaries d
      INNER JOIN users u ON d.author_id = u.id
      LEFT JOIN likes l ON d.id = l.diary_id
      WHERE (d.title ILIKE $1 OR d.content ILIKE $1)
    `;

    const searchTerm = `%${q}%`;
    let queryParams = [searchTerm, userId];

    // 根据 scope 参数动态添加查询条件
    if (scope === 'mine' && userId) {
      queryText += ` AND d.author_id = $3`;
      queryParams.push(userId);
    } else {
      queryText += ` AND d.privacy_level = 'public'`;
    }

    queryText += `
      GROUP BY d.id, u.username
      ORDER BY d.created_at DESC;
    `;

    const { rows } = await pool.query(queryText, queryParams);
    res.status(200).json(rows);

  } catch (error) {
    console.error('搜索日记时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}