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
    village_no: number;
}

export default function AdminVolunteers() {
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
    const [formData, setFormData] = useState({ national_id: '', name: '', phone: '', village_no: 6 });
    const router = useRouter();
    const loadDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        const loadVolunteers = async () => {
            const { data } = await supabase.from('volunteers').select('*').order('name');
            setVolunteers(data || []);
            setLoading(false);
        };

        loadDataRef.current = loadVolunteers;

        if (typeof window !== 'undefined' && !localStorage.getItem('adminLoggedIn')) {
            router.push('/admin');
            return;
        }
        loadVolunteers();
    }, [router]);

    const filteredVolunteers = volunteers.filter(v =>
        v.name.includes(searchQuery) || v.national_id.includes(searchQuery)
    );

    const handleAdd = async () => {
        const { error } = await supabase.from('volunteers').insert({
            id: `v${Date.now()}`,
            national_id: formData.national_id,
            name: formData.name,
            phone: formData.phone,
            village_no: formData.village_no
        });
        if (!error) {
            setShowAddModal(false);
            setFormData({ national_id: '', name: '', phone: '', village_no: 6 });
            loadDataRef.current?.();
        }
    };

    const handleEdit = async () => {
        if (!editingVolunteer) return;
        const { error } = await supabase.from('volunteers')
            .update({ name: formData.name, phone: formData.phone, village_no: formData.village_no })
            .eq('id', editingVolunteer.id);
        if (!error) {
            setEditingVolunteer(null);
            loadDataRef.current?.();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบ?')) return;
        await supabase.from('volunteers').delete().eq('id', id);
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
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">👨‍⚕️ จัดการอาสาสมัคร</h1>
                        <p className="text-sm text-white/80">ทั้งหมด {volunteers.length} คน</p>
                    </div>
                    <Link href="/admin/dashboard" className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30">
                        ← กลับ Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto p-6">
                {/* Search and Add */}
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="🔍 ค้นหาชื่อหรือเลขบัตร..."
                        className="input flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        ➕ เพิ่มอาสาสมัคร
                    </button>
                </div>

                {/* Table */}
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-gray-700">ชื่อ-นามสกุล</th>
                                <th className="px-4 py-3 text-left text-gray-700">เลขบัตรประชาชน</th>
                                <th className="px-4 py-3 text-left text-gray-700">หมู่</th>
                                <th className="px-4 py-3 text-left text-gray-700">โทรศัพท์</th>
                                <th className="px-4 py-3 text-center text-gray-700">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVolunteers.map((v, i) => (
                                <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-gray-800">{v.name}</td>
                                    <td className="px-4 py-3 text-gray-600 font-mono">{v.national_id}</td>
                                    <td className="px-4 py-3 text-gray-600">{v.village_no}</td>
                                    <td className="px-4 py-3 text-gray-600">{v.phone || '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => {
                                                setEditingVolunteer(v);
                                                setFormData({ national_id: v.national_id, name: v.name, phone: v.phone || '', village_no: v.village_no });
                                            }}
                                            className="text-blue-600 hover:underline mr-3"
                                        >
                                            ✏️ แก้ไข
                                        </button>
                                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:underline">
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
                            <h3 className="text-xl font-bold mb-4">➕ เพิ่มอาสาสมัคร</h3>
                            <div className="space-y-4">
                                <input type="text" placeholder="เลขบัตรประชาชน" className="input w-full"
                                    value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                                <input type="text" placeholder="ชื่อ-นามสกุล" className="input w-full"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                <input type="text" placeholder="โทรศัพท์" className="input w-full"
                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                <input type="number" placeholder="หมู่" className="input w-full"
                                    value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleAdd} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingVolunteer && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="card p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">✏️ แก้ไขอาสาสมัคร</h3>
                            <div className="space-y-4">
                                <input type="text" placeholder="ชื่อ-นามสกุล" className="input w-full"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                <input type="text" placeholder="โทรศัพท์" className="input w-full"
                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                <input type="number" placeholder="หมู่" className="input w-full"
                                    value={formData.village_no} onChange={(e) => setFormData({ ...formData, village_no: parseInt(e.target.value) })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingVolunteer(null)} className="btn btn-secondary flex-1">ยกเลิก</button>
                                <button onClick={handleEdit} className="btn btn-primary flex-1">บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
