// /api/annotations/[id].js (V1.0 - 更新批注位置)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  // 我们只处理 PUT 请求，这是一种常用于“更新”操作的请求方法
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. 从 URL 中获取批注的 ID
    const { id: annotationId } = req.query;

    // 2. 验证用户身份 (确保只有登录用户才能操作)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权的访问' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET); // 我们只验证 token 有效性即可

    // 3. 从请求体中获取新的坐标
    const { position_x, position_y } = req.body;
    if (position_x === undefined || position_y === undefined) {
      return res.status(400).json({ message: '新的坐标信息不完整' });
    }

    // 4. 更新数据库
    const query = `
      UPDATE annotations
      SET position_x = $1, position_y = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [position_x, position_y, annotationId];
    const { rows } = await pool.query(query, values);

    if (rows.length > 0) {
      res.status(200).json({ message: '批注位置更新成功', annotation: rows[0] });
    } else {
      res.status(404).json({ message: '未找到要更新的批注' });
    }

  } catch (error) {
    // 如果 token 无效或过期，jwt.verify 会抛出错误
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '无效或过期的 token' });
    }
    console.error('更新批注位置时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}