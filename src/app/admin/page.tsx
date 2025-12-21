'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Check if session is valid
function isSessionValid(): boolean {
    if (typeof window === 'undefined') return false;

    const sessionStr = localStorage.getItem('adminSession');
    if (!sessionStr) return false;

    try {
        const session = JSON.parse(sessionStr);
        return session.loggedIn && session.expiresAt > Date.now();
    } catch {
        return false;
    }
}

export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const router = useRouter();

    // Check if already logged in
    useEffect(() => {
        if (isSessionValid()) {
            router.push('/admin/dashboard');
        } else {
            // Clear invalid session
            localStorage.removeItem('adminSession');
            localStorage.removeItem('adminLoggedIn');
            setCheckingSession(false);
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save session
                localStorage.setItem('adminSession', JSON.stringify(data.session));
                localStorage.setItem('adminLoggedIn', 'true');
                router.push('/admin/dashboard');
            } else {
                setError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                setLoading(false);
            }
        } catch {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            setLoading(false);
        }
    };

    // Show loading while checking session
    if (checkingSession) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-700">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-white/80">กำลังตรวจสอบ...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-700">
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

                    {/* Security notice */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
                        🔒 ระบบจะล็อคบัญชี 15 นาที หากกรอกรหัสผ่านผิด 5 ครั้ง
                    </div>
                </div>

                <p className="text-center text-white/60 text-sm mt-6">
                    © 2024 รพ.สต.มะตูม | ระบบจัดการข้อมูล
                </p>
            </div>
        </main>
    );
}
