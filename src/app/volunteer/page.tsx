'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentVolunteer, getMyHousesAsync, logout, restoreSession } from '@/lib/store';
import { Volunteer, HouseWithStats } from '@/lib/types';

export default function VolunteerDashboard() {
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
    const [houses, setHouses] = useState<HouseWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            // Try to restore session first
            let vol = getCurrentVolunteer();
            if (!vol) {
                vol = await restoreSession();
            }

            if (!vol) {
                router.push('/login');
                return;
            }

            setVolunteer(vol);

            // Load houses from Supabase
            const myHouses = await getMyHousesAsync();
            setHouses(myHouses);
            setLoading(false);
        }

        loadData();
    }, [router]);

    const handleLogout = () => {
        logout();
        router.push('/');
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

    // Calculate summary stats
    const totalHouses = houses.length;
    const totalResidents = houses.reduce((sum, h) => sum + h.total_residents, 0);
    const totalSurveyed = houses.reduce((sum, h) => sum + h.surveyed_count, 0);
    const coveragePercent = totalResidents > 0 ? Math.round((totalSurveyed / totalResidents) * 100) : 0;

    const getStatusBadge = (house: HouseWithStats) => {
        if (house.surveyed_count === 0) {
            return <span className="badge badge-gray">⭕ ยังไม่สำรวจ</span>;
        } else if (house.surveyed_count < house.total_residents) {
            return <span className="badge badge-warning">🟡 สำรวจบางส่วน</span>;
        } else {
            // สำรวจครบแล้ว - แสดงสถานะผ่าน/ไม่ผ่าน
            if (house.failed_count === 0) {
                return <span className="badge badge-success">✅ ผ่านเกณฑ์ทุกคน</span>;
            } else {
                return <span className="badge bg-red-100 text-red-700">❌ ไม่ผ่านเกณฑ์</span>;
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div>
                    <h1 className="nav-title">ระบบแบบฟอร์มครอบครัวสุขภาพดี</h1>
                    <p className="text-sm text-white/80">รพ.สต.มะตูม</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="nav-link">
                        📊 Dashboard
                    </Link>
                    <Link href="/map" className="nav-link">
                        🗺️ แผนที่
                    </Link>
                    <button onClick={handleLogout} className="nav-link">
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="container">
                {/* Welcome Section */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl">
                            👤
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                สวัสดี, {volunteer?.name}
                            </h2>
                            <p className="text-gray-600">อาสาสมัครสาธารณสุขประจำหมู่บ้าน</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid-4 mb-6">
                    <div className="stat-card">
                        <div className="stat-value">{totalHouses}</div>
                        <div className="stat-label">🏠 หลังคาเรือน</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalResidents}</div>
                        <div className="stat-label">👥 ประชากร</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalSurveyed}</div>
                        <div className="stat-label">📝 สำรวจแล้ว</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{coveragePercent}%</div>
                        <div className="stat-label">📊 ความคืบหน้า</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="card p-6 mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>ความคืบหน้าการสำรวจ</span>
                        <span>{totalSurveyed}/{totalResidents} คน</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-gradient-to-r from-teal-400 to-teal-600 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${coveragePercent}%` }}
                        />
                    </div>
                </div>

                {/* Houses List */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        🏘️ บ้านในความรับผิดชอบ
                    </h3>

                    {houses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>ไม่พบข้อมูลบ้านในความรับผิดชอบ</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {houses.map((house) => (
                                <Link
                                    key={house.id}
                                    href={`/volunteer/house/${house.id}`}
                                    className="block p-4 bg-white hover:bg-teal-50 rounded-lg border-2 border-gray-100 hover:border-teal-300 transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-lg">
                                                🏠 บ้านเลขที่ {house.house_number}
                                            </h4>
                                            <p className="text-gray-600 text-sm mt-1">
                                                หมู่ {house.village_no} | 👥 {house.total_residents} คน | 📝 สำรวจแล้ว {house.surveyed_count} คน
                                            </p>
                                            {house.failed_count > 0 && (
                                                <p className="text-red-600 font-medium text-sm mt-1">
                                                    ❌ ไม่ผ่าน {house.failed_count} คน
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                            {getStatusBadge(house)}
                                            <span className="text-teal-600 text-sm font-medium">ดูรายละเอียด →</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
