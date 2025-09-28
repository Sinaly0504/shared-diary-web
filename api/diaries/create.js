// /api/diaries/create.js

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
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

    const userId = decodedToken.userId;

    // 【修改】从请求体中同时获取 title, content 和 privacy_level
    const { title, content, privacy_level } = req.body;
    if (!title || !content || !privacy_level) {
      return res.status(400).json({ message: '标题、内容和隐私等级不能为空' });
    }

    // 【修改】将 privacy_level 也插入数据库
    const query = `
      INSERT INTO diaries (author_id, title, content, privacy_level)
      VALUES ($1, $2, $3, $4)
      RETURNING *; 
    `;
    const values = [userId, title, content, privacy_level];
    const { rows } = await pool.query(query, values);

    res.status(201).json({ message: '日记发布成功', diary: rows[0] });

  } catch (error) {
    console.error('发布日记时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}