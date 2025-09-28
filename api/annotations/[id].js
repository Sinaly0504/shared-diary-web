// /api/annotations/[id].js (V1.1 - 更新位置和字号，完整版)

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
    if (!authHeader || !auth-header.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权的访问' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET); // 我们只验证 token 有效性即可

    // 3. 从请求体中获取可能存在的更新字段
    const { position_x, position_y, font_size } = req.body;

    // 4. --- 动态构建 SQL 查询 ---
    // 这是本文件的核心，让接口变得非常灵活
    const fieldsToUpdate = [];
    const values = [];
    let queryCounter = 1;

    // 检查是否有坐标信息需要更新
    if (position_x !== undefined && position_y !== undefined) {
      fieldsToUpdate.push(`position_x = $${queryCounter++}`, `position_y = $${queryCounter++}`);
      values.push(position_x, position_y);
    }
    
    // 检查是否有字体大小信息需要更新
    if (font_size !== undefined) {
      fieldsToUpdate.push(`font_size = $${queryCounter++}`);
      values.push(font_size);
    }

    // 如果没有任何需要更新的字段，则返回错误
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: '没有任何需要更新的字段' });
    }
    
    // 将批注的 ID 作为最后一个参数添加到 values 数组中
    values.push(annotationId);

    // 5. 构建最终的 SQL 更新语句
    const query = `
      UPDATE annotations
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${queryCounter}
      RETURNING *;
    `;
    
    // 6. 执行查询
    const { rows } = await pool.query(query, values);

    // 7. 根据查询结果返回响应
    if (rows.length > 0) {
      res.status(200).json({ message: '批注更新成功', annotation: rows[0] });
    } else {
      res.status(404).json({ message: '未找到要更新的批注' });
    }

  } catch (error) {
    // 如果 token 无效或过期，jwt.verify 会抛出错误
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '无效或过期的 token' });
    }
    console.error('更新批注时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}