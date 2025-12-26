import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Clear all session cookies
        const response = NextResponse.json({ success: true });

        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');
        response.cookies.delete('admin-session');

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
