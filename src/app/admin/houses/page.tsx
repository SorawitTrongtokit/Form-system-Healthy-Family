'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface House {
    id: string;
    house_number: string;
    village_no: number;
    volunteer_id: string;
    latitude?: number;
    longitude?: number;
}

interface Volunteer {
    id: string;
    name: string;
    phone?: string;
}

interface Resident {
    id: string;
    prefix: string;
    first_name: string;
    last_name: string;
    house_id: string;
    relationship: string;
}

export default function AdminHouses() {
    const [houses, setHouses] = useState<House[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');
    const [filterVillage, setFilterVillage] = useState<number>(0);
    const [filterVolunteer, setFilterVolunteer] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHouse, setEditingHouse] = useState<House | null>(null);
    const [viewingHouse, setViewingHouse] = useState<House | null>(null);
    const [formData, setFormData] = useState({ house_number: '', village_no: 6, volunteer_id: '' });
    const router = useRouter();
    const loadDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        async function fetchAllRows<T>(tableName: string, selectFields: string, orderBy?: string): Promise<T[]> {
            const PAGE_SIZE = 1000;
            let allData: T[] = [];
            let from = 0;
            let hasMore = true;

            while (hasMore) {
                let query = supabase.from(tableName).select(selectFields).range(from, from + PAGE_SIZE - 1);
                if (orderBy) query = query.order(orderBy);
                const { data, error } = await query;

                if (error) break;
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

        const loadData = async () => {
            const [housesData, volunteersData, residentsData] = await Promise.all([
                fetchAllRows<House>('houses', '*', 'house_number'),
                fetchAllRows<Volunteer>('volunteers', 'id, name, phone', 'name'),
                fetchAllRows<Resident>('residents', 'id, prefix, first_name, last_name, house_id, relationship', 'first_name')
            ]);
            setHouses(housesData);
            setVolunteers(volunteersData);
            setResidents(residentsData);
            setLoading(false);
        };

        loadDataRef.current = loadData;

        if (typeof window !== 'undefined' && !localStorage.getItem('adminLoggedIn')) {
            router.push('/admin');
            return;
        }
        loadData();
    }, [router]);

    // Get volunteer by ID
    const getVolunteer = (volunteerId: string) => {
        return volunteers.find(v => v.id === volunteerId);
    };

    // Get residents of a house
    const getHouseResidents = (houseId: string) => {
        return residents.filter(r => r.house_id === houseId);
    };

    // Filtered houses
    const filteredHouses = houses.filter(h => {
        const matchSearch = h.house_number.includes(searchQuery);
        const matchVillage = filterVillage === 0 || h.village_no === filterVillage;
        const matchVolunteer = filterVolunteer === 'all' ||
            (filterVolunteer === 'none' && !h.volunteer_id) ||
            h.volunteer_id === filterVolunteer;
        return matchSearch && matchVillage && matchVolunteer;
    });

    const handleAdd = async () => {
        // Validate required fields
        if (!formData.house_number) {
            alert('กรุณากรอกบ้านเลขที่');
            return;
        }

        // Check if house_number already exists
        const existingHouse = houses.find(h => h.house_number === formData.house_number && h.village_no === formData.village_no);
        if (existingHouse) {
            alert(`บ้านเลขที่ ${formData.house_number} หมู่ ${formData.village_no} มีอยู่ในระบบแล้ว`);
            return;
        }

        const { error } = await supabase.from('houses').insert({
            id: `h${Date.now()}`,
            house_number: formData.house_number,
            village_no: formData.village_no,
            volunteer_id: formData.volunteer_id || null
        });
        if (error) {
            console.error('Error adding house:', error);
            if (error.code === '23505') {
                alert('บ้านเลขที่นี้มีอยู่ในระบบแล้ว');
            } else {
                alert('เกิดข้อผิดพลาด: ' + error.message);
            }
            return;
        }
        setShowAddModal(false);
        setFormData({ house_number: '', village_no: 6, volunteer_id: '' });
        loadDataRef.current?.();
    };

    const handleEdit = async () => {
        if (!editingHouse) return;
        const { error } = await supabase.from('houses')
            .update({
                house_number: formData.house_number,
                village_no: formData.village_no,
                volunteer_id: formData.volunteer_id || null
            })
            .eq('id', editingHouse.id);
        if (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
            return;
        }
        setEditingHouse(null);
        loadDataRef.current?.();
    };

    const handleChangeVolunteer = async (houseId: string, volunteerId: string) => {
        await supabase.from('houses')
            .update({ volunteer_id: volunteerId || null })
            .eq('id', houseId);
        loadDataRef.current?.();
    };

    // Add resident to house
    const handleAddResident = async (residentId: string, houseId: string) => {
        await supabase.from('residents')
            .update({ house_id: houseId })
            .eq('id', residentId);
        loadDataRef.current?.();
    };

    // Remove resident from house (not delete, just unassign)
    const handleRemoveResident = async (residentId: string) => {
        // Try updating with null first, if fails try empty string
        let result = await supabase.from('residents')
            .update({ house_id: null })
            .eq('id', residentId);

        if (result.error) {
            // Try with empty string as fallback
            result = await supabase.from('residents')
                .update({ house_id: '' })
                .eq('id', residentId);
        }

        if (result.error) {
            console.error('Error removing resident from house:', result.error);
            alert('ไม่สามารถเอาคนออกจากบ้านได้\nError: ' + result.error.message + '\nCode: ' + result.error.code);
            return;
        }
        loadDataRef.current?.();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบบ้านนี้?')) return;
        await supabase.from('houses').delete().eq('id', id);
        loadDataRef.current?.();
    };

    // Get residents without a house
    const getUnassignedResidents = () => {
        return residents.filter(r => !r.house_id || r.house_id === '');
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-green-50">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-600 via-green-600 to-teal-700 text-white shadow-xl">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <span className="bg-white/20 p-2 rounded-xl">🏠</span>
                                จัดการบ้าน
                            </h1>
                            <p className="text-white/80 mt-1">จัดการข้อมูลบ้านและมอบหมาย อสม.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="text-2xl font-bold">{houses.length}</div>
                                <div className="text-sm text-white/70">บ้านทั้งหมด</div>
                            </div>
                            <Link
                                href="/admin/dashboard"
                                className="px-5 py-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-all flex items-center gap-2"
                            >
                                ← กลับ Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-teal-100">
                        <div className="text-3xl font-bold text-teal-600">{houses.length}</div>
                        <div className="text-gray-500 text-sm">🏠 บ้านทั้งหมด</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-green-100">
                        <div className="text-3xl font-bold text-green-600">{houses.filter(h => h.volunteer_id).length}</div>
                        <div className="text-gray-500 text-sm">✅ มี อสม. ดูแล</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-orange-100">
                        <div className="text-3xl font-bold text-orange-600">{houses.filter(h => !h.volunteer_id).length}</div>
                        <div className="text-gray-500 text-sm">⏳ ยังไม่มี อสม.</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100">
                        <div className="text-3xl font-bold text-blue-600">{residents.length}</div>
                        <div className="text-gray-500 text-sm">👥 ประชากรทั้งหมด</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-purple-100">
                        <div className="text-3xl font-bold text-purple-600">{volunteers.length}</div>
                        <div className="text-gray-500 text-sm">👨‍⚕️ อสม. ทั้งหมด</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="ค้นหาบ้านเลขที่..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            value={filterVillage}
                            onChange={(e) => setFilterVillage(Number(e.target.value))}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            title="เลือกหมู่"
                        >
                            <option value={0}>📍 ทุกหมู่</option>
                            {[1, 2, 3, 4, 5, 6].map(v => (
                                <option key={v} value={v}>หมู่ที่ {v}</option>
                            ))}
                        </select>
                        <select
                            value={filterVolunteer}
                            onChange={(e) => setFilterVolunteer(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            title="เลือก อสม."
                        >
                            <option value="all">👨‍⚕️ ทุก อสม.</option>
                            <option value="none">⏳ ยังไม่มี อสม.</option>
                            {volunteers.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl hover:from-teal-700 hover:to-green-700 transition-all shadow-lg flex items-center gap-2 justify-center font-medium"
                        >
                            ➕ เพิ่มบ้าน
                        </button>
                    </div>
                </div>

                {/* Results count */}
                <p className="text-gray-500 mb-4">แสดง {filteredHouses.length} จาก {houses.length} บ้าน</p>

                {/* House Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredHouses.slice(0, 100).map(h => {
                        const volunteer = getVolunteer(h.volunteer_id);
                        const houseResidents = getHouseResidents(h.id);
                        return (
                            <div key={h.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                                {/* Card Header */}
                                <div className={`px-4 py-3 text-white ${volunteer ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-gradient-to-r from-orange-400 to-red-400'}`}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-lg">🏠 {h.house_number}</h3>
                                        <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">หมู่ {h.village_no}</span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4">
                                    {/* Volunteer Info */}
                                    <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-1">👨‍⚕️ อสม. ดูแล</p>
                                        {volunteer ? (
                                            <p className="font-medium text-gray-800">{volunteer.name}</p>
                                        ) : (
                                            <p className="text-orange-500 font-medium">ยังไม่มี อสม. ดูแล</p>
                                        )}
                                    </div>

                                    {/* Residents Count */}
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-600 text-sm">👥 ประชากร</span>
                                        <span className="font-bold text-teal-600">{houseResidents.length} คน</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewingHouse(h)}
                                            className="flex-1 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all text-sm font-medium"
                                        >
                                            👁️ ดูรายละเอียด
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingHouse(h);
                                                setFormData({ house_number: h.house_number, village_no: h.village_no, volunteer_id: h.volunteer_id || '' });
                                            }}
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(h.id)}
                                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredHouses.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-500">ไม่พบบ้านที่ค้นหา</p>
                    </div>
                )}

                {filteredHouses.length > 100 && (
                    <div className="text-center py-6 text-gray-500">
                        แสดงเพียง 100 รายการแรก กรุณาใช้ตัวกรองเพื่อค้นหา
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    🏠
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">เพิ่มบ้าน</h3>
                                    <p className="text-sm text-gray-500">กรอกข้อมูลบ้านใหม่</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">บ้านเลขที่</label>
                                    <input type="text" placeholder="131" className="input w-full"
                                        value={formData.house_number} onChange={(e) => setFormData({ ...formData, house_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมู่ที่</label>
                                    <select className="input w-full" title="เลือกหมู่"
                                        value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })}>
                                        {[1, 2, 3, 4, 5, 6].map(v => (
                                            <option key={v} value={v}>หมู่ที่ {v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">อสม. ที่ดูแล (ถ้ามี)</label>
                                    <select className="input w-full" title="เลือก อสม."
                                        value={formData.volunteer_id} onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}>
                                        <option value="">-- ยังไม่มี อสม. --</option>
                                        {volunteers.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleAdd} className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl hover:from-teal-700 hover:to-green-700 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingHouse && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    ✏️
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลบ้าน</h3>
                                    <p className="text-sm text-gray-500">บ้านเลขที่ {editingHouse.house_number}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">บ้านเลขที่</label>
                                    <input type="text" className="input w-full" title="บ้านเลขที่"
                                        value={formData.house_number} onChange={(e) => setFormData({ ...formData, house_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมู่ที่</label>
                                    <select className="input w-full" title="เลือกหมู่"
                                        value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })}>
                                        {[1, 2, 3, 4, 5, 6].map(v => (
                                            <option key={v} value={v}>หมู่ที่ {v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เปลี่ยน อสม. ที่ดูแล</label>
                                    <select className="input w-full" title="เลือก อสม."
                                        value={formData.volunteer_id} onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}>
                                        <option value="">-- ยังไม่มี อสม. --</option>
                                        {volunteers.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setEditingHouse(null)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleEdit} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View House Detail Modal */}
                {viewingHouse && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-teal-500 to-green-500 px-8 py-6 text-white">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <span className="bg-white/20 p-2 rounded-xl">🏠</span>
                                    บ้านเลขที่ {viewingHouse.house_number}
                                </h3>
                                <p className="text-white/80 mt-1">หมู่ที่ {viewingHouse.village_no}</p>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Volunteer Assignment */}
                                <div className="bg-indigo-50 rounded-2xl p-5 mb-6">
                                    <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                                        👨‍⚕️ อสม. ที่รับผิดชอบ
                                        <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">1 บ้าน : 1 อสม.</span>
                                    </h4>

                                    {/* Current volunteer */}
                                    {getVolunteer(viewingHouse.volunteer_id) ? (
                                        <div className="flex items-center justify-between p-3 bg-white rounded-xl mb-3">
                                            <div>
                                                <p className="font-medium text-gray-800">{getVolunteer(viewingHouse.volunteer_id)?.name}</p>
                                                <p className="text-sm text-gray-500">📞 {getVolunteer(viewingHouse.volunteer_id)?.phone || 'ไม่ระบุ'}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    handleChangeVolunteer(viewingHouse.id, '');
                                                    setViewingHouse({ ...viewingHouse, volunteer_id: '' });
                                                }}
                                                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                                            >
                                                ❌ ยกเลิก
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-orange-50 rounded-xl mb-3 text-orange-600">
                                            ⚠️ ยังไม่มี อสม. ดูแล
                                        </div>
                                    )}

                                    {/* Search volunteer */}
                                    <div className="relative mb-2">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="ค้นหา อสม. ตามชื่อ..."
                                            className="w-full pl-10 pr-4 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                            value={volunteerSearchQuery}
                                            onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[150px] overflow-y-auto space-y-1 border border-indigo-100 rounded-xl p-2 bg-white">
                                        {volunteers
                                            .filter(v => v.name.includes(volunteerSearchQuery) || (v.phone && v.phone.includes(volunteerSearchQuery)))
                                            .slice(0, 20)
                                            .map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        handleChangeVolunteer(viewingHouse.id, v.id);
                                                        setViewingHouse({ ...viewingHouse, volunteer_id: v.id });
                                                        setVolunteerSearchQuery('');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${viewingHouse.volunteer_id === v.id
                                                        ? 'bg-indigo-500 text-white'
                                                        : 'hover:bg-indigo-50'
                                                        }`}
                                                >
                                                    {v.name} {v.phone ? `(${v.phone})` : ''}
                                                </button>
                                            ))}
                                        {volunteers.filter(v => v.name.includes(volunteerSearchQuery)).length === 0 && (
                                            <p className="text-center text-gray-400 py-2 text-sm">ไม่พบ อสม.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Residents List */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Current Residents */}
                                    <div className="bg-green-50 rounded-2xl p-5">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center justify-between">
                                            <span>✅ คนในบ้าน</span>
                                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                                                {getHouseResidents(viewingHouse.id).length} คน
                                            </span>
                                        </h4>
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                            {getHouseResidents(viewingHouse.id).map((r, i) => (
                                                <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                            {i + 1}
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-gray-800 text-sm">
                                                                {r.prefix}{r.first_name} {r.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{r.relationship}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveResident(r.id)}
                                                        className="px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all text-xs"
                                                        title="เอาออกจากบ้าน (ไม่ลบข้อมูล)"
                                                    >
                                                        ❌ ออก
                                                    </button>
                                                </div>
                                            ))}
                                            {getHouseResidents(viewingHouse.id).length === 0 && (
                                                <div className="text-center py-6 text-gray-400">
                                                    <div className="text-3xl mb-2">🏚️</div>
                                                    <p className="text-sm">ไม่มีคนในบ้าน</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Unassigned Residents */}
                                    <div className="bg-blue-50 rounded-2xl p-5">
                                        <h4 className="font-bold text-blue-800 mb-3 flex items-center justify-between">
                                            <span>👥 คนที่ยังไม่มีบ้าน</span>
                                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                                                {getUnassignedResidents().length} คน
                                            </span>
                                        </h4>
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                            {getUnassignedResidents().slice(0, 30).map(r => (
                                                <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-sm">
                                                            {r.prefix}{r.first_name} {r.last_name}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddResident(r.id, viewingHouse.id)}
                                                        className="px-2 py-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all text-xs"
                                                    >
                                                        ➕ เพิ่ม
                                                    </button>
                                                </div>
                                            ))}
                                            {getUnassignedResidents().length === 0 && (
                                                <div className="text-center py-6 text-gray-400">
                                                    <div className="text-3xl mb-2">✅</div>
                                                    <p className="text-sm">ไม่มีคนที่ไม่มีบ้าน</p>
                                                </div>
                                            )}
                                            {getUnassignedResidents().length > 30 && (
                                                <p className="text-center text-gray-400 text-xs">
                                                    แสดง 30 จาก {getUnassignedResidents().length} คน
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setViewingHouse(null)}
                                    className="px-8 py-3 bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-xl hover:from-teal-600 hover:to-green-600 transition-all font-medium shadow-lg"
                                >
                                    ✅ ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
