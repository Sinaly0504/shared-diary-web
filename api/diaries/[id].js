// /api/diaries/[id].js

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  // 从请求的 URL 中获取动态的 id
  const { id } = req.query;

  // --- 根据请求方法 (GET / DELETE) 执行不同操作 ---

  if (req.method === 'GET') {
    // --- 处理获取单篇日记的逻辑 (保持不变) ---
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

  } else if (req.method === 'DELETE') {
    // --- 【新增】处理删除日记的逻辑 ---
    try {
      // 1. 验证用户身份 (和发布日记时一样)
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

      // 3. 执行删除操作 (最关键的安全步骤)
      const query = `
        DELETE FROM diaries
        WHERE id = $1 AND author_id = $2
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [id, currentUserId]);

      // 4. 检查删除是否成功
      if (rows.length > 0) {
        // 如果 rows.length > 0，说明成功删除了匹配的记录
        res.status(200).json({ message: '日记删除成功' });
      } else {
        // 如果 rows.length === 0，有两种可能：
        // 1. 日记ID不存在。
        // 2. 日记存在，但 author_id 不匹配 (说明用户在尝试删除别人的日记)
        // 出于安全，我们统一返回“未授权”或“未找到”
        res.status(403).json({ message: '无权删除或日记不存在' });
      }
    } catch (error) {
      console.error('删除日记时出错:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }

  } else {
    // 如果是其他方法 (如 POST, PUT)，则不允许
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}