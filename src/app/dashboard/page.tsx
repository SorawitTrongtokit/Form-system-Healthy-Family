'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardStatsAsync, DashboardStats } from '@/lib/store';
import { getAgeGroupLabel } from '@/lib/calculations';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const data = await getDashboardStatsAsync();
            setStats(data);
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading || !stats) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="loading-spinner"></div>
            </main>
        );
    }

    const getPassedColor = (percent: number) => {
        if (percent >= 80) return 'text-green-600';
        if (percent >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div>
                    <h1 className="nav-title">📊 Dashboard สถิติภาพรวม</h1>
                    <p className="text-sm text-white/80">รพ.สต.มะตูม | ระบบแบบฟอร์มครอบครัวสุขภาพดี</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/volunteer" className="nav-link">
                        🏠 หน้าหลัก
                    </Link>
                    <Link href="/map" className="nav-link">
                        🗺️ แผนที่
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container">
                {/* Overview Stats */}
                <div className="card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
                    <h2 className="text-xl font-bold mb-4 text-white">📈 ภาพรวมการสำรวจ</h2>
                    <div className="grid-3">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">{stats.totalResidents}</div>
                            <div className="text-white/80">ประชากรทั้งหมด</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">{stats.surveyedCount}</div>
                            <div className="text-white/80">ข้อมูลที่บันทึกแล้ว</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white">{stats.coveragePercent}%</div>
                            <div className="text-white/80">ความครอบคลุม</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm text-white mb-2">
                            <span>ความคืบหน้าการสำรวจ</span>
                            <span>{stats.surveyedCount}/{stats.totalResidents} คน</span>
                        </div>
                        <div className="bg-white/30 rounded-full h-4">
                            <div
                                className="bg-white h-4 rounded-full transition-all"
                                style={{ width: `${stats.coveragePercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Age Group Stats */}
                <div className="card p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📊 สถิติแยกตามกลุ่มอายุ</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">กลุ่มอายุ</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ข้อมูลทั้งหมด</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ผ่านเกณฑ์</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ไม่ผ่านเกณฑ์</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ผ่านเกณฑ์ (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.byAgeGroup.map((group, index) => (
                                    <tr key={group.ageGroup} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="py-3 px-4 text-gray-800">
                                            <span className={`inline-block w-3 h-3 rounded mr-2 ${group.ageGroup === '0-5' ? 'bg-pink-400' :
                                                group.ageGroup === '6-14' ? 'bg-blue-400' :
                                                    group.ageGroup === '15-18' ? 'bg-purple-400' :
                                                        group.ageGroup === '19-59' ? 'bg-green-400' :
                                                            'bg-amber-400'
                                                }`}></span>
                                            {getAgeGroupLabel(group.ageGroup as '0-5' | '6-14' | '15-18' | '19-59' | '60+')}
                                        </td>
                                        <td className="text-center py-3 px-4 font-medium text-gray-800">{group.total}</td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-success">{group.passed}</span>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-danger">{group.failed}</span>
                                        </td>
                                        <td className={`text-center py-3 px-4 font-bold ${getPassedColor(group.passedPercent)}`}>
                                            {group.passedPercent}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Village Stats */}
                <div className="card p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🏘️ สถิติแยกรายหมู่บ้าน</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">หมู่บ้าน</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ประชากร</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">สำรวจแล้ว</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ผ่านเกณฑ์</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ไม่ผ่านเกณฑ์</th>
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">ผ่าน (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.byVillage.map((village, index) => (
                                    <tr key={village.villageNo} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="py-3 px-4 text-gray-800 font-medium">
                                            🏠 หมู่ที่ {village.villageNo}
                                        </td>
                                        <td className="text-center py-3 px-4 text-gray-600">{village.totalResidents}</td>
                                        <td className="text-center py-3 px-4 text-gray-600">{village.surveyedCount}</td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-success">{village.passed}</span>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-danger">{village.failed}</span>
                                        </td>
                                        <td className={`text-center py-3 px-4 font-bold ${getPassedColor(village.passedPercent)}`}>
                                            {village.passedPercent}%
                                        </td>
                                    </tr>
                                ))}
                                {/* แถวรวมทั้งหมด */}
                                {(() => {
                                    const totalResidents = stats.byVillage.reduce((sum, v) => sum + v.totalResidents, 0);
                                    const totalSurveyed = stats.byVillage.reduce((sum, v) => sum + v.surveyedCount, 0);
                                    const totalPassed = stats.byVillage.reduce((sum, v) => sum + v.passed, 0);
                                    const totalFailed = stats.byVillage.reduce((sum, v) => sum + v.failed, 0);
                                    const totalPassedPercent = totalSurveyed > 0 ? Math.round((totalPassed / totalSurveyed) * 100) : 0;
                                    return (
                                        <tr className="bg-teal-50 border-t-2 border-teal-300 font-bold">
                                            <td className="py-3 px-4 text-teal-800">
                                                📊 รวมทั้งหมด
                                            </td>
                                            <td className="text-center py-3 px-4 text-teal-800">{totalResidents}</td>
                                            <td className="text-center py-3 px-4 text-teal-800">{totalSurveyed}</td>
                                            <td className="text-center py-3 px-4">
                                                <span className="badge badge-success">{totalPassed}</span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <span className="badge badge-danger">{totalFailed}</span>
                                            </td>
                                            <td className={`text-center py-3 px-4 font-bold ${getPassedColor(totalPassedPercent)}`}>
                                                {totalPassedPercent}%
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Age Group Cards */}
                <div className="grid-2 gap-4 mb-6">
                    {stats.byAgeGroup.map((group) => {
                        const surveyed = group.passed + group.failed;
                        const notSurveyed = group.total - surveyed;

                        return (
                            <div key={group.ageGroup} className={`card p-6 ${group.ageGroup === '0-5' ? 'border-l-4 border-pink-400' :
                                group.ageGroup === '6-14' ? 'border-l-4 border-blue-400' :
                                    group.ageGroup === '15-18' ? 'border-l-4 border-purple-400' :
                                        group.ageGroup === '19-59' ? 'border-l-4 border-green-400' :
                                            'border-l-4 border-amber-400'
                                }`}>
                                <h3 className="font-bold text-gray-800 mb-3">
                                    {getAgeGroupLabel(group.ageGroup as '0-5' | '6-14' | '15-18' | '19-59' | '60+')}
                                </h3>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ประชากรในกลุ่ม:</span>
                                        <span className="font-medium">{group.total} คน</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">สำรวจแล้ว:</span>
                                        <span className="font-medium">{surveyed} คน</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ยังไม่สำรวจ:</span>
                                        <span className="font-medium text-gray-400">{notSurveyed} คน</span>
                                    </div>
                                </div>

                                {/* Mini progress bar */}
                                <div className="mt-4">
                                    <div className="flex gap-1 h-2">
                                        <div
                                            className="bg-green-500 rounded-l"
                                            style={{ width: `${group.total > 0 ? (group.passed / group.total) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="bg-red-500"
                                            style={{ width: `${group.total > 0 ? (group.failed / group.total) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="bg-gray-300 rounded-r flex-1"
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                        <span>🟢 ผ่าน {group.passed}</span>
                                        <span>🔴 ไม่ผ่าน {group.failed}</span>
                                        <span>⚪ รอ {notSurveyed}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/volunteer" className="card p-6 text-center hover:bg-teal-50 transition-colors">
                        <div className="text-4xl mb-2">📋</div>
                        <h4 className="font-bold text-gray-800">กลับไปสำรวจ</h4>
                        <p className="text-sm text-gray-500">เลือกบ้านที่จะสำรวจ</p>
                    </Link>
                    <Link href="/map" className="card p-6 text-center hover:bg-teal-50 transition-colors">
                        <div className="text-4xl mb-2">🗺️</div>
                        <h4 className="font-bold text-gray-800">ดูแผนที่</h4>
                        <p className="text-sm text-gray-500">แผนที่หลังคาเรือน</p>
                    </Link>
                    <Link href="/export" className="card p-6 text-center hover:bg-green-50 transition-colors">
                        <div className="text-4xl mb-2">📥</div>
                        <h4 className="font-bold text-gray-800">Export ข้อมูล</h4>
                        <p className="text-sm text-gray-500">ดาวน์โหลด Excel</p>
                    </Link>
                    <Link href="/admin" className="card p-6 text-center hover:bg-purple-50 transition-colors">
                        <div className="text-4xl mb-2">⚙️</div>
                        <h4 className="font-bold text-gray-800">Admin</h4>
                        <p className="text-sm text-gray-500">จัดการระบบ</p>
                    </Link>
                </div>
            </main>
        </div>
    );
}
