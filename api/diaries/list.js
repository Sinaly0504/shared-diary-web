// /api/diaries/list.js (V3.0 - 附带点赞信息)

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
    // 1. 尝试获取并解码 token，以确定当前用户ID。如果未登录，则 userId 为 null。
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        // Token 无效或过期，我们将其视为未登录
        console.log("Invalid token, proceeding as guest.");
      }
    }

    // 2. 编写更复杂的 SQL 查询
    const query = `
      SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        u.username,
        COUNT(l.id)::int AS like_count, -- 计算点赞总数
        -- 判断当前用户是否点赞
        CASE WHEN $1::UUID IS NOT NULL AND EXISTS (
          SELECT 1 FROM likes WHERE diary_id = d.id AND user_id = $1
        ) THEN TRUE ELSE FALSE END AS user_has_liked
      FROM diaries d
      INNER JOIN users u ON d.author_id = u.id
      LEFT JOIN likes l ON d.id = l.diary_id -- 使用 LEFT JOIN 连接 likes 表
      WHERE d.privacy_level = 'public'
      GROUP BY d.id, u.username -- 按日记进行分组
      ORDER BY d.created_at DESC;
    `;

    const { rows } = await pool.query(query, [userId]);
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取日记列表时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}