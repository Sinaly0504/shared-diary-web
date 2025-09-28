// /api/diaries/mine.js

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
    // 1. 验证用户身份 (这是一个受保护的接口)
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

    // 2. 从 token 中获取当前登录用户的 ID
    const currentUserId = decodedToken.userId;

    // 3. 查询数据库，只获取属于该用户的日记
    const query = `
      SELECT
        diaries.id,
        diaries.title,
        diaries.content,
        diaries.created_at,
        users.username
      FROM diaries
      INNER JOIN users ON diaries.author_id = users.id
      WHERE diaries.author_id = $1   -- 【关键】只选择当前用户的日记
      ORDER BY diaries.created_at DESC;
    `;
    
    const { rows } = await pool.query(query, [currentUserId]);

    // 4. 返回查询到的日记列表
    res.status(200).json(rows);

  } catch (error) {
    console.error('获取“我的日记”时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}