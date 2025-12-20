'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Volunteer {
    id: string;
    national_id: string;
    name: string;
    phone?: string;
}

interface House {
    id: string;
    house_number: string;
    village_no: number;
    volunteer_id: string;
}

export default function AdminVolunteers() {
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [houseSearchQuery, setHouseSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
    const [managingHousesForVolunteer, setManagingHousesForVolunteer] = useState<Volunteer | null>(null);
    const [formData, setFormData] = useState({ national_id: '', name: '', phone: '' });
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
            const [volunteersData, housesData] = await Promise.all([
                fetchAllRows<Volunteer>('volunteers', '*', 'name'),
                fetchAllRows<House>('houses', 'id, house_number, village_no, volunteer_id', 'house_number')
            ]);
            setVolunteers(volunteersData);
            setHouses(housesData);
            setLoading(false);
        };

        loadDataRef.current = loadData;

        if (typeof window !== 'undefined' && !localStorage.getItem('adminLoggedIn')) {
            router.push('/admin');
            return;
        }
        loadData();
    }, [router]);

    const filteredVolunteers = volunteers.filter(v =>
        v.name.includes(searchQuery) || v.national_id.includes(searchQuery)
    );

    const getVolunteerHouses = (volunteerId: string) => {
        return houses.filter(h => h.volunteer_id === volunteerId);
    };

    const getUnassignedHouses = () => {
        return houses.filter(h => !h.volunteer_id || h.volunteer_id === '');
    };

    const handleAdd = async () => {
        // Validate
        if (!formData.national_id || !formData.name) {
            alert('กรุณากรอกเลขบัตรประชาชนและชื่อ');
            return;
        }

        // Check duplicate
        const existing = volunteers.find(v => v.national_id === formData.national_id);
        if (existing) {
            alert(`เลขบัตรประชาชน ${formData.national_id} มีอยู่ในระบบแล้ว\nชื่อ: ${existing.name}`);
            return;
        }

        const { error } = await supabase.from('volunteers').insert({
            id: `v${Date.now()}`,
            national_id: formData.national_id,
            name: formData.name,
            phone: formData.phone || null
        });
        if (error) {
            console.error('Error adding volunteer:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
            return;
        }
        setShowAddModal(false);
        setFormData({ national_id: '', name: '', phone: '' });
        loadDataRef.current?.();
    };

    const handleEdit = async () => {
        if (!editingVolunteer) return;
        const { error } = await supabase.from('volunteers')
            .update({ name: formData.name, phone: formData.phone || null })
            .eq('id', editingVolunteer.id);
        if (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
            return;
        }
        setEditingVolunteer(null);
        loadDataRef.current?.();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบอาสาสมัครนี้?')) return;
        await supabase.from('volunteers').delete().eq('id', id);
        loadDataRef.current?.();
    };

    const handleAddHouse = async (houseId: string) => {
        if (!managingHousesForVolunteer) return;
        const { error } = await supabase.from('houses')
            .update({ volunteer_id: managingHousesForVolunteer.id })
            .eq('id', houseId);
        if (error) {
            alert('ไม่สามารถเพิ่มบ้านได้: ' + error.message);
            return;
        }
        loadDataRef.current?.();
    };

    const handleRemoveHouse = async (houseId: string) => {
        const { error } = await supabase.from('houses')
            .update({ volunteer_id: null })
            .eq('id', houseId);
        if (error) {
            alert('ไม่สามารถลบบ้านออกได้: ' + error.message);
            return;
        }
        loadDataRef.current?.();
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <span className="bg-white/20 p-2 rounded-xl">👨‍⚕️</span>
                                จัดการอาสาสมัคร
                            </h1>
                            <p className="text-white/80 mt-1">บริหารจัดการ อสม. และบ้านที่รับผิดชอบ</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="text-2xl font-bold">{volunteers.length}</div>
                                <div className="text-sm text-white/70">อาสาสมัคร</div>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-indigo-100">
                        <div className="text-3xl font-bold text-indigo-600">{volunteers.length}</div>
                        <div className="text-gray-500 text-sm">👨‍⚕️ อาสาสมัครทั้งหมด</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-green-100">
                        <div className="text-3xl font-bold text-green-600">{houses.length}</div>
                        <div className="text-gray-500 text-sm">🏠 บ้านทั้งหมด</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100">
                        <div className="text-3xl font-bold text-blue-600">{houses.filter(h => h.volunteer_id).length}</div>
                        <div className="text-gray-500 text-sm">✅ บ้านมี อสม.</div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-orange-100">
                        <div className="text-3xl font-bold text-orange-600">{getUnassignedHouses().length}</div>
                        <div className="text-gray-500 text-sm">⏳ บ้านว่าง</div>
                    </div>
                </div>

                {/* Search and Add */}
                <div className="bg-white rounded-2xl p-4 shadow-lg mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรือเลขบัตรประชาชน..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 justify-center font-medium"
                    >
                        ➕ เพิ่มอาสาสมัคร
                    </button>
                </div>

                {/* Volunteer Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVolunteers.map(v => {
                        const volunteerHouses = getVolunteerHouses(v.id);
                        return (
                            <div key={v.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-4 text-white">
                                    <h3 className="font-bold text-lg">{v.name}</h3>
                                    <p className="text-white/80 text-sm font-mono">{v.national_id}</p>
                                </div>

                                {/* Card Body */}
                                <div className="p-5">
                                    <div className="grid grid-cols-1 gap-4 mb-4">
                                        <div className="bg-indigo-50 rounded-lg p-3 text-center">
                                            <div className="text-xl font-bold text-indigo-600">{volunteerHouses.length}</div>
                                            <div className="text-xs text-gray-500">บ้านรับผิดชอบ</div>
                                        </div>
                                    </div>

                                    {v.phone && (
                                        <div className="flex items-center gap-2 text-gray-600 mb-4">
                                            <span>📞</span>
                                            <span>{v.phone}</span>
                                        </div>
                                    )}

                                    {/* Houses Tags */}
                                    {volunteerHouses.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 mb-2">บ้านที่รับผิดชอบ:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {volunteerHouses.slice(0, 6).map(h => (
                                                    <span key={h.id} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        {h.house_number}
                                                    </span>
                                                ))}
                                                {volunteerHouses.length > 6 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                                        +{volunteerHouses.length - 6}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setManagingHousesForVolunteer(v)}
                                            className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium flex items-center justify-center gap-1"
                                        >
                                            🏠 จัดการบ้าน
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingVolunteer(v);
                                                setFormData({ national_id: v.national_id, name: v.name, phone: v.phone || '' });
                                            }}
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(v.id)}
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

                {filteredVolunteers.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-500">ไม่พบอาสาสมัครที่ค้นหา</p>
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    ➕
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">เพิ่มอาสาสมัคร</h3>
                                    <p className="text-sm text-gray-500">กรอกข้อมูล อสม. ใหม่</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                                    <input type="text" placeholder="1234567890123" className="input w-full"
                                        value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                                    <input type="text" placeholder="นายสมชาย ใจดี" className="input w-full"
                                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label>
                                    <input type="text" placeholder="0812345678" className="input w-full"
                                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleAdd} className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingVolunteer && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    ✏️
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">แก้ไขข้อมูล</h3>
                                    <p className="text-sm text-gray-500">{editingVolunteer.name}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                                    <input type="text" className="input w-full" title="ชื่อ-นามสกุล"
                                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label>
                                    <input type="text" className="input w-full" title="โทรศัพท์"
                                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setEditingVolunteer(null)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleEdit} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Houses Modal */}
                {managingHousesForVolunteer && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-8 py-6 text-white">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <span className="bg-white/20 p-2 rounded-xl">🏠</span>
                                    จัดการบ้านที่รับผิดชอบ
                                </h3>
                                <p className="text-white/80 mt-1">อาสาสมัคร: {managingHousesForVolunteer.name}</p>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-hidden p-6">
                                <div className="grid md:grid-cols-2 gap-6 h-full">
                                    {/* Assigned Houses */}
                                    <div className="bg-green-50 rounded-2xl p-5 flex flex-col h-[400px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-green-800 text-lg">✅ บ้านที่รับผิดชอบ</h4>
                                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                                {getVolunteerHouses(managingHousesForVolunteer.id).length}
                                            </span>
                                        </div>
                                        <div className="overflow-y-auto flex-1 space-y-2">
                                            {getVolunteerHouses(managingHousesForVolunteer.id).map(h => (
                                                <div key={h.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                                                    <div>
                                                        <span className="font-bold text-gray-800">🏠 {h.house_number}</span>
                                                        <span className="text-gray-500 ml-2 text-sm">หมู่ {h.village_no}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveHouse(h.id)}
                                                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all text-sm font-medium"
                                                    >
                                                        ลบออก
                                                    </button>
                                                </div>
                                            ))}
                                            {getVolunteerHouses(managingHousesForVolunteer.id).length === 0 && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <div className="text-4xl mb-2">📭</div>
                                                    <p>ยังไม่มีบ้านที่รับผิดชอบ</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Available Houses */}
                                    <div className="bg-blue-50 rounded-2xl p-5 flex flex-col h-[400px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-blue-800 text-lg">🏘️ บ้านว่าง</h4>
                                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                                {getUnassignedHouses().length}
                                            </span>
                                        </div>
                                        <div className="relative mb-3">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                            <input
                                                type="text"
                                                placeholder="ค้นหาบ้านเลขที่..."
                                                className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                value={houseSearchQuery}
                                                onChange={(e) => setHouseSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 space-y-2">
                                            {getUnassignedHouses()
                                                .filter(h => h.house_number.includes(houseSearchQuery))
                                                .slice(0, 50)
                                                .map(h => (
                                                    <div key={h.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                                                        <div>
                                                            <span className="font-bold text-gray-800">🏠 {h.house_number}</span>
                                                            <span className="text-gray-500 ml-2 text-sm">หมู่ {h.village_no}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddHouse(h.id)}
                                                            className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all text-sm font-medium"
                                                        >
                                                            ➕ เพิ่ม
                                                        </button>
                                                    </div>
                                                ))}
                                            {getUnassignedHouses().filter(h => h.house_number.includes(houseSearchQuery)).length === 0 && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <div className="text-4xl mb-2">✅</div>
                                                    <p>ไม่มีบ้านว่าง</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => {
                                        setManagingHousesForVolunteer(null);
                                        setHouseSearchQuery('');
                                    }}
                                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 transition-all font-medium shadow-lg"
                                >
                                    ✅ เสร็จสิ้น
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
