'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getElderlyMapDataAsync, ElderlyMapData } from '@/lib/store';

// Dynamic import for Leaflet map (client-side only)
const ElderlyMap = dynamic(() => import('@/components/ElderlyMap'), {
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

export default function MapPage() {
    const [elderlyData, setElderlyData] = useState<ElderlyMapData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPerson, setSelectedPerson] = useState<ElderlyMapData | null>(null);

    useEffect(() => {
        async function loadData() {
            const data = await getElderlyMapDataAsync();
            setElderlyData(data);
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="loading-spinner"></div>
            </main>
        );
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'passed': return 'ผ่านเกณฑ์';
            case 'failed': return 'ไม่ผ่านเกณฑ์';
            case 'other': return 'อื่นๆ';
            default: return 'ยังไม่ได้กรอก';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'passed': return '🟢';
            case 'failed': return '🔴';
            case 'other': return '🔵';
            default: return '⚪';
        }
    };

    // Summary stats
    const passed = elderlyData.filter(e => e.status === 'passed').length;
    const failed = elderlyData.filter(e => e.status === 'failed').length;
    const other = elderlyData.filter(e => e.status === 'other').length;
    const notSurveyed = elderlyData.filter(e => e.status === 'not_surveyed').length;

    // Convert to map markers format
    const mapMarkers = elderlyData.map(person => ({
        id: person.id,
        name: person.name,
        latitude: person.latitude,
        longitude: person.longitude,
        status: person.status,
        age: person.age,
        houseNumber: person.houseNumber,
        villageNo: person.villageNo
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div>
                    <h1 className="nav-title">🗺️ แผนที่ผู้สูงอายุ (60+)</h1>
                    <p className="text-sm text-white/80">แสดงตำแหน่งและสถานะสุขภาพ</p>
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
                    <h2 className="text-lg font-bold text-gray-800 mb-4">📊 สรุปผู้สูงอายุ 60 ปีขึ้นไป</h2>
                    <div className="grid-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{passed}</div>
                            <div className="text-sm text-green-700">🟢 ผ่านเกณฑ์</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{failed}</div>
                            <div className="text-sm text-red-700">🔴 ไม่ผ่านเกณฑ์</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{other}</div>
                            <div className="text-sm text-blue-700">🔵 อื่นๆ</div>
                        </div>
                        <div className="text-center p-4 bg-gray-100 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">{notSurveyed}</div>
                            <div className="text-sm text-gray-700">⚪ ยังไม่ได้กรอก</div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">ผ่านเกณฑ์</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">ไม่ผ่านเกณฑ์</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">อื่นๆ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-400 rounded-full border-2 border-white shadow"></div>
                            <span className="text-sm text-gray-700">ยังไม่ได้กรอก</span>
                        </div>
                    </div>
                </div>

                {/* Real Map */}
                <div className="card p-6 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">📍 แผนที่แสดงตำแหน่งผู้สูงอายุ</h3>
                    <ElderlyMap markers={mapMarkers} />
                    <p className="text-sm text-gray-500 mt-3 text-center">
                        💡 คลิกที่ marker เพื่อดูรายละเอียด | ใช้พิกัด GPS จากการสำรวจ
                    </p>
                </div>

                {/* Selected Person Detail */}
                {selectedPerson && (
                    <div className="card p-6 mb-6 border-2 border-teal-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">
                                    {selectedPerson.name}
                                </h3>
                                <p className="text-gray-600">อายุ {selectedPerson.age} ปี</p>
                                <p className="text-gray-500 text-sm">
                                    บ้านเลขที่ {selectedPerson.houseNumber} หมู่ {selectedPerson.villageNo}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    📍 พิกัด: {selectedPerson.latitude.toFixed(4)}, {selectedPerson.longitude.toFixed(4)}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`badge ${selectedPerson.status === 'passed' ? 'badge-success' :
                                    selectedPerson.status === 'failed' ? 'badge-danger' :
                                        selectedPerson.status === 'other' ? 'badge-info' :
                                            'badge-gray'
                                    }`}>
                                    {getStatusEmoji(selectedPerson.status)} {getStatusLabel(selectedPerson.status)}
                                </span>
                                <button
                                    onClick={() => setSelectedPerson(null)}
                                    className="block mt-2 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    ✕ ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Elderly List */}
                <div className="card p-6">
                    <h3 className="font-bold text-gray-800 mb-4">👴 รายชื่อผู้สูงอายุ 60+ ทั้งหมด ({elderlyData.length} คน)</h3>

                    <div className="space-y-3">
                        {elderlyData.map((person) => (
                            <div
                                key={person.id}
                                className={`p-4 bg-gray-50 rounded-lg border-l-4 cursor-pointer hover:bg-gray-100 transition-colors ${person.status === 'passed' ? 'border-green-500' :
                                    person.status === 'failed' ? 'border-red-500' :
                                        person.status === 'other' ? 'border-blue-500' :
                                            'border-gray-400'
                                    }`}
                                onClick={() => setSelectedPerson(person)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{person.name}</p>
                                        <p className="text-sm text-gray-600">
                                            อายุ {person.age} ปี | บ้านเลขที่ {person.houseNumber} หมู่ {person.villageNo}
                                        </p>
                                    </div>
                                    <span className={`badge ${person.status === 'passed' ? 'badge-success' :
                                        person.status === 'failed' ? 'badge-danger' :
                                            person.status === 'other' ? 'badge-info' :
                                                'badge-gray'
                                        }`}>
                                        {getStatusEmoji(person.status)} {getStatusLabel(person.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
