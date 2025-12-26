import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting storage (in-memory, resets on server restart)
// Note: For Vercel serverless, this may reset between invocations
// Consider using Redis or Vercel KV for production
const loginAttempts: Map<string, { count: number; lastAttempt: number; lockedUntil: number }> = new Map();

// Config
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes window
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
}

function isLocked(ip: string): { locked: boolean; remainingTime: number } {
    const record = loginAttempts.get(ip);
    if (!record) return { locked: false, remainingTime: 0 };

    const now = Date.now();
    if (record.lockedUntil > now) {
        return {
            locked: true,
            remainingTime: Math.ceil((record.lockedUntil - now) / 1000 / 60)
        };
    }

    // Reset if outside the attempt window
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        loginAttempts.delete(ip);
        return { locked: false, remainingTime: 0 };
    }

    return { locked: false, remainingTime: 0 };
}

function recordFailedAttempt(ip: string): { locked: boolean; attemptsLeft: number } {
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, lastAttempt: now, lockedUntil: 0 };

    // Reset count if outside the attempt window
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        record.count = 0;
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_DURATION;
        loginAttempts.set(ip, record);
        return { locked: true, attemptsLeft: 0 };
    }

    loginAttempts.set(ip, record);
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - record.count };
}

function clearAttempts(ip: string): void {
    loginAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
    const ip = getClientIP(request);

    // Check if IP is locked
    const lockStatus = isLocked(ip);
    if (lockStatus.locked) {
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

        // Validate environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json(
                { success: false, error: 'ระบบมีปัญหา กรุณาติดต่อผู้ดูแล' },
                { status: 500 }
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
            const result = recordFailedAttempt(ip);

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
        clearAttempts(ip);

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
