'use client';

import { useState } from 'react';
import { maskNationalId, formatNationalId } from '@/lib/national-id';

interface MaskedNationalIdProps {
    nationalId: string | null | undefined;
    /** Allow admin to reveal full ID */
    allowReveal?: boolean;
    /** Optional className */
    className?: string;
}

/**
 * Masked National ID Display Component
 * - Default: แสดง masked ID (1-2345-XXXXX-12-3)
 * - allowReveal: มีปุ่มกดเพื่อดูเลขเต็ม (สำหรับ Admin)
 */
export function MaskedNationalId({
    nationalId,
    allowReveal = false,
    className = ''
}: MaskedNationalIdProps) {
    const [isRevealed, setIsRevealed] = useState(false);

    if (!nationalId) {
        return <span className={`text-gray-400 ${className}`}>-</span>;
    }

    const displayValue = isRevealed
        ? formatNationalId(nationalId)
        : maskNationalId(nationalId);

    return (
        <span className={`font-mono inline-flex items-center gap-2 ${className}`}>
            <span>{displayValue}</span>
            {allowReveal && (
                <button
                    type="button"
                    onClick={() => setIsRevealed(!isRevealed)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={isRevealed ? 'ซ่อนเลขบัตร' : 'ดูเลขบัตรเต็ม'}
                >
                    {isRevealed ? (
                        // Eye-off icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        // Eye icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            )}
        </span>
    );
}
