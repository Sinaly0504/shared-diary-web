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
  // 1. 我们只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. 从请求头中获取授权信息 (token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权的访问' });
    }
    const token = authHeader.split(' ')[1];

    // 3. 验证 token 是否有效
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: '无效的 token' });
    }

    // 4. 从 token 中获取用户 ID
    const userId = decodedToken.userId;

    // 5. 从请求体中获取日记的标题和内容
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    // 6. 将新日记插入数据库
    const query = `
      INSERT INTO diaries (user_id, title, content)
      VALUES ($1, $2, $3)
      RETURNING *; 
    `;
    const values = [userId, title, content];
    const { rows } = await pool.query(query, values);

    // 7. 返回成功响应
    res.status(201).json({ message: '日记发布成功', diary: rows[0] });

  } catch (error) {
    console.error('发布日记时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}