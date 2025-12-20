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

export default function AdminHouses() {
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHouse, setEditingHouse] = useState<House | null>(null);
    const [formData, setFormData] = useState({ house_number: '', village_no: 6, volunteer_id: '' });
    const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>([]);
    const router = useRouter();
    const loadDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        const loadData = async () => {
            const [housesRes, volunteersRes] = await Promise.all([
                supabase.from('houses').select('*').order('house_number').limit(2000),
                supabase.from('volunteers').select('id, name').limit(500)
            ]);
            setHouses(housesRes.data || []);
            setVolunteers(volunteersRes.data || []);
            setLoading(false);
        };

        loadDataRef.current = loadData;

        if (typeof window !== 'undefined' && !localStorage.getItem('adminLoggedIn')) {
            router.push('/admin');
            return;
        }
        loadData();
    }, [router]);

    const filteredHouses = houses.filter(h =>
        h.house_number.includes(searchQuery)
    );

    const handleAdd = async () => {
        const { error } = await supabase.from('houses').insert({
            id: `h${Date.now()}`,
            house_number: formData.house_number,
            village_no: formData.village_no,
            volunteer_id: formData.volunteer_id
        });
        if (!error) {
            setShowAddModal(false);
            setFormData({ house_number: '', village_no: 6, volunteer_id: '' });
            loadDataRef.current?.();
        }
    };

    const handleEdit = async () => {
        if (!editingHouse) return;
        const { error } = await supabase.from('houses')
            .update({ house_number: formData.house_number, village_no: formData.village_no, volunteer_id: formData.volunteer_id })
            .eq('id', editingHouse.id);
        if (!error) {
            setEditingHouse(null);
            loadDataRef.current?.();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบ? (จะลบข้อมูลประชากรในบ้านด้วย)')) return;
        await supabase.from('houses').delete().eq('id', id);
        loadDataRef.current?.();
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
            <header className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">🏠 จัดการบ้าน</h1>
                        <p className="text-sm text-white/80">ทั้งหมด {houses.length} หลัง</p>
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
                        placeholder="🔍 ค้นหาเลขที่บ้าน..."
                        className="input flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        ➕ เพิ่มบ้าน
                    </button>
                </div>

                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-gray-700">บ้านเลขที่</th>
                                <th className="px-4 py-3 text-left text-gray-700">หมู่</th>
                                <th className="px-4 py-3 text-left text-gray-700">พิกัด GPS</th>
                                <th className="px-4 py-3 text-center text-gray-700">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHouses.map((h, i) => (
                                <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-gray-800 font-medium">{h.house_number}</td>
                                    <td className="px-4 py-3 text-gray-600">{h.village_no}</td>
                                    <td className="px-4 py-3 text-gray-600 text-sm">
                                        {h.latitude && h.longitude ? `${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => {
                                                setEditingHouse(h);
                                                setFormData({ house_number: h.house_number, village_no: h.village_no, volunteer_id: h.volunteer_id });
                                            }}
                                            className="text-blue-600 hover:underline mr-3"
                                        >
                                            ✏️ แก้ไข
                                        </button>
                                        <button onClick={() => handleDelete(h.id)} className="text-red-600 hover:underline">
                                            🗑️ ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="card p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">➕ เพิ่มบ้าน</h3>
                            <div className="space-y-4">
                                <input type="text" placeholder="บ้านเลขที่" className="input w-full"
                                    value={formData.house_number} onChange={(e) => setFormData({ ...formData, house_number: e.target.value })} />
                                <input type="number" placeholder="หมู่" className="input w-full"
                                    value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })} />
                                <select className="input w-full" value={formData.volunteer_id} onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}>
                                    <option value="">-- เลือกอาสาสมัคร --</option>
                                    {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleAdd} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingHouse && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="card p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">✏️ แก้ไขบ้าน</h3>
                            <div className="space-y-4">
                                <input type="text" placeholder="บ้านเลขที่" className="input w-full"
                                    value={formData.house_number} onChange={(e) => setFormData({ ...formData, house_number: e.target.value })} />
                                <input type="number" placeholder="หมู่" className="input w-full"
                                    value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })} />
                                <select className="input w-full" value={formData.volunteer_id} onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}>
                                    <option value="">-- เลือกอาสาสมัคร --</option>
                                    {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingHouse(null)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleEdit} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
