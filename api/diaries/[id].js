// /api/diaries/[id].js (最终版 - 支持 GET, DELETE, PUT)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  const { id } = req.query;

  // --- 处理 GET 请求 (保持不变) ---
  if (req.method === 'GET') {
    try {
      const query = `
        SELECT diaries.id, diaries.title, diaries.content, diaries.created_at, users.username
        FROM diaries
        INNER JOIN users ON diaries.author_id = users.id
        WHERE diaries.id = $1;
      `;
      const { rows } = await pool.query(query, [id]);
      if (rows.length > 0) {
        res.status(200).json(rows[0]);
      } else {
        res.status(404).json({ message: 'Diary not found' });
      }
    } catch (error) {
      console.error('获取单篇日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  // --- 处理 DELETE 请求 (保持不变) ---
  } else if (req.method === 'DELETE') {
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
      const currentUserId = decodedToken.userId;
      const query = `
        DELETE FROM diaries
        WHERE id = $1 AND author_id = $2
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [id, currentUserId]);
      if (rows.length > 0) {
        res.status(200).json({ message: '日记删除成功' });
      } else {
        res.status(403).json({ message: '无权删除或日记不存在' });
      }
    } catch (error) {
      console.error('删除日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  // --- 【新增】处理 PUT (更新) 请求 ---
  } else if (req.method === 'PUT') {
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
      const currentUserId = decodedToken.userId;

      // 【修改】从请求体中同时获取 title, content 和 privacy_level
      const { title, content, privacy_level } = req.body;
      if (!title || !content || !privacy_level) {
        return res.status(400).json({ message: '标题、内容和隐私等级不能为空' });
      }

      // 【修改】更新时同时更新 privacy_level
      const query = `
        UPDATE diaries
        SET title = $1, content = $2, privacy_level = $3
        WHERE id = $4 AND author_id = $5
        RETURNING *;
      `;
      const values = [title, content, privacy_level, id, currentUserId];
      const { rows } = await pool.query(query, values);

      if (rows.length > 0) {
        res.status(200).json({ message: '日记更新成功', diary: rows[0] });
      } else {
        res.status(403).json({ message: '无权修改或日记不存在' });
      }
    } catch (error) {
      console.error('更新日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }  else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}