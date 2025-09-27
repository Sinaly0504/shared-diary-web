// 引入我们需要的工具包
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// 创建一个数据库连接池
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// 这是 Vercel 云函数的入口
export default async function handler(request, response) {
    // 我们只接受 POST 方法的请求
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, password } = request.body;

    // 1. 简单验证输入
    if (!email || !password || password.length < 6) {
        return response.status(400).json({ message: '邮箱和密码无效 (密码至少6位)' });
    }

    try {
        // 2. 加密密码
        const password_hash = bcrypt.hashSync(password, 10); // 10 是加密强度

        // 3. 将新用户存入数据库
        const result = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, password_hash]
        );

        const newUser = result.rows[0];

        // 4. 返回成功响应
        return response.status(201).json({ user: newUser });

    } catch (error) {
        console.error(error);
        // 5. 处理错误（比如邮箱已存在）
        if (error.code === '23505') { // '23505' 是 PostgreSQL 中唯一性冲突的错误码
            return response.status(409).json({ message: '该邮箱地址已被注册' });
        }
        return response.status(500).json({ message: '服务器内部错误' });
    }
}