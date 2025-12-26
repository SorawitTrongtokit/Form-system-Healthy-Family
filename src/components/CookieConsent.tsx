'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if user has already accepted cookies
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Wait a bit before showing to not interrupt page load
            const timer = setTimeout(() => setShowBanner(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        localStorage.setItem('cookie-consent-date', new Date().toISOString());
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 shadow-lg">
            <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🍪</span>
                    <div>
                        <p className="text-white text-sm">
                            เว็บไซต์นี้ใช้คุกกี้เพื่อจำสถานะการเข้าสู่ระบบและปรับปรุงประสบการณ์การใช้งาน
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                            ดูรายละเอียดเพิ่มเติมที่{' '}
                            <Link href="/privacy" className="text-blue-400 hover:underline">
                                นโยบายความเป็นส่วนตัว
                            </Link>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={acceptCookies}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        ยอมรับ
                    </button>
                </div>
            </div>
        </div>
    );
}
