// /api/diaries/[id]/like.js

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  const { id: diaryId } = req.query; // 从 URL 中获取日记的 ID

  // --- 验证用户身份 ---
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

  // --- 根据请求方法执行不同操作 ---

  if (req.method === 'POST') {
    // --- 处理“点赞”操作 ---
    try {
      const query = `
        INSERT INTO likes (user_id, diary_id)
        VALUES ($1, $2)
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [userId, diaryId]);
      res.status(201).json({ message: '点赞成功', like: rows[0] });
    } catch (error) {
      if (error.code === '23505') { // 错误码 '23505' 代表违反了 unique 约束
        return res.status(409).json({ message: '你已经点过赞了' });
      }
      console.error('点赞时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else if (req.method === 'DELETE') {
    // --- 处理“取消点赞”操作 ---
    try {
      const query = `
        DELETE FROM likes
        WHERE user_id = $1 AND diary_id = $2
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [userId, diaryId]);
      
      if (rows.length > 0) {
        res.status(200).json({ message: '取消点赞成功' });
      } else {
        res.status(404).json({ message: '你尚未点赞，无法取消' });
      }
    } catch (error) {
      console.error('取消点赞时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}