'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentVolunteer, getResidentsByHouseIdAsync, getHouseByIdAsync, updateHouseLocationAsync, restoreSession } from '@/lib/store';
import { House, ResidentWithAge } from '@/lib/types';
import { getAgeGroupLabel } from '@/lib/calculations';
import { formatThaiDate } from '@/lib/validation';

export default function HouseDetailPage() {
    const router = useRouter();
    const params = useParams();
    const houseId = params.id as string;

    const [house, setHouse] = useState<House | null>(null);
    const [residents, setResidents] = useState<ResidentWithAge[]>([]);
    const [loading, setLoading] = useState(true);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        async function loadData() {
            let vol = getCurrentVolunteer();
            if (!vol) {
                vol = await restoreSession();
            }

            if (!vol) {
                router.push('/');
                return;
            }

            const h = await getHouseByIdAsync(houseId);
            if (!h) {
                router.push('/volunteer');
                return;
            }

            setHouse(h);

            const res = await getResidentsByHouseIdAsync(houseId);
            setResidents(res);

            // Load existing GPS
            if (h.latitude && h.longitude) {
                setGps({ lat: h.latitude, lng: h.longitude });
            }

            setLoading(false);
        }

        loadData();
    }, [houseId, router]);

    const handleGetGPS = useCallback(() => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }

        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const newGps = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setGps(newGps);

                // Save to Supabase
                await updateHouseLocationAsync(houseId, newGps.lat, newGps.lng);

                // Update local house state
                if (house) {
                    setHouse({
                        ...house,
                        latitude: newGps.lat,
                        longitude: newGps.lng
                    });
                }

                setGpsLoading(false);
            },
            (error) => {
                console.error('GPS Error:', error);
                alert('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึง GPS');
                setGpsLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }, [houseId, house]);

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="loading-spinner"></div>
            </main>
        );
    }

    const getAgeGroupClass = (ageGroup: string) => {
        switch (ageGroup) {
            case '0-5': return 'age-0-5';
            case '6-14': return 'age-6-14';
            case '15-18': return 'age-15-18';
            case '19-59': return 'age-19-59';
            case '60+': return 'age-60-plus';
            default: return '';
        }
    };

    const getStatusBadge = (hasRecord: boolean) => {
        if (hasRecord) {
            return <span className="badge badge-success">✅ สำรวจแล้ว</span>;
        }
        return <span className="badge badge-gray">⭕ ยังไม่สำรวจ</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div className="flex items-center gap-4">
                    <Link href="/volunteer" className="text-white/80 hover:text-white">
                        ← กลับ
                    </Link>
                    <div>
                        <h1 className="nav-title">บ้านเลขที่ {house?.house_number}</h1>
                        <p className="text-sm text-white/80">หมู่ที่ {house?.village_no}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container">
                {/* House Info Card */}
                <div className="card p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                🏠 ข้อมูลบ้าน
                            </h2>
                            <p className="text-gray-600">
                                บ้านเลขที่ {house?.house_number} หมู่ที่ {house?.village_no}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                👥 สมาชิกในบ้าน {residents.length} คน
                            </p>
                        </div>
                        <div>
                            <div className="text-4xl">🏡</div>
                        </div>
                    </div>

                    {/* GPS Section */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-2">📍 พิกัดบ้าน</h4>
                        {gps ? (
                            <div className="flex justify-between items-center">
                                <div className="text-green-700">
                                    <span className="font-medium">✅ บันทึกพิกัดแล้ว</span>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGetGPS}
                                    disabled={gpsLoading}
                                    className="btn btn-secondary text-sm py-2 px-3"
                                >
                                    🔄 อัปเดต
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleGetGPS}
                                disabled={gpsLoading}
                                className="btn btn-primary w-full"
                            >
                                {gpsLoading ? (
                                    <span className="flex items-center gap-2 justify-center">
                                        <div className="loading-spinner w-5 h-5"></div>
                                        กำลังดึงพิกัด...
                                    </span>
                                ) : (
                                    '📍 ดึงพิกัดปัจจุบัน (GPS)'
                                )}
                            </button>
                        )}
                    </div>

                    {/* Survey Progress */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">ความคืบหน้าการสำรวจ</span>
                            <span className="text-gray-800 font-medium">
                                {residents.filter(r => r.has_record).length}/{residents.length} คน
                            </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-teal-500 h-3 rounded-full transition-all"
                                style={{
                                    width: `${residents.length > 0 ? (residents.filter(r => r.has_record).length / residents.length) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Residents List */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        👥 เลือกบุคคลที่จะสำรวจ
                    </h3>

                    <div className="space-y-3">
                        {residents.map((resident) => (
                            <Link
                                key={resident.id}
                                href={`/survey/${resident.id}?houseId=${houseId}`}
                                className={`block p-4 bg-white hover:bg-teal-50 rounded-lg border-2 border-gray-100 hover:border-teal-300 transition-all ${getAgeGroupClass(resident.age_group)}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-800">
                                            {resident.prefix}{resident.first_name} {resident.last_name}
                                        </h4>
                                        <p className="text-gray-600 text-sm">
                                            {resident.relationship}
                                        </p>
                                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                            <span>🎂 อายุ {resident.age} ปี</span>
                                            <span>📅 เกิด {formatThaiDate(resident.birth_date)}</span>
                                        </div>
                                        <div className="mt-2">
                                            <span className={`badge ${resident.age_group === '0-5' ? 'bg-pink-100 text-pink-700' :
                                                resident.age_group === '6-14' ? 'bg-blue-100 text-blue-700' :
                                                    resident.age_group === '15-18' ? 'bg-purple-100 text-purple-700' :
                                                        resident.age_group === '19-59' ? 'bg-green-100 text-green-700' :
                                                            'bg-amber-100 text-amber-700'
                                                }`}>
                                                {getAgeGroupLabel(resident.age_group)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(resident.has_record)}
                                        <div className="mt-3">
                                            <span className="text-teal-600 text-sm font-medium">
                                                กรอกแบบฟอร์ม →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {residents.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>ไม่พบข้อมูลสมาชิกในบ้านนี้</p>
                        </div>
                    )}
                </div>

                {/* Age Group Legend */}
                <div className="card p-6 mt-6">
                    <h4 className="font-bold text-gray-800 mb-3">📊 กลุ่มอายุ</h4>
                    <div className="grid-3 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-pink-400 rounded"></div>
                            <span className="text-sm">0-5 ปี (เด็กเล็ก)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-400 rounded"></div>
                            <span className="text-sm">6-14 ปี (วัยเรียน)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-purple-400 rounded"></div>
                            <span className="text-sm">15-18 ปี (วัยรุ่น)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-400 rounded"></div>
                            <span className="text-sm">19-59 ปี (วัยทำงาน)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-400 rounded"></div>
                            <span className="text-sm">60+ ปี (ผู้สูงอายุ)</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
