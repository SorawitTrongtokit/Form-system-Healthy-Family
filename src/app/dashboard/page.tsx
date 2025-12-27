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

                {/* Pie Charts Section */}
                {(() => {
                    const totalPassed = stats.byAgeGroup.reduce((sum, g) => sum + g.passed, 0);
                    const totalFailed = stats.byAgeGroup.reduce((sum, g) => sum + g.failed, 0);
                    const notSurveyed = stats.totalResidents - stats.surveyedCount;
                    const total = stats.totalResidents;

                    // Calculate percentages for pie chart
                    const passedPercent = total > 0 ? (totalPassed / total) * 100 : 0;
                    const failedPercent = total > 0 ? (totalFailed / total) * 100 : 0;
                    const notSurveyedPercent = total > 0 ? (notSurveyed / total) * 100 : 0;

                    // Calculate stroke-dasharray for SVG pie chart
                    const circumference = 2 * Math.PI * 40; // radius = 40
                    const passedDash = (passedPercent / 100) * circumference;
                    const failedDash = (failedPercent / 100) * circumference;
                    const passedOffset = 0;
                    const failedOffset = -passedDash;
                    const notSurveyedOffset = -(passedDash + failedDash);

                    return (
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            {/* Survey Result Pie Chart */}
                            <div className="card p-6">
                                <h3 className="font-bold text-gray-800 mb-4 text-center">🥧 สัดส่วนผลการสำรวจ</h3>
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <svg width="180" height="180" viewBox="0 0 100 100">
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="40" fill="#f3f4f6" />

                                            {/* Not Surveyed (Gray) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#9ca3af"
                                                strokeWidth="20"
                                                strokeDasharray={`${(notSurveyedPercent / 100) * circumference} ${circumference}`}
                                                strokeDashoffset={notSurveyedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Failed (Red) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#ef4444"
                                                strokeWidth="20"
                                                strokeDasharray={`${failedDash} ${circumference}`}
                                                strokeDashoffset={failedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Passed (Green) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#22c55e"
                                                strokeWidth="20"
                                                strokeDasharray={`${passedDash} ${circumference}`}
                                                strokeDashoffset={passedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Center text */}
                                            <text x="50" y="46" textAnchor="middle" className="text-xs font-bold fill-gray-700">
                                                {stats.surveyedCount}
                                            </text>
                                            <text x="50" y="58" textAnchor="middle" className="text-[8px] fill-gray-500">
                                                สำรวจแล้ว
                                            </text>
                                        </svg>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ผ่าน {totalPassed} ({passedPercent.toFixed(1)}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ไม่ผ่าน {totalFailed} ({failedPercent.toFixed(1)}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                        <span className="text-sm text-gray-600">ยังไม่สำรวจ {notSurveyed} ({notSurveyedPercent.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Age Group Distribution Pie Chart */}
                            <div className="card p-6">
                                <h3 className="font-bold text-gray-800 mb-4 text-center">👥 สัดส่วนประชากรตามกลุ่มวัย</h3>
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <svg width="180" height="180" viewBox="0 0 100 100">
                                            {/* Background */}
                                            <circle cx="50" cy="50" r="40" fill="#f3f4f6" />

                                            {/* Age group segments */}
                                            {(() => {
                                                const colors = ['#f472b6', '#60a5fa', '#a78bfa', '#4ade80', '#fbbf24'];
                                                let offset = 0;
                                                return stats.byAgeGroup.map((group, index) => {
                                                    const percent = total > 0 ? (group.total / total) * 100 : 0;
                                                    const dash = (percent / 100) * circumference;
                                                    const segment = (
                                                        <circle
                                                            key={group.ageGroup}
                                                            cx="50" cy="50" r="40"
                                                            fill="transparent"
                                                            stroke={colors[index]}
                                                            strokeWidth="20"
                                                            strokeDasharray={`${dash} ${circumference}`}
                                                            strokeDashoffset={-offset}
                                                            transform="rotate(-90 50 50)"
                                                        />
                                                    );
                                                    offset += dash;
                                                    return segment;
                                                });
                                            })()}

                                            {/* Center text */}
                                            <text x="50" y="46" textAnchor="middle" className="text-xs font-bold fill-gray-700">
                                                {stats.totalResidents}
                                            </text>
                                            <text x="50" y="58" textAnchor="middle" className="text-[8px] fill-gray-500">
                                                คน
                                            </text>
                                        </svg>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                                    {stats.byAgeGroup.map((group, index) => {
                                        const colors = ['bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-amber-400'];
                                        const percent = total > 0 ? ((group.total / total) * 100).toFixed(1) : '0';
                                        return (
                                            <div key={group.ageGroup} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 ${colors[index]} rounded`}></div>
                                                <span className="text-gray-600">
                                                    {getAgeGroupLabel(group.ageGroup as '0-5' | '6-14' | '15-18' | '19-59' | '60+')} ({percent}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Household Survey Charts */}
                {(() => {
                    const totalHouses = stats.byVillage.reduce((sum, v) => sum + v.totalHouses, 0);
                    const surveyedHouses = stats.byVillage.reduce((sum, v) => sum + v.surveyedHouses, 0);
                    const passedHouses = stats.byVillage.reduce((sum, v) => sum + v.passedHouses, 0);
                    const failedHouses = stats.byVillage.reduce((sum, v) => sum + v.failedHouses, 0);
                    const notSurveyedHouses = totalHouses - surveyedHouses;

                    // Calculate percentages for pie chart
                    const passedPercent = totalHouses > 0 ? (passedHouses / totalHouses) * 100 : 0;
                    const failedPercent = totalHouses > 0 ? (failedHouses / totalHouses) * 100 : 0;
                    const notSurveyedPercent = totalHouses > 0 ? (notSurveyedHouses / totalHouses) * 100 : 0;

                    // Calculate stroke-dasharray for SVG pie chart
                    const circumference = 2 * Math.PI * 40; // radius = 40
                    const passedDash = (passedPercent / 100) * circumference;
                    const failedDash = (failedPercent / 100) * circumference;
                    const passedOffset = 0;
                    const failedOffset = -passedDash;
                    const notSurveyedOffset = -(passedDash + failedDash);

                    // Bar chart dimensions
                    const barChartWidth = 320;
                    const barChartHeight = 200;
                    const barWidth = 30;
                    const barGap = 15;
                    const maxPercent = 100;
                    const chartPadding = { top: 20, right: 20, bottom: 40, left: 40 };
                    const chartInnerWidth = barChartWidth - chartPadding.left - chartPadding.right;
                    const chartInnerHeight = barChartHeight - chartPadding.top - chartPadding.bottom;

                    return (
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            {/* Household Survey Result Pie Chart */}
                            <div className="card p-6">
                                <h3 className="font-bold text-gray-800 mb-4 text-center">🏠 สัดส่วนผลการสำรวจรายหลังคาเรือน</h3>
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <svg width="180" height="180" viewBox="0 0 100 100">
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="40" fill="#f3f4f6" />

                                            {/* Not Surveyed (Gray) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#9ca3af"
                                                strokeWidth="20"
                                                strokeDasharray={`${(notSurveyedPercent / 100) * circumference} ${circumference}`}
                                                strokeDashoffset={notSurveyedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Failed (Red) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#ef4444"
                                                strokeWidth="20"
                                                strokeDasharray={`${failedDash} ${circumference}`}
                                                strokeDashoffset={failedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Passed (Green) */}
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke="#22c55e"
                                                strokeWidth="20"
                                                strokeDasharray={`${passedDash} ${circumference}`}
                                                strokeDashoffset={passedOffset}
                                                transform="rotate(-90 50 50)"
                                            />

                                            {/* Center text */}
                                            <text x="50" y="46" textAnchor="middle" className="text-xs font-bold fill-gray-700">
                                                {surveyedHouses}
                                            </text>
                                            <text x="50" y="58" textAnchor="middle" className="text-[8px] fill-gray-500">
                                                หลังคาเรือน
                                            </text>
                                        </svg>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ผ่าน {passedHouses} ({passedPercent.toFixed(1)}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ไม่ผ่าน {failedHouses} ({failedPercent.toFixed(1)}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                        <span className="text-sm text-gray-600">ยังไม่สำรวจ {notSurveyedHouses} ({notSurveyedPercent.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Village Pass Rate Bar Chart */}
                            <div className="card p-6">
                                <h3 className="font-bold text-gray-800 mb-4 text-center">📊 อัตราผ่านเกณฑ์รายหมู่บ้าน (หลังคาเรือน)</h3>
                                <div className="flex items-center justify-center overflow-x-auto">
                                    <svg width={barChartWidth} height={barChartHeight} className="overflow-visible">
                                        {/* Y-axis grid lines */}
                                        {[0, 25, 50, 75, 100].map(percent => (
                                            <g key={percent}>
                                                <line
                                                    x1={chartPadding.left}
                                                    y1={chartPadding.top + chartInnerHeight - (percent / maxPercent) * chartInnerHeight}
                                                    x2={barChartWidth - chartPadding.right}
                                                    y2={chartPadding.top + chartInnerHeight - (percent / maxPercent) * chartInnerHeight}
                                                    stroke="#e5e7eb"
                                                    strokeWidth="1"
                                                />
                                                <text
                                                    x={chartPadding.left - 5}
                                                    y={chartPadding.top + chartInnerHeight - (percent / maxPercent) * chartInnerHeight + 4}
                                                    textAnchor="end"
                                                    className="text-[10px] fill-gray-500"
                                                >
                                                    {percent}%
                                                </text>
                                            </g>
                                        ))}

                                        {/* 30% Threshold dashed line */}
                                        <line
                                            x1={chartPadding.left}
                                            y1={chartPadding.top + chartInnerHeight - (30 / maxPercent) * chartInnerHeight}
                                            x2={barChartWidth - chartPadding.right}
                                            y2={chartPadding.top + chartInnerHeight - (30 / maxPercent) * chartInnerHeight}
                                            stroke="#f97316"
                                            strokeWidth="2"
                                            strokeDasharray="6 4"
                                        />
                                        <text
                                            x={barChartWidth - chartPadding.right + 5}
                                            y={chartPadding.top + chartInnerHeight - (30 / maxPercent) * chartInnerHeight + 4}
                                            className="text-[9px] fill-orange-500 font-semibold"
                                        >
                                            เกณฑ์ 30%
                                        </text>

                                        {/* Bars */}
                                        {stats.byVillage.map((village, index) => {
                                            const barX = chartPadding.left + index * (barWidth + barGap) + barGap;
                                            const barHeight = (village.passedPercent / maxPercent) * chartInnerHeight;
                                            const barY = chartPadding.top + chartInnerHeight - barHeight;
                                            const barColor = village.passedPercent >= 30 ? '#22c55e' : '#ef4444';

                                            return (
                                                <g key={village.villageNo}>
                                                    {/* Bar */}
                                                    <rect
                                                        x={barX}
                                                        y={barY}
                                                        width={barWidth}
                                                        height={barHeight}
                                                        fill={barColor}
                                                        rx="3"
                                                        className="transition-all duration-300"
                                                    />
                                                    {/* Percentage label on top of bar */}
                                                    <text
                                                        x={barX + barWidth / 2}
                                                        y={barY - 5}
                                                        textAnchor="middle"
                                                        className="text-[10px] font-bold"
                                                        fill={barColor}
                                                    >
                                                        {village.passedPercent}%
                                                    </text>
                                                    {/* Village label */}
                                                    <text
                                                        x={barX + barWidth / 2}
                                                        y={chartPadding.top + chartInnerHeight + 15}
                                                        textAnchor="middle"
                                                        className="text-[10px] fill-gray-600"
                                                    >
                                                        ม.{village.villageNo}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* X-axis */}
                                        <line
                                            x1={chartPadding.left}
                                            y1={chartPadding.top + chartInnerHeight}
                                            x2={barChartWidth - chartPadding.right}
                                            y2={chartPadding.top + chartInnerHeight}
                                            stroke="#9ca3af"
                                            strokeWidth="1"
                                        />
                                    </svg>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ผ่านเกณฑ์ ≥30%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                                        <span className="text-sm text-gray-600">ต่ำกว่าเกณฑ์ &lt;30%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-1 bg-orange-500" style={{ borderTop: '2px dashed #f97316' }}></div>
                                        <span className="text-sm text-gray-600">เส้นเกณฑ์ 30%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

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
                                    <th className="text-center py-3 px-4 text-gray-700 font-semibold">หลังคาเรือน</th>
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
                                        <td className="text-center py-3 px-4 text-gray-600">{village.totalHouses}</td>
                                        <td className="text-center py-3 px-4 text-gray-600">{village.surveyedHouses}</td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-success">{village.passedHouses}</span>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <span className="badge badge-danger">{village.failedHouses}</span>
                                        </td>
                                        <td className={`text-center py-3 px-4 font-bold ${getPassedColor(village.passedPercent)}`}>
                                            {village.passedPercent}%
                                        </td>
                                    </tr>
                                ))}
                                {/* แถวรวมทั้งหมด */}
                                {(() => {
                                    const totalHouses = stats.byVillage.reduce((sum, v) => sum + v.totalHouses, 0);
                                    const totalSurveyed = stats.byVillage.reduce((sum, v) => sum + v.surveyedHouses, 0);
                                    const totalPassed = stats.byVillage.reduce((sum, v) => sum + v.passedHouses, 0);
                                    const totalFailed = stats.byVillage.reduce((sum, v) => sum + v.failedHouses, 0);
                                    const totalPassedPercent = totalSurveyed > 0 ? Math.round((totalPassed / totalSurveyed) * 100) : 0;
                                    return (
                                        <tr className="bg-teal-50 border-t-2 border-teal-300 font-bold">
                                            <td className="py-3 px-4 text-teal-800">
                                                📊 รวมทั้งหมด
                                            </td>
                                            <td className="text-center py-3 px-4 text-teal-800">{totalHouses}</td>
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
