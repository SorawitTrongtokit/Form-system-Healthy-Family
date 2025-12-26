import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require admin authentication
const PROTECTED_ROUTES = [
    '/admin/dashboard',
    '/admin/volunteers',
    '/admin/houses',
    '/admin/residents',
    '/export'
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the current path requires protection
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Check for admin session cookie
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const adminSession = request.cookies.get('admin-session')?.value;

    // If no valid session, redirect to admin login
    if (!accessToken || !adminSession) {
        const loginUrl = new URL('/admin', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Validate admin session hasn't expired
    try {
        const session = JSON.parse(adminSession);
        if (!session.expiresAt || session.expiresAt < Date.now()) {
            // Session expired, redirect to login
            const response = NextResponse.redirect(new URL('/admin', request.url));
            response.cookies.delete('sb-access-token');
            response.cookies.delete('sb-refresh-token');
            response.cookies.delete('admin-session');
            return response;
        }
    } catch {
        // Invalid session data, redirect to login
        const response = NextResponse.redirect(new URL('/admin', request.url));
        response.cookies.delete('admin-session');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/dashboard/:path*',
        '/admin/volunteers/:path*',
        '/admin/houses/:path*',
        '/admin/residents/:path*',
        '/export/:path*'
    ]
};
