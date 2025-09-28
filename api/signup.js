import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // 修改：从 request.body 中获取 username 而不是 email
    const { username, password } = request.body;

    // 修改：验证 username 和 password
    if (!username || !password || password.length < 6) {
        return response.status(400).json({ message: '用户名和密码无效 (密码至少6位)' });
    }

    try {
        const password_hash = bcrypt.hashSync(password, 10);

        // 修改：将 username 存入数据库
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
            [username, password_hash]
        );

        const newUser = result.rows[0];
        return response.status(201).json({ user: newUser });

    } catch (error) {
        console.error(error);
        if (error.code === '23505') { 
            // 修改：错误提示变更为用户名已存在
            return response.status(409).json({ message: '该用户名已被注册' });
        }
        return response.status(500).json({ message: '服务器内部错误' });
    }
}