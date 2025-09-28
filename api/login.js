// /api/login.js

// 引入我们需要的库
const { Pool } = require('pg');        // 用于连接 PostgreSQL 数据库
const bcrypt = require('bcryptjs');    // 用于比较哈希密码
const jwt = require('jsonwebtoken');   // 用于生成 JWT

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 这是 Vercel Serverless Function 的主处理函数
export default async function handler(req, res) {
  // 我们只处理 POST 请求，因为登录是通过表单提交的
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 从请求体中获取用户名和密码
    const { username, password } = req.body;

    // 检查用户名和密码是否都已提供
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 在数据库中查找用户
    // 使用参数化查询 ($1) 来防止 SQL 注入攻击，这是一种安全最佳实践
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    // 如果查询结果为空（rows.length === 0），说明用户不存在
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 如果找到了用户，rows[0] 就是这个用户对象
    const user = rows[0];

    // 使用 bcrypt.compare 验证密码
    // 它会安全地比较用户提交的明文密码和数据库中存储的哈希密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    // 如果密码无效
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 密码验证成功！现在我们为用户生成一个 JWT
    // process.env.JWT_SECRET 是一个我们稍后需要设置的、用于签名的“秘钥”
    // 这确保了我们的 JWT 是独一无二且无法被伪造的
    const token = jwt.sign(
      { userId: user.id, username: user.username }, // 我们希望在 token 中包含的信息
      process.env.JWT_SECRET,                        // 用于签名的秘钥
      { expiresIn: '1d' }                           // Token 的有效期，这里设置为 1 天
    );

    // 登录成功！将生成的 token 发送回前端
    res.status(200).json({ message: '登录成功', token: token });

  } catch (error) {
    // 如果发生任何服务器端错误，记录错误并返回通用错误信息
    console.error('Login error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}