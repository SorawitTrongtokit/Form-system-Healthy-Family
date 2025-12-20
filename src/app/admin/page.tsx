'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Hardcoded admin credentials for demo
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Check credentials
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // Save admin session
            if (typeof window !== 'undefined') {
                localStorage.setItem('adminLoggedIn', 'true');
            }
            router.push('/admin/dashboard');
        } else {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <div className="w-full max-w-md">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
                >
                    ← กลับหน้าหลัก
                </Link>

                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-5xl">⚙️</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        ระบบ Admin
                    </h1>
                    <p className="text-white/80">
                        จัดการข้อมูลระบบ
                    </p>
                </div>

                {/* Login Card */}
                <div className="card p-8">
                    <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
                        🔐 เข้าสู่ระบบ Admin
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">ชื่อผู้ใช้</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">รหัสผ่าน</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="btn btn-primary w-full"
                        >
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </button>
                    </form>

                    {/* Demo credentials */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 text-center mb-2">
                            <strong>สำหรับทดสอบ:</strong>
                        </p>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                            <p className="text-sm text-gray-600">
                                Username: <code className="bg-gray-200 px-1 rounded">admin</code>
                            </p>
                            <p className="text-sm text-gray-600">
                                Password: <code className="bg-gray-200 px-1 rounded">admin123</code>
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-white/60 text-sm mt-6">
                    © 2024 รพ.สต.มะตูม | ระบบจัดการข้อมูล
                </p>
            </div>
        </main>
    );
}
