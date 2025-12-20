'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
    const [stats, setStats] = useState({
        volunteers: 0,
        houses: 0,
        residents: 0,
        healthRecords: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [volunteersRes, housesRes, residentsRes, healthRes] = await Promise.all([
                    supabase.from('volunteers').select('id', { count: 'exact', head: true }),
                    supabase.from('houses').select('id', { count: 'exact', head: true }),
                    supabase.from('residents').select('id', { count: 'exact', head: true }),
                    supabase.from('health_records').select('id', { count: 'exact', head: true })
                ]);

                setStats({
                    volunteers: volunteersRes.count || 0,
                    houses: housesRes.count || 0,
                    residents: residentsRes.count || 0,
                    healthRecords: healthRes.count || 0
                });
            } catch (error) {
                console.error('Error loading stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600">
            {/* Hero Section */}
            <header className="relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute top-40 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-white rounded-full blur-3xl"></div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 container mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                                <Image src="/logo.jpg" alt="รพ.สต.มะตูม" width={48} height={48} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-xl">รพ.สต.มะตูม</h1>
                                <p className="text-white/70 text-sm">ตำบลมะตูม</p>
                            </div>
                        </div>
                        <Link
                            href="/login"
                            className="px-6 py-2 bg-white text-teal-600 font-semibold rounded-full hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl"
                        >
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </nav>

                {/* Hero Content */}
                <div className="relative z-10 container mx-auto px-6 py-20 text-center animate-fade-in">
                    <div className="inline-block mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-white text-sm font-medium">🏥 ระบบสาธารณสุขชุมชน ตำบลมะตูม</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                        ระบบแบบฟอร์ม<br />
                        <span className="text-yellow-300">ครอบครัวสุขภาพดี</span>
                    </h1>

                    <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                        ระบบบันทึกข้อมูลสุขภาพประชาชนในชุมชน ครอบคลุม 5 กลุ่มวัย
                        พร้อมติดตามผลสุขภาพแบบ Real-time
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-white text-teal-600 font-bold rounded-full hover:bg-yellow-300 hover:text-teal-700 transition-all shadow-xl hover:shadow-2xl text-lg flex items-center justify-center gap-2"
                        >
                            <span>🔐</span> เข้าสู่ระบบอาสาสมัคร
                        </Link>
                        <Link
                            href="/dashboard"
                            className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full hover:bg-white/30 transition-all text-lg flex items-center justify-center gap-2 border-2 border-white/50"
                        >
                            <span>📊</span> ดู Dashboard
                        </Link>
                    </div>
                </div>

                {/* Stats - Real-time from database */}
                <div className="relative z-10 container mx-auto px-6 pb-20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                            <div className="text-4xl font-bold text-white">
                                {loading ? '...' : stats.volunteers.toLocaleString()}
                            </div>
                            <div className="text-white/80 text-sm mt-2">👤 อาสาสมัคร</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                            <div className="text-4xl font-bold text-white">
                                {loading ? '...' : stats.houses.toLocaleString()}
                            </div>
                            <div className="text-white/80 text-sm mt-2">🏠 หลังคาเรือน</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                            <div className="text-4xl font-bold text-white">
                                {loading ? '...' : stats.residents.toLocaleString()}
                            </div>
                            <div className="text-white/80 text-sm mt-2">👥 ประชากร</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                            <div className="text-4xl font-bold text-white">
                                {loading ? '...' : stats.healthRecords.toLocaleString()}
                            </div>
                            <div className="text-white/80 text-sm mt-2">📋 สำรวจแล้ว</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section className="bg-white py-20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                            ฟีเจอร์หลักของระบบ
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            ระบบที่ออกแบบมาเพื่อ อสม. ใช้งานง่าย ครอบคลุมทุกกลุ่มวัย
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Feature 1 */}
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                👶
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">เด็กเล็ก 0-5 ปี</h3>
                            <p className="text-gray-600">
                                ติดตามน้ำหนัก ส่วนสูง พัฒนาการ การรับวัคซีน และยาน้ำเสริมธาตุเหล็ก
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                🎒
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">วัยเรียน 6-14 ปี</h3>
                            <p className="text-gray-600">
                                ติดตามเกณฑ์น้ำหนักส่วนสูง สุขภาพช่องปาก และพัฒนาการตามวัย
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                🧑
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">วัยรุ่น 15-18 ปี</h3>
                            <p className="text-gray-600">
                                คัดกรองพฤติกรรมเสี่ยง สุรา บุหรี่ และสารเสพติด
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                💼
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">วัยทำงาน 19-59 ปี</h3>
                            <p className="text-gray-600">
                                ติดตามโรคเรื้อรัง เบาหวาน ความดันโลหิตสูง และภาวะพึ่งพิง
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                👴
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">ผู้สูงอายุ 60+ ปี</h3>
                            <p className="text-gray-600">
                                แผนที่แสดงตำแหน่งและสถานะสุขภาพผู้สูงอายุ พร้อม GPS
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-8 rounded-3xl">
                            <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                                📊
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Dashboard สถิติ</h3>
                            <p className="text-gray-600">
                                ดูภาพรวมข้อมูลสุขภาพ สถิติตามกลุ่มวัย และความคืบหน้าการสำรวจ
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gray-900 py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        พร้อมเริ่มใช้งานระบบ?
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto mb-10">
                        เข้าสู่ระบบด้วยเลขบัตรประชาชน 13 หลัก เพื่อเริ่มบันทึกข้อมูลสุขภาพ
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-bold rounded-full hover:from-teal-500 hover:to-emerald-600 transition-all shadow-xl hover:shadow-2xl text-lg"
                    >
                        เข้าสู่ระบบ <span className="text-xl">→</span>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950 py-8">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-gray-500 text-sm">
                        © 2024 ระบบแบบฟอร์มครอบครัวสุขภาพดี | รพ.สต.มะตูม ตำบลมะตูม
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                        พัฒนาเพื่อชุมชน ❤️
                    </p>
                </div>
            </footer>
        </div>
    );
}
