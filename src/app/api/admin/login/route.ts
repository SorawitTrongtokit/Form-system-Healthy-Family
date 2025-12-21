import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage (in-memory, resets on server restart)
const loginAttempts: Map<string, { count: number; lastAttempt: number; lockedUntil: number }> = new Map();

// Config
const MAX_ATTEMPTS = 7;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes window

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
        const { username, password } = await request.json();

        // Get credentials from environment variables
        const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
        const validPassword = process.env.ADMIN_PASSWORD || 'Admin2024!';

        if (username === validUsername && password === validPassword) {
            // Clear failed attempts on successful login
            clearAttempts(ip);

            // Generate session token with expiry
            const sessionData = {
                loggedIn: true,
                loginTime: Date.now(),
                expiresAt: Date.now() + (12 * 60 * 60 * 1000) // 12 hours
            };

            return NextResponse.json({
                success: true,
                session: sessionData
            });
        } else {
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
                    error: `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือ ${result.attemptsLeft} ครั้ง)`
                },
                { status: 401 }
            );
        }
    } catch {
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
