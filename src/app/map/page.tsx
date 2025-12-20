'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getHouseMapDataAsync, HouseMapData } from '@/lib/store';

// Dynamic import for Leaflet map (client-side only)
const HouseMap = dynamic(() => import('@/components/HouseMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-2xl">
            <div className="text-center">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดแผนที่...</p>
            </div>
        </div>
    )
});

// Status color helper
const getResidentStatusColor = (status: string) => {
    switch (status) {
        case 'passed': return 'bg-green-500';    // Green - ผ่านเกณฑ์
        case 'failed': return 'bg-red-500';      // Red - ไม่ผ่าน
        case 'other': return 'bg-blue-500';      // Blue - อื่นๆ
        default: return 'bg-gray-400';           // Gray - ยังไม่ได้กรอก
    }
};

const getResidentStatusLabel = (status: string) => {
    switch (status) {
        case 'passed': return 'ผ่านเกณฑ์';
        case 'failed': return 'ไม่ผ่านเกณฑ์';
        case 'other': return 'อื่นๆ';
        default: return 'ยังไม่กรอก';
    }
};

export default function MapPage() {
    const [houseData, setHouseData] = useState<HouseMapData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHouse, setSelectedHouse] = useState<HouseMapData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
            const data = await getHouseMapDataAsync();
            setHouseData(data);
            setLoading(false);
        }
        loadData();
    }, []);

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

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'complete': return 'สำรวจครบ';
            case 'partial': return 'สำรวจบางส่วน';
            default: return 'ยังไม่สำรวจ';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'complete': return '✅';
            case 'partial': return '🟡';
            default: return '⚪';
        }
    };

    // Filter houses by search query
    const filteredHouses = houseData.filter(house =>
        house.houseNumber.includes(searchQuery) ||
        house.headOfHouse.includes(searchQuery)
    );

    // Summary stats
    const complete = houseData.filter(h => h.status === 'complete').length;
    const partial = houseData.filter(h => h.status === 'partial').length;
    const notSurveyed = houseData.filter(h => h.status === 'not_surveyed').length;
    const totalResidents = houseData.reduce((sum, h) => sum + h.totalResidents, 0);
    const totalSurveyed = houseData.reduce((sum, h) => sum + h.surveyedCount, 0);

    // Health status counts
    const allPassedHouses = houseData.filter(h => {
        const allSurveyed = h.surveyedCount === h.totalResidents && h.totalResidents > 0;
        return allSurveyed && h.residents.every(r => r.status === 'passed');
    }).length;
    const hasFailedHouses = houseData.filter(h =>
        h.residents.some(r => r.status === 'failed')
    ).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div>
                    <h1 className="nav-title">🗺️ แผนที่หลังคาเรือน</h1>
                    <p className="text-sm text-white/80">แสดงตำแหน่งและสถานะการสำรวจ</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/volunteer" className="nav-link">
                        🏠 หน้าหลัก
                    </Link>
                    <Link href="/dashboard" className="nav-link">
                        📊 Dashboard
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container">
                {/* Stats Summary */}
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">📊 สรุปหลังคาเรือน</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-4 bg-teal-50 rounded-lg">
                            <div className="text-2xl font-bold text-teal-600">{houseData.length}</div>
                            <div className="text-sm text-teal-700">🏠 หลังคาเรือน</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{totalResidents}</div>
                            <div className="text-sm text-blue-700">👥 ประชากร</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                            <div className="text-2xl font-bold text-green-600">{allPassedHouses}</div>
                            <div className="text-sm text-green-700">✅ ผ่านเกณฑ์ทุกคน</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-300">
                            <div className="text-2xl font-bold text-red-600">{hasFailedHouses}</div>
                            <div className="text-sm text-red-700">🔴 มีคนไม่ผ่าน</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xl font-bold text-green-600">{complete}</div>
                            <div className="text-xs text-green-700">สำรวจครบ</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-xl font-bold text-yellow-600">{partial}</div>
                            <div className="text-xs text-yellow-700">บางส่วน</div>
                        </div>
                        <div className="text-center p-3 bg-gray-100 rounded-lg">
                            <div className="text-xl font-bold text-gray-600">{notSurveyed}</div>
                            <div className="text-xs text-gray-700">ยังไม่สำรวจ</div>
                        </div>
                    </div>
                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>ความคืบหน้าการสำรวจ</span>
                            <span>{totalSurveyed}/{totalResidents} คน ({totalResidents > 0 ? Math.round((totalSurveyed / totalResidents) * 100) : 0}%)</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all"
                                style={{ width: `${totalResidents > 0 ? (totalSurveyed / totalResidents) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">ผ่านเกณฑ์ทุกคน</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">มีคนไม่ผ่านเกณฑ์</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">สำรวจบางส่วน</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-400 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">ยังไม่สำรวจ</span>
                        </div>
                    </div>
                </div>

                {/* Real Map */}
                <div className="card p-6 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">📍 แผนที่แสดงตำแหน่งบ้าน</h3>
                    <HouseMap houses={houseData} />
                    <p className="text-sm text-gray-500 mt-3 text-center">
                        💡 คลิกที่ marker เพื่อดูรายละเอียด | ใช้พิกัด GPS จากการสำรวจ
                    </p>
                </div>

                {/* Search and House List */}
                <div className="card p-6 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">🔍 ค้นหาบ้าน</h3>

                    {/* Search Box */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="🔍 ค้นหาเลขที่บ้าน หรือชื่อเจ้าบ้าน..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* Houses List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredHouses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                ไม่พบบ้านที่ค้นหา
                            </div>
                        ) : (
                            filteredHouses.map((house) => (
                                <div
                                    key={house.id}
                                    className={`p-4 bg-gray-50 rounded-lg border-l-4 cursor-pointer hover:bg-gray-100 transition-colors ${house.status === 'complete' ? 'border-green-500' :
                                        house.status === 'partial' ? 'border-yellow-500' :
                                            'border-gray-400'
                                        } ${selectedHouse?.id === house.id ? 'ring-2 ring-teal-400' : ''}`}
                                    onClick={() => setSelectedHouse(selectedHouse?.id === house.id ? null : house)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-800">🏠 บ้านเลขที่ {house.houseNumber}</p>
                                            <p className="text-sm text-gray-600">
                                                หมู่ {house.villageNo} | {house.headOfHouse} | 👥 {house.totalResidents} คน
                                            </p>
                                        </div>
                                        <span className={`badge ${house.status === 'complete' ? 'badge-success' :
                                            house.status === 'partial' ? 'badge-warning' :
                                                'badge-gray'
                                            }`}>
                                            {getStatusEmoji(house.status)} {house.surveyedCount}/{house.totalResidents}
                                        </span>
                                    </div>

                                    {/* Expanded residents list when selected */}
                                    {selectedHouse?.id === house.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <h4 className="font-medium text-gray-700 mb-3">👥 รายชื่อสมาชิก:</h4>

                                            {/* Status Legend */}
                                            <div className="flex gap-3 mb-3 text-xs flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> ผ่าน
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> ไม่ผ่าน
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span> อื่นๆ
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span> ยังไม่กรอก
                                                </span>
                                            </div>

                                            {/* Residents */}
                                            <div className="space-y-2">
                                                {house.residents.map((resident) => (
                                                    <div
                                                        key={resident.id}
                                                        className="flex items-center gap-3 p-2 bg-white rounded-lg"
                                                    >
                                                        <div className={`w-3 h-3 rounded-full ${getResidentStatusColor(resident.status)}`}></div>
                                                        <div className="flex-1">
                                                            <span className="text-gray-800">{resident.name}</span>
                                                            <span className="text-gray-400 text-sm ml-2">({resident.relationship})</span>
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded ${resident.status === 'passed' ? 'bg-green-100 text-green-700' :
                                                            resident.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                resident.status === 'other' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {getResidentStatusLabel(resident.status)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <p className="text-sm text-gray-500 mt-4 text-center">
                        แสดง {filteredHouses.length} จาก {houseData.length} หลังคาเรือน
                    </p>
                </div>
            </main>
        </div>
    );
}
