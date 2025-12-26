import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';

// Config
const MAX_ATTEMPTS = 5;
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

export async function POST(request: NextRequest) {
    const ip = getClientIP(request);
    const ipKey = `admin:${ip}`;

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        return NextResponse.json(
            { success: false, error: 'ระบบมีปัญหา กรุณาติดต่อผู้ดูแล' },
            { status: 500 }
        );
    }

    // Service client for rate limiting
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if IP is locked
    const lockStatus = await checkRateLimit(serviceClient, ipKey, MAX_ATTEMPTS);
    if (!lockStatus.allowed) {
        return NextResponse.json(
            {
                success: false,
                error: `บัญชีถูกล็อคเนื่องจากพยายามเข้าสู่ระบบผิดพลาดหลายครั้ง กรุณารอ ${lockStatus.remainingTime} นาที`
            },
            { status: 429 }
        );
    }

    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'กรุณากรอก Email และรหัสผ่าน' },
                { status: 400 }
            );
        }

        // Create Supabase client for authentication
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.session) {
            // Record failed attempt
            const result = await recordFailedAttempt(serviceClient, ipKey, MAX_ATTEMPTS);

            if (result.locked) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'พยายามเข้าสู่ระบบผิดพลาดหลายครั้ง บัญชีถูกล็อค 15 นาที'
                    },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: `Email หรือรหัสผ่านไม่ถูกต้อง (เหลือ ${result.attemptsLeft} ครั้ง)`
                },
                { status: 401 }
            );
        }

        // Clear failed attempts on successful login
        await clearAttempts(serviceClient, ipKey);

        // Create session data
        const sessionData = {
            loggedIn: true,
            loginTime: Date.now(),
            expiresAt: Date.now() + SESSION_DURATION,
            email: data.user.email
        };

        // Create response with cookies
        const response = NextResponse.json({
            success: true,
            user: {
                email: data.user.email,
                id: data.user.id
            }
        });

        // Set secure HTTP-only cookies for session
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: SESSION_DURATION / 1000, // in seconds
            path: '/'
        };

        response.cookies.set('sb-access-token', data.session.access_token, cookieOptions);
        response.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);
        response.cookies.set('admin-session', JSON.stringify(sessionData), {
            ...cookieOptions,
            httpOnly: false // Allow JS to read session expiry for UI purposes
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}
