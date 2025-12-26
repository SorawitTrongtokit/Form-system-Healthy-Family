'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Validate session with server API (not just client cookie)
async function validateSession(): Promise<boolean> {
    try {
        const response = await fetch('/api/admin/session');
        const data = await response.json();
        return data.valid === true;
    } catch {
        return false;
    }
}

function AdminLoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check if already logged in using server API
    useEffect(() => {
        async function checkSession() {
            const isValid = await validateSession();
            if (isValid) {
                const redirect = searchParams.get('redirect') || '/admin/dashboard';
                router.replace(redirect);
            } else {
                setCheckingSession(false);
            }
        }
        checkSession();
    }, [router, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                const redirect = searchParams.get('redirect') || '/admin/dashboard';
                router.replace(redirect);
            } else {
                setError(data.error || 'Email หรือรหัสผ่านไม่ถูกต้อง');
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
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="input"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">รหัสผ่าน</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="รหัสผ่าน"
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
                            disabled={loading || !email || !password}
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

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-700">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-white/80">กำลังโหลด...</p>
                </div>
            </main>
        }>
            <AdminLoginContent />
        </Suspense>
    );
}
