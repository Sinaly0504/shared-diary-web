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
      // 1. 同样，先验证用户身份
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

      // 2. 从请求体中获取新的标题和内容
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: '标题和内容不能为空' });
      }

      // 3. 执行更新操作 (同样有严格的权限校验)
      const query = `
        UPDATE diaries
        SET title = $1, content = $2
        WHERE id = $3 AND author_id = $4
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [title, content, id, currentUserId]);

      // 4. 检查更新是否成功
      if (rows.length > 0) {
        res.status(200).json({ message: '日记更新成功', diary: rows[0] });
      } else {
        res.status(403).json({ message: '无权修改或日记不存在' });
      }
    } catch (error) {
      console.error('更新日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}