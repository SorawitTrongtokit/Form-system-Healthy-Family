'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateThaiNationalId } from '@/lib/validation';
import { loginAsync, getAllVolunteersAsync, initializeStore } from '@/lib/store';
import { Volunteer } from '@/lib/types';

export default function LoginPage() {
    const [nationalId, setNationalId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loadingVolunteers, setLoadingVolunteers] = useState(true);
    const router = useRouter();

    useEffect(() => {
        initializeStore();
        // Load volunteers from Supabase
        getAllVolunteersAsync().then(vols => {
            setVolunteers(vols);
            setLoadingVolunteers(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate national ID
        const validation = validateThaiNationalId(nationalId);
        if (!validation.valid) {
            setError(validation.message);
            setLoading(false);
            return;
        }

        // Try to login (now async)
        const volunteer = await loginAsync(nationalId);

        if (volunteer) {
            router.push('/volunteer');
        } else {
            setError('ไม่พบข้อมูลอาสาสมัครในระบบ กรุณาติดต่อ รพ.สต.');
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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
                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                        <img src="/logo.jpg" alt="รพ.สต.มะตูม" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        ระบบแบบฟอร์มครอบครัวสุขภาพดี
                    </h1>
                    <p className="text-white/80">
                        รพ.สต.มะตูม | ตำบลมะตูม
                    </p>
                </div>

                {/* Login Card */}
                <div className="card p-8">
                    <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
                        🔐 เข้าสู่ระบบสำหรับอาสาสมัคร
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">
                                เลขบัตรประชาชน 13 หลัก
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="กรอกเลขบัตรประชาชน"
                                value={nationalId}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                                    setNationalId(value);
                                    setError('');
                                }}
                                maxLength={13}
                                autoComplete="off"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                {nationalId.length}/13 หลัก
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || nationalId.length !== 13}
                            className="btn btn-primary w-full"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    กำลังเข้าสู่ระบบ...
                                </span>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>

                    {/* Demo IDs for testing */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500 text-center mb-4">
                            <strong>อาสาสมัครหมู่ 6:</strong> คลิกเลือกเพื่อเข้าสู่ระบบ
                        </p>
                        {loadingVolunteers ? (
                            <div className="text-center py-4">
                                <div className="loading-spinner mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-2">กำลังโหลดข้อมูล...</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {volunteers.slice(0, 5).map((vol) => (
                                    <button
                                        key={vol.id}
                                        type="button"
                                        onClick={() => {
                                            setNationalId(vol.national_id);
                                            setError('');
                                        }}
                                        className="w-full text-left p-3 bg-gray-50 hover:bg-teal-50 rounded-lg transition-colors border border-gray-200 hover:border-teal-300"
                                    >
                                        <span className="font-mono text-sm text-gray-600">{vol.national_id}</span>
                                        <br />
                                        <span className="text-gray-800">{vol.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/60 text-sm mt-6">
                    © 2024 รพ.สต.มะตูม | ระบบบันทึกข้อมูลสุขภาพประชาชน
                </p>
            </div>
        </main>
    );
}
