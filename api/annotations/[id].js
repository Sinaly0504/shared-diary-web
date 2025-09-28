// /api/annotations/[id].js (V1.2 - 修正拼写错误，最终版)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { id: annotationId } = req.query;

    const authHeader = req.headers.authorization;
    // 【关键修正】将 auth-header 修改为 authHeader
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权的访问' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);

    const { position_x, position_y, font_size } = req.body;

    const fieldsToUpdate = [];
    const values = [];
    let queryCounter = 1;

    if (position_x !== undefined && position_y !== undefined) {
      fieldsToUpdate.push(`position_x = $${queryCounter++}`, `position_y = $${queryCounter++}`);
      values.push(position_x, position_y);
    }
    
    if (font_size !== undefined) {
      fieldsToUpdate.push(`font_size = $${queryCounter++}`);
      values.push(font_size);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: '没有任何需要更新的字段' });
    }
    
    values.push(annotationId);

    const query = `
      UPDATE annotations
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${queryCounter}
      RETURNING *;
    `;
    
    const { rows } = await pool.query(query, values);

    if (rows.length > 0) {
      res.status(200).json({ message: '批注更新成功', annotation: rows[0] });
    } else {
      res.status(404).json({ message: '未找到要更新的批注' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '无效或过期的 token' });
    }
    // 当我们修复了拼写错误后，这个 ReferenceError 就不会再出现了
    console.error('更新批注时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}