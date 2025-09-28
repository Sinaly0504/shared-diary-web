// /api/diaries/[id].js (V2.0 - 附带点赞信息)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  const { id: diaryId } = req.query;

  if (req.method === 'GET') {
    try {
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

      const query = `
        SELECT
          d.id, d.title, d.content, d.created_at, u.username,
          (SELECT COUNT(*)::int FROM likes WHERE diary_id = d.id) AS like_count,
          CASE WHEN $2::UUID IS NOT NULL AND EXISTS (
            SELECT 1 FROM likes WHERE diary_id = d.id AND user_id = $2
          ) THEN TRUE ELSE FALSE END AS user_has_liked
        FROM diaries d
        INNER JOIN users u ON d.author_id = u.id
        WHERE d.id = $1;
      `;
      
      const { rows } = await pool.query(query, [diaryId, userId]);

      if (rows.length > 0) {
        res.status(200).json(rows[0]);
      } else {
        res.status(404).json({ message: 'Diary not found' });
      }
    } catch (error) {
      console.error('获取单篇日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  } 
  else if (req.method === 'DELETE') {
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
      const { rows } = await pool.query(query, [diaryId, currentUserId]);
      if (rows.length > 0) {
        res.status(200).json({ message: '日记删除成功' });
      } else {
        res.status(403).json({ message: '无权删除或日记不存在' });
      }
    } catch (error) {
      console.error('删除日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }
  else if (req.method === 'PUT') {
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
      const { title, content, privacy_level } = req.body;
      if (!title || !content || !privacy_level) {
        return res.status(400).json({ message: '标题、内容和隐私等级不能为空' });
      }
      const query = `
        UPDATE diaries
        SET title = $1, content = $2, privacy_level = $3
        WHERE id = $4 AND author_id = $5
        RETURNING *;
      `;
      const values = [title, content, privacy_level, diaryId, currentUserId];
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
  }
  else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}