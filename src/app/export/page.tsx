'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { calculateAge, getAgeGroup } from '@/lib/calculations';

interface ExportData {
    residents: {
        id: string;
        name: string;
        national_id: string;
        age: number;
        ageGroup: string;
        gender: string;
        houseNumber: string;
        villageNo: number;
        relationship: string;
    }[];
    healthRecords: {
        residentName: string;
        houseNumber: string;
        villageNo: number;
        ageGroup: string;
        weight: number | null;
        height: number | null;
        bmi: number | null;
        passedCriteria: boolean | null;
        surveyDate: string | null;
    }[];
    stats: {
        ageGroup: string;
        total: number;
        surveyed: number;
        passed: number;
        failed: number;
    }[];
}

export default function ExportPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState<ExportData | null>(null);
    const [selectedVillage, setSelectedVillage] = useState<number>(1);

    // Check admin authentication via server API
    useEffect(() => {
        async function checkAuth() {
            try {
                const response = await fetch('/api/admin/session');
                const data = await response.json();
                if (!data.valid) {
                    router.push('/admin');
                    return;
                }
                setIsAdmin(true);
            } catch {
                router.push('/admin');
            }
            setCheckingAuth(false);
        }
        checkAuth();
    }, [router]);

    // Helper function to fetch all rows using pagination (Supabase limits to 1000 rows per request)
    async function fetchAllRows<T>(tableName: string, selectFields: string): Promise<T[]> {
        const PAGE_SIZE = 1000;
        let allData: T[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from(tableName)
                .select(selectFields)
                .range(from, from + PAGE_SIZE - 1);

            if (error) {
                console.error(`Error fetching ${tableName}:`, error);
                break;
            }

            if (data && data.length > 0) {
                allData = [...allData, ...(data as T[])];
                from += PAGE_SIZE;
                hasMore = data.length === PAGE_SIZE;
            } else {
                hasMore = false;
            }
        }

        return allData;
    }

    useEffect(() => {
        async function loadData() {
            // Fetch all residents with houses using pagination
            interface ResidentWithHouse {
                id: string;
                national_id: string;
                prefix: string;
                first_name: string;
                last_name: string;
                birth_date: string;
                gender: string;
                relationship: string;
                houses: { house_number: string; village_no: number } | null;
            }

            const residents = await fetchAllRows<ResidentWithHouse>('residents', '*, houses(*)');

            // Fetch health records using pagination
            const records = await fetchAllRows<{
                resident_id: string;
                weight: number;
                height: number;
                bmi: number | null;
                passed_criteria: boolean | null;
                age_group: string;
                created_at: string;
            }>('health_records', '*');

            if (!residents || residents.length === 0) {
                setLoading(false);
                return;
            }

            // Process residents
            const residentsList = residents.map(r => {
                const house = r.houses as { house_number: string; village_no: number } | null;
                const age = calculateAge(r.birth_date);
                return {
                    id: r.id,
                    name: `${r.prefix}${r.first_name} ${r.last_name}`,
                    national_id: r.national_id,
                    age,
                    ageGroup: getAgeGroup(age),
                    gender: r.gender === 'male' ? 'ชาย' : 'หญิง',
                    houseNumber: house?.house_number || '',
                    villageNo: house?.village_no || 6,
                    relationship: r.relationship
                };
            });

            // Process health records
            const recordMap = new Map((records || []).map(r => [r.resident_id, r]));
            const healthRecordsList = residents.map(r => {
                const record = recordMap.get(r.id);
                const age = calculateAge(r.birth_date);
                const house = r.houses as { house_number: string; village_no: number } | null;
                return {
                    residentName: `${r.prefix}${r.first_name} ${r.last_name}`,
                    houseNumber: house?.house_number || '',
                    villageNo: house?.village_no || 6,
                    ageGroup: getAgeGroup(age),
                    weight: record?.weight || null,
                    height: record?.height || null,
                    bmi: record?.bmi || null,
                    passedCriteria: record?.passed_criteria ?? null,
                    surveyDate: record?.created_at?.split('T')[0] || null
                };
            }).filter(r => r.weight !== null);

            // Calculate stats
            const ageGroups = ['0-5', '6-14', '15-18', '19-59', '60+'];
            const statsList = ageGroups.map(ag => {
                const inGroup = residentsList.filter(r => r.ageGroup === ag);
                const surveyed = (records || []).filter(r => {
                    const res = residentsList.find(res => res.id === r.resident_id);
                    return res?.ageGroup === ag;
                });
                const passed = surveyed.filter(r => r.passed_criteria === true).length;
                const failed = surveyed.filter(r => r.passed_criteria === false).length;
                return {
                    ageGroup: ag,
                    total: inGroup.length,
                    surveyed: surveyed.length,
                    passed,
                    failed
                };
            });

            setData({
                residents: residentsList,
                healthRecords: healthRecordsList,
                stats: statsList
            });
            setLoading(false);
        }

        // Only load data if admin is authenticated
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    // Export functions that filter by selected village (0 = all)
    const getFilteredData = (villageNo: number) => {
        if (!data) return { residents: [], records: [] };
        if (villageNo === 0) {
            return { residents: data.residents, records: data.healthRecords };
        }
        return {
            residents: data.residents.filter(r => r.villageNo === villageNo),
            records: data.healthRecords.filter(r => r.villageNo === villageNo)
        };
    };

    const exportResidentsByVillage = async (villageNo: number) => {
        if (!data) return;
        setExporting(true);

        // Dynamic import xlsx only when needed
        const XLSX = await import('xlsx');

        const { residents } = getFilteredData(villageNo);
        const suffix = villageNo === 0 ? 'ทั้งหมด' : `หมู่${villageNo}`;

        const ws = XLSX.utils.json_to_sheet(residents.map(r => ({
            'ชื่อ-นามสกุล': r.name,
            'เลขบัตรประชาชน': r.national_id,
            'อายุ': r.age,
            'กลุ่มวัย': r.ageGroup,
            'เพศ': r.gender,
            'บ้านเลขที่': r.houseNumber,
            'หมู่': r.villageNo,
            'ความสัมพันธ์': r.relationship
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลประชากร');
        XLSX.writeFile(wb, `ข้อมูลประชากร_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setExporting(false);
    };

    const exportHealthRecordsByVillage = async (villageNo: number) => {
        if (!data) return;
        setExporting(true);

        // Dynamic import xlsx only when needed
        const XLSX = await import('xlsx');

        const { records } = getFilteredData(villageNo);
        const suffix = villageNo === 0 ? 'ทั้งหมด' : `หมู่${villageNo}`;

        const ws = XLSX.utils.json_to_sheet(records.map(r => ({
            'ชื่อ-นามสกุล': r.residentName,
            'บ้านเลขที่': r.houseNumber,
            'หมู่': r.villageNo,
            'กลุ่มวัย': r.ageGroup,
            'น้ำหนัก (กก.)': r.weight,
            'ส่วนสูง (ซม.)': r.height,
            'BMI': r.bmi?.toFixed(2) || '',
            'ผลเกณฑ์': r.passedCriteria === true ? 'ผ่าน' : r.passedCriteria === false ? 'ไม่ผ่าน' : 'อื่นๆ',
            'วันที่สำรวจ': r.surveyDate
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ผลสำรวจสุขภาพ');
        XLSX.writeFile(wb, `ผลสำรวจสุขภาพ_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setExporting(false);
    };

    const exportStatsByVillage = async (villageNo: number) => {
        if (!data) return;
        setExporting(true);

        // Dynamic import xlsx only when needed
        const XLSX = await import('xlsx');

        const { residents, records } = getFilteredData(villageNo);
        const suffix = villageNo === 0 ? 'ทั้งหมด' : `หมู่${villageNo}`;

        const ageGroups = ['0-5', '6-14', '15-18', '19-59', '60+'];
        const stats = ageGroups.map(ag => {
            const inGroup = residents.filter(r => r.ageGroup === ag);
            const surveyed = records.filter(r => r.ageGroup === ag);
            const passed = surveyed.filter(r => r.passedCriteria === true).length;
            const failed = surveyed.filter(r => r.passedCriteria === false).length;
            return {
                'กลุ่มวัย': ag,
                'จำนวนประชากร': inGroup.length,
                'สำรวจแล้ว': surveyed.length,
                'ผ่านเกณฑ์': passed,
                'ไม่ผ่านเกณฑ์': failed,
                '% ครอบคลุม': inGroup.length > 0 ? `${Math.round((surveyed.length / inGroup.length) * 100)}%` : '0%'
            };
        });

        const ws = XLSX.utils.json_to_sheet(stats);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'สรุปสถิติ');
        XLSX.writeFile(wb, `สรุปสถิติ_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setExporting(false);
    };

    const exportAll = async () => {
        if (!data) return;
        setExporting(true);

        // Dynamic import xlsx only when needed
        const XLSX = await import('xlsx');

        const wb = XLSX.utils.book_new();

        // Sheet 1: Residents
        const ws1 = XLSX.utils.json_to_sheet(data.residents.map(r => ({
            'ชื่อ-นามสกุล': r.name,
            'เลขบัตรประชาชน': r.national_id,
            'อายุ': r.age,
            'กลุ่มวัย': r.ageGroup,
            'เพศ': r.gender,
            'บ้านเลขที่': r.houseNumber,
            'หมู่': r.villageNo,
            'ความสัมพันธ์': r.relationship
        })));
        XLSX.utils.book_append_sheet(wb, ws1, 'ข้อมูลประชากร');

        // Sheet 2: Health Records
        const ws2 = XLSX.utils.json_to_sheet(data.healthRecords.map(r => ({
            'ชื่อ-นามสกุล': r.residentName,
            'บ้านเลขที่': r.houseNumber,
            'หมู่': r.villageNo,
            'กลุ่มวัย': r.ageGroup,
            'น้ำหนัก (กก.)': r.weight,
            'ส่วนสูง (ซม.)': r.height,
            'BMI': r.bmi?.toFixed(2) || '',
            'ผลเกณฑ์': r.passedCriteria === true ? 'ผ่าน' : r.passedCriteria === false ? 'ไม่ผ่าน' : 'อื่นๆ',
            'วันที่สำรวจ': r.surveyDate
        })));
        XLSX.utils.book_append_sheet(wb, ws2, 'ผลสำรวจสุขภาพ');

        // Sheet 3: Stats
        const ws3 = XLSX.utils.json_to_sheet(data.stats.map(s => ({
            'กลุ่มวัย': s.ageGroup,
            'จำนวนประชากร': s.total,
            'สำรวจแล้ว': s.surveyed,
            'ผ่านเกณฑ์': s.passed,
            'ไม่ผ่านเกณฑ์': s.failed,
            '% ครอบคลุม': s.total > 0 ? `${Math.round((s.surveyed / s.total) * 100)}%` : '0%'
        })));
        XLSX.utils.book_append_sheet(wb, ws3, 'สรุปสถิติ');

        XLSX.writeFile(wb, `รายงานสุขภาพ_${new Date().toISOString().split('T')[0]}.xlsx`);
        setExporting(false);
    };

    // Show loading while checking authentication
    if (checkingAuth) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </main>
        );
    }

    // Don't render if not admin (will redirect)
    if (!isAdmin) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <p className="text-gray-500">กรุณาเข้าสู่ระบบ Admin</p>
                </div>
            </main>
        );
    }

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
            <header className="nav-header">
                <div>
                    <h1 className="nav-title">📥 Export ข้อมูล</h1>
                    <p className="text-sm text-white/80">ดาวน์โหลดข้อมูลเป็นไฟล์ Excel</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="nav-link">
                        📊 Dashboard
                    </Link>
                    <Link href="/volunteer" className="nav-link">
                        🏠 หน้าหลัก
                    </Link>
                </div>
            </header>

            <main className="container py-8">
                {/* Summary */}
                <div className="card p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📊 ข้อมูลที่พร้อม Export</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{data?.residents.length || 0}</div>
                            <div className="text-sm text-blue-700">👥 ประชากร</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{data?.healthRecords.length || 0}</div>
                            <div className="text-sm text-green-700">📝 สำรวจแล้ว</div>
                        </div>
                        <div className="text-center p-4 bg-teal-50 rounded-lg">
                            <div className="text-2xl font-bold text-teal-600">{data?.stats.reduce((s, a) => s + a.passed, 0) || 0}</div>
                            <div className="text-sm text-teal-700">✅ ผ่านเกณฑ์</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{data?.stats.reduce((s, a) => s + a.failed, 0) || 0}</div>
                            <div className="text-sm text-red-700">❌ ไม่ผ่านเกณฑ์</div>
                        </div>
                    </div>
                </div>

                {/* Export Options */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Export by Village Selection */}
                    <div className="card p-6">
                        <h3 className="font-bold text-gray-800 mb-4">🏘️ Export แยกหมู่</h3>

                        {/* Village Selector */}
                        <div className="mb-6">
                            <label className="form-label">เลือกหมู่ที่ต้องการ</label>
                            <select
                                value={selectedVillage}
                                onChange={(e) => setSelectedVillage(Number(e.target.value))}
                                className="input"
                                title="เลือกหมู่"
                            >
                                <option value={0}>📍 ทุกหมู่ ({data?.residents.length || 0} คน)</option>
                                {[1, 2, 3, 4, 5, 6].map(v => (
                                    <option key={v} value={v}>
                                        หมู่ที่ {v} ({data?.residents.filter(r => r.villageNo === v).length || 0} คน)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selected village info */}
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                            <p className="text-sm text-gray-600">
                                📊 ข้อมูลที่เลือก: <span className="font-bold text-gray-800">
                                    {selectedVillage === 0 ? 'ทุกหมู่' : `หมู่ที่ ${selectedVillage}`}
                                </span>
                            </p>
                            <p className="text-sm text-gray-500">
                                จำนวน {getFilteredData(selectedVillage).residents.length} คน,
                                สำรวจแล้ว {getFilteredData(selectedVillage).records.length} คน
                            </p>
                        </div>

                        {/* Export buttons for selected village */}
                        <div className="space-y-3">
                            <button
                                onClick={() => exportResidentsByVillage(selectedVillage)}
                                disabled={exporting}
                                className="w-full btn btn-secondary flex items-center justify-center gap-2"
                            >
                                👥 ข้อมูลประชากร
                            </button>
                            <button
                                onClick={() => exportHealthRecordsByVillage(selectedVillage)}
                                disabled={exporting}
                                className="w-full btn btn-secondary flex items-center justify-center gap-2"
                            >
                                📋 ผลสำรวจสุขภาพ
                            </button>
                            <button
                                onClick={() => exportStatsByVillage(selectedVillage)}
                                disabled={exporting}
                                className="w-full btn btn-secondary flex items-center justify-center gap-2"
                            >
                                � สรุปสถิติ
                            </button>
                        </div>
                    </div>

                    {/* All-in-one Export */}
                    <div className="card p-6" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
                        <h3 className="font-bold mb-4" style={{ color: 'white' }}>📦 Export ทั้งหมด</h3>
                        <p className="mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            ดาวน์โหลดไฟล์ Excel เดียวที่มีทุก Sheet
                            (ประชากร, ผลสำรวจ, สรุปสถิติ)
                        </p>
                        <button
                            onClick={exportAll}
                            disabled={exporting}
                            className="w-full py-4 bg-white text-teal-600 font-bold rounded-xl hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {exporting ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    กำลัง Export...
                                </>
                            ) : (
                                <>📥 ดาวน์โหลดทั้งหมด</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Table */}
                <div className="card p-6 mt-6">
                    <h3 className="font-bold text-gray-800 mb-4">👀 ตัวอย่างข้อมูล (10 รายการแรก)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-4 py-2 text-left text-gray-700">ชื่อ-นามสกุล</th>
                                    <th className="px-4 py-2 text-left text-gray-700">อายุ</th>
                                    <th className="px-4 py-2 text-left text-gray-700">กลุ่มวัย</th>
                                    <th className="px-4 py-2 text-left text-gray-700">บ้านเลขที่</th>
                                    <th className="px-4 py-2 text-left text-gray-700">หมู่</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.residents.slice(0, 10).map((r, i) => (
                                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-2 text-gray-800">{r.name}</td>
                                        <td className="px-4 py-2 text-gray-600">{r.age} ปี</td>
                                        <td className="px-4 py-2 text-gray-600">{r.ageGroup}</td>
                                        <td className="px-4 py-2 text-gray-600">{r.houseNumber}</td>
                                        <td className="px-4 py-2 text-gray-600">{r.villageNo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
