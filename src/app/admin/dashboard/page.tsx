'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AdminStats {
    volunteers: number;
    houses: number;
    residents: number;
    healthRecords: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check if admin logged in
        if (typeof window !== 'undefined') {
            const isLoggedIn = localStorage.getItem('adminLoggedIn');
            if (!isLoggedIn) {
                router.push('/admin');
                return;
            }
        }

        async function loadStats() {
            const [volunteers, houses, residents, records] = await Promise.all([
                supabase.from('volunteers').select('id', { count: 'exact' }),
                supabase.from('houses').select('id', { count: 'exact' }),
                supabase.from('residents').select('id', { count: 'exact' }),
                supabase.from('health_records').select('id', { count: 'exact' })
            ]);

            setStats({
                volunteers: volunteers.count || 0,
                houses: houses.count || 0,
                residents: residents.count || 0,
                healthRecords: records.count || 0
            });
            setLoading(false);
        }

        loadStats();
    }, [router]);

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('adminLoggedIn');
        }
        router.push('/admin');
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">⚙️ Admin Dashboard</h1>
                        <p className="text-sm text-white/80">จัดการระบบ รพ.สต.มะตูม</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                            🏠 หน้าหลัก
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                        >
                            🚪 ออกจากระบบ
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div className="card p-6 text-center">
                        <div className="text-4xl mb-2">👨‍⚕️</div>
                        <div className="text-3xl font-bold text-indigo-600">{stats?.volunteers}</div>
                        <div className="text-gray-600">อาสาสมัคร</div>
                    </div>
                    <div className="card p-6 text-center">
                        <div className="text-4xl mb-2">🏠</div>
                        <div className="text-3xl font-bold text-green-600">{stats?.houses}</div>
                        <div className="text-gray-600">หลังคาเรือน</div>
                    </div>
                    <div className="card p-6 text-center">
                        <div className="text-4xl mb-2">👥</div>
                        <div className="text-3xl font-bold text-blue-600">{stats?.residents}</div>
                        <div className="text-gray-600">ประชากร</div>
                    </div>
                    <div className="card p-6 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-3xl font-bold text-teal-600">{stats?.healthRecords}</div>
                        <div className="text-gray-600">สำรวจแล้ว</div>
                    </div>
                </div>

                {/* Management Links */}
                <h2 className="text-xl font-bold text-gray-800 mb-4">📂 จัดการข้อมูล</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <Link href="/admin/volunteers" className="card p-6 hover:shadow-lg transition-all hover:border-indigo-300 border-2 border-transparent">
                        <div className="text-4xl mb-4">👨‍⚕️</div>
                        <h3 className="font-bold text-xl text-gray-800 mb-2">จัดการอาสาสมัคร</h3>
                        <p className="text-gray-600">ดู, เพิ่ม, แก้ไข, ลบ อาสาสมัครในระบบ</p>
                        <div className="mt-4 text-indigo-600 font-medium">→ จัดการ</div>
                    </Link>
                    <Link href="/admin/houses" className="card p-6 hover:shadow-lg transition-all hover:border-green-300 border-2 border-transparent">
                        <div className="text-4xl mb-4">🏠</div>
                        <h3 className="font-bold text-xl text-gray-800 mb-2">จัดการบ้าน</h3>
                        <p className="text-gray-600">ดู, เพิ่ม, แก้ไข, ลบ หลังคาเรือน</p>
                        <div className="mt-4 text-green-600 font-medium">→ จัดการ</div>
                    </Link>
                    <Link href="/admin/residents" className="card p-6 hover:shadow-lg transition-all hover:border-blue-300 border-2 border-transparent">
                        <div className="text-4xl mb-4">👥</div>
                        <h3 className="font-bold text-xl text-gray-800 mb-2">จัดการประชากร</h3>
                        <p className="text-gray-600">ดู, เพิ่ม, แก้ไข, ลบ ข้อมูลประชากร</p>
                        <div className="mt-4 text-blue-600 font-medium">→ จัดการ</div>
                    </Link>
                </div>

                {/* Quick Actions */}
                <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">⚡ ทางลัด</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <Link href="/export" className="card p-6 hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)' }}>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">📥</div>
                            <div>
                                <h3 className="font-bold text-xl" style={{ color: 'white' }}>Export ข้อมูล</h3>
                                <p style={{ color: 'rgba(255,255,255,0.9)' }}>ดาวน์โหลดข้อมูลเป็น Excel</p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard" className="card p-6 hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">📊</div>
                            <div>
                                <h3 className="font-bold text-xl" style={{ color: 'white' }}>Dashboard สถิติ</h3>
                                <p style={{ color: 'rgba(255,255,255,0.9)' }}>ดูสถิติและรายงานภาพรวม</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
