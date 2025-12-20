'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateAge, getAgeGroup } from '@/lib/calculations';

interface Resident {
    id: string;
    national_id: string;
    prefix: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: string;
    house_id: string;
    relationship: string;
}

interface House {
    id: string;
    house_number: string;
    village_no: number;
}

export default function AdminResidents() {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAgeGroup, setFilterAgeGroup] = useState<string>('all');
    const [filterGender, setFilterGender] = useState<string>('all');
    const [filterHouse, setFilterHouse] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingResident, setEditingResident] = useState<Resident | null>(null);
    const [viewingResident, setViewingResident] = useState<Resident | null>(null);
    const [formData, setFormData] = useState({
        national_id: '', prefix: 'นาย', first_name: '', last_name: '',
        birth_date: '', gender: 'male', house_id: '', relationship: 'สมาชิก'
    });
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
            const [residentsData, housesData] = await Promise.all([
                fetchAllRows<Resident>('residents', '*', 'first_name'),
                fetchAllRows<House>('houses', 'id, house_number, village_no', 'house_number')
            ]);
            setResidents(residentsData);
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

    // Get house by ID
    const getHouse = (houseId: string) => houses.find(h => h.id === houseId);

    // Filter residents
    const filteredResidents = residents.filter(r => {
        const matchSearch = `${r.first_name} ${r.last_name}`.includes(searchQuery) || r.national_id.includes(searchQuery);
        const age = calculateAge(r.birth_date);
        const ageGroup = getAgeGroup(age);
        const matchAgeGroup = filterAgeGroup === 'all' || ageGroup === filterAgeGroup;
        const matchGender = filterGender === 'all' || r.gender === filterGender;
        const matchHouse = filterHouse === 'all' ||
            (filterHouse === 'none' && !r.house_id) ||
            r.house_id === filterHouse;
        return matchSearch && matchAgeGroup && matchGender && matchHouse;
    });

    // Stats
    const ageGroups = ['0-5', '6-14', '15-18', '19-59', '60+'];
    const getAgeGroupCount = (ag: string) => residents.filter(r => getAgeGroup(calculateAge(r.birth_date)) === ag).length;

    const handleAdd = async () => {
        // Validate required fields
        if (!formData.national_id || !formData.first_name || !formData.last_name || !formData.birth_date) {
            alert('กรุณากรอกข้อมูลให้ครบ: เลขบัตรประชาชน, ชื่อ, นามสกุล, วันเกิด');
            return;
        }

        // Check if national_id already exists
        const existingResident = residents.find(r => r.national_id === formData.national_id);
        if (existingResident) {
            alert(`เลขบัตรประชาชน ${formData.national_id} มีอยู่ในระบบแล้ว\nชื่อ: ${existingResident.first_name} ${existingResident.last_name}`);
            return;
        }

        const { error } = await supabase.from('residents').insert({
            id: `r${Date.now()}`,
            national_id: formData.national_id,
            prefix: formData.prefix,
            first_name: formData.first_name,
            last_name: formData.last_name,
            birth_date: formData.birth_date,
            gender: formData.gender,
            house_id: formData.house_id || null,
            relationship: formData.relationship
        });
        if (error) {
            if (error.code === '23505') {
                alert('เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว');
            } else {
                alert('เกิดข้อผิดพลาด: ' + error.message);
            }
            return;
        }
        setShowAddModal(false);
        setFormData({ national_id: '', prefix: 'นาย', first_name: '', last_name: '', birth_date: '', gender: 'male', house_id: '', relationship: 'สมาชิก' });
        loadDataRef.current?.();
    };

    const handleEdit = async () => {
        if (!editingResident) return;
        const { error } = await supabase.from('residents')
            .update(formData)
            .eq('id', editingResident.id);
        if (!error) {
            setEditingResident(null);
            loadDataRef.current?.();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบประชากรนี้? (ข้อมูลสุขภาพที่เกี่ยวข้องจะถูกลบด้วย)')) return;

        // First delete any health records for this resident
        await supabase.from('health_records').delete().eq('resident_id', id);

        // Then delete the resident
        const { error } = await supabase.from('residents').delete().eq('id', id);
        if (error) {
            alert('ไม่สามารถลบได้: ' + error.message);
            return;
        }
        loadDataRef.current?.();
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <span className="bg-white/20 p-2 rounded-xl">👥</span>
                                จัดการประชากร
                            </h1>
                            <p className="text-white/80 mt-1">จัดการข้อมูลประชากรทั้งหมด</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="text-2xl font-bold">{residents.length}</div>
                                <div className="text-sm text-white/70">ประชากร</div>
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
                {/* Stats by Age Group */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                    {ageGroups.map(ag => (
                        <button
                            key={ag}
                            onClick={() => setFilterAgeGroup(filterAgeGroup === ag ? 'all' : ag)}
                            className={`rounded-2xl p-4 shadow-lg transition-all ${filterAgeGroup === ag
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white scale-105'
                                : 'bg-white border border-gray-100 hover:shadow-xl'
                                }`}
                        >
                            <div className={`text-2xl font-bold ${filterAgeGroup === ag ? 'text-white' : 'text-blue-600'}`}>
                                {getAgeGroupCount(ag)}
                            </div>
                            <div className={`text-sm ${filterAgeGroup === ag ? 'text-white/80' : 'text-gray-500'}`}>
                                {ag} ปี
                            </div>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
                    <div className="grid md:grid-cols-5 gap-4">
                        <div className="relative md:col-span-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อหรือเลขบัตร..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            title="เลือกเพศ"
                        >
                            <option value="all">👤 ทุกเพศ</option>
                            <option value="male">👨 ชาย</option>
                            <option value="female">👩 หญิง</option>
                        </select>
                        <select
                            value={filterHouse}
                            onChange={(e) => setFilterHouse(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            title="เลือกบ้าน"
                        >
                            <option value="all">🏠 ทุกบ้าน</option>
                            <option value="none">❓ ไม่มีบ้าน</option>
                        </select>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2 justify-center font-medium"
                        >
                            ➕ เพิ่มประชากร
                        </button>
                    </div>
                </div>

                {/* Results count */}
                <p className="text-gray-500 mb-4">แสดง {Math.min(filteredResidents.length, 100)} จาก {filteredResidents.length} คน</p>

                {/* Resident Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredResidents.slice(0, 100).map(r => {
                        const age = calculateAge(r.birth_date);
                        const ageGroup = getAgeGroup(age);
                        const house = getHouse(r.house_id);

                        return (
                            <div key={r.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                                {/* Card Header */}
                                <div className={`px-4 py-3 text-white ${r.gender === 'male'
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                    : 'bg-gradient-to-r from-pink-500 to-rose-500'
                                    }`}>
                                    <h3 className="font-bold text-lg truncate">
                                        {r.prefix}{r.first_name} {r.last_name}
                                    </h3>
                                    <p className="text-white/80 text-sm font-mono">{r.national_id}</p>
                                </div>

                                {/* Card Body */}
                                <div className="p-4">
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                            <div className="font-bold text-gray-700">{age} ปี</div>
                                            <div className="text-xs text-gray-500">อายุ</div>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                                            <div className="font-bold text-blue-600">{ageGroup}</div>
                                            <div className="text-xs text-gray-500">กลุ่มวัย</div>
                                        </div>
                                    </div>

                                    {house ? (
                                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                                            <span>🏠</span>
                                            <span>บ้านเลขที่ {house.house_number} (หมู่ {house.village_no})</span>
                                        </div>
                                    ) : (
                                        <div className="text-orange-500 text-sm mb-3">
                                            ⚠️ ยังไม่มีบ้าน
                                        </div>
                                    )}

                                    <div className="text-xs text-gray-500 mb-3">
                                        ความสัมพันธ์: {r.relationship}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewingResident(r)}
                                            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
                                        >
                                            👁️ ดูข้อมูล
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingResident(r);
                                                setFormData({
                                                    national_id: r.national_id,
                                                    prefix: r.prefix,
                                                    first_name: r.first_name,
                                                    last_name: r.last_name,
                                                    birth_date: r.birth_date,
                                                    gender: r.gender,
                                                    house_id: r.house_id || '',
                                                    relationship: r.relationship
                                                });
                                            }}
                                            className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-sm"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id)}
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

                {filteredResidents.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-500">ไม่พบประชากรที่ค้นหา</p>
                    </div>
                )}

                {filteredResidents.length > 100 && (
                    <div className="text-center py-6 text-gray-500">
                        แสดงเพียง 100 รายการแรก กรุณาใช้ตัวกรองเพื่อค้นหา
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    👤
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">เพิ่มประชากร</h3>
                                    <p className="text-sm text-gray-500">กรอกข้อมูลประชากรใหม่</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                                    <input type="text" placeholder="1234567890123" className="input w-full"
                                        value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                        <select className="input w-full" title="คำนำหน้า"
                                            value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}>
                                            <option value="นาย">นาย</option>
                                            <option value="นาง">นาง</option>
                                            <option value="นางสาว">นางสาว</option>
                                            <option value="เด็กชาย">เด็กชาย</option>
                                            <option value="เด็กหญิง">เด็กหญิง</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                                        <input type="text" placeholder="ชื่อ" className="input w-full"
                                            value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                                        <input type="text" placeholder="นามสกุล" className="input w-full"
                                            value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                                        <input type="date" className="input w-full" title="วันเกิด"
                                            value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                                        <select className="input w-full" title="เพศ"
                                            value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="male">ชาย</option>
                                            <option value="female">หญิง</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">บ้าน</label>
                                    <select className="input w-full" title="เลือกบ้าน"
                                        value={formData.house_id} onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}>
                                        <option value="">-- ยังไม่มีบ้าน --</option>
                                        {houses.map(h => (
                                            <option key={h.id} value={h.id}>บ้านเลขที่ {h.house_number} (หมู่ {h.village_no})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ความสัมพันธ์</label>
                                    <select className="input w-full" title="ความสัมพันธ์"
                                        value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}>
                                        <option value="หัวหน้าครัวเรือน">หัวหน้าครัวเรือน</option>
                                        <option value="คู่สมรส">คู่สมรส</option>
                                        <option value="บุตร">บุตร</option>
                                        <option value="พ่อ/แม่">พ่อ/แม่</option>
                                        <option value="ปู่/ย่า/ตา/ยาย">ปู่/ย่า/ตา/ยาย</option>
                                        <option value="สมาชิก">สมาชิก</option>
                                        <option value="อื่นๆ">อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleAdd} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingResident && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-white text-xl">
                                    ✏️
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">แก้ไขข้อมูล</h3>
                                    <p className="text-sm text-gray-500">{editingResident.first_name} {editingResident.last_name}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน</label>
                                    <input type="text" className="input w-full" title="เลขบัตรประชาชน"
                                        value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                        <select className="input w-full" title="คำนำหน้า"
                                            value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}>
                                            <option value="นาย">นาย</option>
                                            <option value="นาง">นาง</option>
                                            <option value="นางสาว">นางสาว</option>
                                            <option value="เด็กชาย">เด็กชาย</option>
                                            <option value="เด็กหญิง">เด็กหญิง</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                                        <input type="text" className="input w-full" title="ชื่อ"
                                            value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                                        <input type="text" className="input w-full" title="นามสกุล"
                                            value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                                        <input type="date" className="input w-full" title="วันเกิด"
                                            value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                                        <select className="input w-full" title="เพศ"
                                            value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="male">ชาย</option>
                                            <option value="female">หญิง</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">บ้าน</label>
                                    <select className="input w-full" title="เลือกบ้าน"
                                        value={formData.house_id} onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}>
                                        <option value="">-- ยังไม่มีบ้าน --</option>
                                        {houses.map(h => (
                                            <option key={h.id} value={h.id}>บ้านเลขที่ {h.house_number} (หมู่ {h.village_no})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ความสัมพันธ์</label>
                                    <select className="input w-full" title="ความสัมพันธ์"
                                        value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}>
                                        <option value="หัวหน้าครัวเรือน">หัวหน้าครัวเรือน</option>
                                        <option value="คู่สมรส">คู่สมรส</option>
                                        <option value="บุตร">บุตร</option>
                                        <option value="พ่อ/แม่">พ่อ/แม่</option>
                                        <option value="ปู่/ย่า/ตา/ยาย">ปู่/ย่า/ตา/ยาย</option>
                                        <option value="สมาชิก">สมาชิก</option>
                                        <option value="อื่นๆ">อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setEditingResident(null)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                    ยกเลิก
                                </button>
                                <button onClick={handleEdit} className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all font-medium">
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Resident Modal */}
                {viewingResident && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                            {/* Modal Header */}
                            <div className={`px-8 py-6 text-white ${viewingResident.gender === 'male'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                : 'bg-gradient-to-r from-pink-500 to-rose-500'
                                }`}>
                                <h3 className="text-2xl font-bold">
                                    {viewingResident.prefix}{viewingResident.first_name} {viewingResident.last_name}
                                </h3>
                                <p className="text-white/80 font-mono">{viewingResident.national_id}</p>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-gray-800">{calculateAge(viewingResident.birth_date)}</div>
                                        <div className="text-sm text-gray-500">อายุ (ปี)</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-blue-600">{getAgeGroup(calculateAge(viewingResident.birth_date))}</div>
                                        <div className="text-sm text-gray-500">กลุ่มวัย</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-gray-500">เพศ</span>
                                        <span className="font-medium">{viewingResident.gender === 'male' ? '👨 ชาย' : '👩 หญิง'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-gray-500">วันเกิด</span>
                                        <span className="font-medium">{viewingResident.birth_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-gray-500">ความสัมพันธ์</span>
                                        <span className="font-medium">{viewingResident.relationship}</span>
                                    </div>
                                    {getHouse(viewingResident.house_id) ? (
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                            <span className="text-gray-500">🏠 บ้าน</span>
                                            <span className="font-medium text-green-700">
                                                เลขที่ {getHouse(viewingResident.house_id)?.house_number} (หมู่ {getHouse(viewingResident.house_id)?.village_no})
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                                            <span className="text-gray-500">🏠 บ้าน</span>
                                            <span className="font-medium text-orange-600">ยังไม่มีบ้าน</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setViewingResident(null)}
                                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-medium shadow-lg"
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
