// /api/annotations/create.js (V3.1 - 更健壮的容错版本)

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. 验证用户身份 (不变)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '请先登录再发表批注' });
    }
    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: '无效的 token' });
    }
    const userId = decodedToken.userId;

    // 2. 从请求体中获取所有数据
    const { content, diaryId, position_x, position_y, font_family, color } = req.body;
    if (content === undefined || diaryId === undefined || position_x === undefined || position_y === undefined) {
      return res.status(400).json({ message: '批注信息不完整' });
    }
    
    // --- 【关键修正】在这里提供默认值 ---
    // 如果前端传来的 font_family 是空的 (undefined, null, ''), 我们就使用数据库的默认字体
    const final_font = font_family || 'Zhi Mang Xing'; 
    // 如果前端传来的 color 是空的，我们就使用数据库的默认颜色
    const final_color = color || '#594524';

    // 3. 将新批注插入数据库
    const query = `
      INSERT INTO annotations (content, user_id, diary_id, position_x, position_y, font_family, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    // 使用我们处理过的、保证有值的 final_font 和 final_color
    const values = [
        content, 
        userId, 
        diaryId, 
        position_x, 
        position_y, 
        final_font,  // 使用修正后的变量
        final_color  // 使用修正后的变量
    ];
    const { rows } = await pool.query(query, values);

    res.status(201).json({ message: '批注成功', annotation: rows[0] });

  } catch (error) {
    console.error('创建批注时出错:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}