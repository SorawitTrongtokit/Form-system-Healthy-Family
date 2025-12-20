'use client';

import { useState, useEffect } from 'react';
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingResident, setEditingResident] = useState<Resident | null>(null);
    const [formData, setFormData] = useState({
        national_id: '', prefix: 'นาย', first_name: '', last_name: '',
        birth_date: '', gender: 'male', house_id: '', relationship: 'สมาชิก'
    });
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('adminLoggedIn')) {
            router.push('/admin');
            return;
        }
        loadData();
    }, [router]);

    async function loadData() {
        const [residentsRes, housesRes] = await Promise.all([
            supabase.from('residents').select('*').order('first_name'),
            supabase.from('houses').select('id, house_number, village_no')
        ]);
        setResidents(residentsRes.data || []);
        setHouses(housesRes.data || []);
        setLoading(false);
    }

    const filteredResidents = residents.filter(r =>
        `${r.first_name} ${r.last_name}`.includes(searchQuery) ||
        r.national_id.includes(searchQuery)
    );

    const handleAdd = async () => {
        const { error } = await supabase.from('residents').insert({
            id: `r${Date.now()}`,
            ...formData
        });
        if (!error) {
            setShowAddModal(false);
            setFormData({ national_id: '', prefix: 'นาย', first_name: '', last_name: '', birth_date: '', gender: 'male', house_id: '', relationship: 'สมาชิก' });
            loadData();
        }
    };

    const handleEdit = async () => {
        if (!editingResident) return;
        const { error } = await supabase.from('residents')
            .update(formData)
            .eq('id', editingResident.id);
        if (!error) {
            setEditingResident(null);
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบ?')) return;
        await supabase.from('health_records').delete().eq('resident_id', id);
        await supabase.from('residents').delete().eq('id', id);
        loadData();
    };

    const getHouseLabel = (houseId: string) => {
        const house = houses.find(h => h.id === houseId);
        return house ? `${house.house_number} (หมู่ ${house.village_no})` : '-';
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="loading-spinner"></div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">👥 จัดการประชากร</h1>
                        <p className="text-sm text-white/80">ทั้งหมด {residents.length} คน</p>
                    </div>
                    <Link href="/admin/dashboard" className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30">
                        ← กลับ Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto p-6">
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="🔍 ค้นหาชื่อหรือเลขบัตร..."
                        className="input flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        ➕ เพิ่มประชากร
                    </button>
                </div>

                <div className="card overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-gray-700">ชื่อ-นามสกุล</th>
                                <th className="px-4 py-3 text-left text-gray-700">อายุ</th>
                                <th className="px-4 py-3 text-left text-gray-700">กลุ่มวัย</th>
                                <th className="px-4 py-3 text-left text-gray-700">บ้านเลขที่</th>
                                <th className="px-4 py-3 text-left text-gray-700">ความสัมพันธ์</th>
                                <th className="px-4 py-3 text-center text-gray-700">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResidents.slice(0, 50).map((r, i) => {
                                const age = calculateAge(r.birth_date);
                                return (
                                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 text-gray-800">{r.prefix}{r.first_name} {r.last_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{age} ปี</td>
                                        <td className="px-4 py-3">
                                            <span className="badge badge-secondary">{getAgeGroup(age)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{getHouseLabel(r.house_id)}</td>
                                        <td className="px-4 py-3 text-gray-600">{r.relationship}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    setEditingResident(r);
                                                    setFormData({
                                                        national_id: r.national_id, prefix: r.prefix,
                                                        first_name: r.first_name, last_name: r.last_name,
                                                        birth_date: r.birth_date, gender: r.gender,
                                                        house_id: r.house_id, relationship: r.relationship
                                                    });
                                                }}
                                                className="text-blue-600 hover:underline mr-3"
                                            >
                                                ✏️
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline">
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredResidents.length > 50 && (
                        <p className="p-4 text-center text-gray-500">แสดง 50 จาก {filteredResidents.length} รายการ</p>
                    )}
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">➕ เพิ่มประชากร</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="เลขบัตรประชาชน" className="input col-span-2"
                                    value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                                <select className="input" value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}>
                                    <option value="นาย">นาย</option>
                                    <option value="นาง">นาง</option>
                                    <option value="นางสาว">นางสาว</option>
                                    <option value="เด็กชาย">เด็กชาย</option>
                                    <option value="เด็กหญิง">เด็กหญิง</option>
                                </select>
                                <select className="input" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="male">ชาย</option>
                                    <option value="female">หญิง</option>
                                </select>
                                <input type="text" placeholder="ชื่อ" className="input"
                                    value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                <input type="text" placeholder="นามสกุล" className="input"
                                    value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                                <input type="date" className="input col-span-2"
                                    value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                                <select className="input" value={formData.house_id} onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}>
                                    <option value="">-- เลือกบ้าน --</option>
                                    {houses.map(h => <option key={h.id} value={h.id}>{h.house_number} (หมู่ {h.village_no})</option>)}
                                </select>
                                <input type="text" placeholder="ความสัมพันธ์" className="input"
                                    value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleAdd} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingResident && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">✏️ แก้ไขประชากร</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <select className="input" value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}>
                                    <option value="นาย">นาย</option>
                                    <option value="นาง">นาง</option>
                                    <option value="นางสาว">นางสาว</option>
                                    <option value="เด็กชาย">เด็กชาย</option>
                                    <option value="เด็กหญิง">เด็กหญิง</option>
                                </select>
                                <select className="input" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="male">ชาย</option>
                                    <option value="female">หญิง</option>
                                </select>
                                <input type="text" placeholder="ชื่อ" className="input"
                                    value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                <input type="text" placeholder="นามสกุล" className="input"
                                    value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                                <input type="date" className="input col-span-2"
                                    value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                                <select className="input" value={formData.house_id} onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}>
                                    <option value="">-- เลือกบ้าน --</option>
                                    {houses.map(h => <option key={h.id} value={h.id}>{h.house_number} (หมู่ {h.village_no})</option>)}
                                </select>
                                <input type="text" placeholder="ความสัมพันธ์" className="input"
                                    value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingResident(null)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleEdit} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
