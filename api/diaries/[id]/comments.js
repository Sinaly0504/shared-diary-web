// /api/diaries/[id]/comments.js

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

  if (req.method === 'GET') {
    // --- 处理“获取评论列表”的请求 ---
    try {
      const query = `
        SELECT
          c.id,
          c.content,
          c.created_at,
          u.username
        FROM comments c
        INNER JOIN users u ON c.user_id = u.id
        WHERE c.diary_id = $1
        ORDER BY c.created_at ASC; -- 按时间正序排列，像对话一样
      `;
      const { rows } = await pool.query(query, [diaryId]);
      res.status(200).json(rows);
    } catch (error) {
      console.error('获取评论列表时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else if (req.method === 'POST') {
    // --- 处理“发布新评论”的请求 ---
    try {
      // 1. 验证用户身份
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '请先登录再评论' });
      }
      const token = authHeader.split(' ')[1];
      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ message: '无效的 token' });
      }
      const userId = decodedToken.userId;

      // 2. 从请求体中获取评论内容
      const { content } = req.body;
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: '评论内容不能为空' });
      }

      // 3. 将新评论插入数据库
      const query = `
        INSERT INTO comments (content, user_id, diary_id)
        VALUES ($1, $2, $3)
        RETURNING id, content, created_at; -- 返回新评论的部分信息
      `;
      const { rows } = await pool.query(query, [content, userId, diaryId]);
      
      // 为了返回的数据包含用户名，我们可以用解码出的token里的信息
      const newComment = {
        ...rows[0],
        username: decodedToken.username
      };

      res.status(201).json({ message: '评论发布成功', comment: newComment });

    } catch (error)
    {
      console.error('发布评论时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}