import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Rate limiting storage (in-memory)
// Note: For Vercel serverless, consider Vercel KV or Redis for persistence
const loginAttempts: Map<string, { count: number; lastAttempt: number; lockedUntil: number }> = new Map();

// Config
const MAX_ATTEMPTS_IP = 10;      // Max attempts per IP
const MAX_ATTEMPTS_ID = 5;       // Max attempts per national_id
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000;    // 5 minutes window

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

function checkRateLimit(key: string, maxAttempts: number): { allowed: boolean; remainingTime: number } {
    const record = loginAttempts.get(key);
    const now = Date.now();

    if (!record) return { allowed: true, remainingTime: 0 };

    // Check if locked
    if (record.lockedUntil > now) {
        return {
            allowed: false,
            remainingTime: Math.ceil((record.lockedUntil - now) / 1000 / 60)
        };
    }

    // Reset if outside the attempt window
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        loginAttempts.delete(key);
        return { allowed: true, remainingTime: 0 };
    }

    return { allowed: record.count < maxAttempts, remainingTime: 0 };
}

function recordFailedAttempt(key: string, maxAttempts: number): { locked: boolean; attemptsLeft: number } {
    const now = Date.now();
    const record = loginAttempts.get(key) || { count: 0, lastAttempt: now, lockedUntil: 0 };

    // Reset count if outside the attempt window
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        record.count = 0;
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count >= maxAttempts) {
        record.lockedUntil = now + LOCKOUT_DURATION;
        loginAttempts.set(key, record);
        return { locked: true, attemptsLeft: 0 };
    }

    loginAttempts.set(key, record);
    return { locked: false, attemptsLeft: maxAttempts - record.count };
}

function clearAttempts(key: string): void {
    loginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
    const ip = getClientIP(request);
    const ipKey = `ip:${ip}`;

    // Check IP rate limit first
    const ipCheck = checkRateLimit(ipKey, MAX_ATTEMPTS_IP);
    if (!ipCheck.allowed) {
        return NextResponse.json(
            { success: false, error: `พยายามเข้าสู่ระบบมากเกินไป กรุณารอ ${ipCheck.remainingTime} นาที` },
            { status: 429 }
        );
    }

    try {
        const { national_id, phone } = await request.json();

        // Validate input
        if (!national_id || !phone) {
            return NextResponse.json(
                { success: false, error: 'กรุณากรอกเลขบัตรประชาชนและเบอร์โทรศัพท์' },
                { status: 400 }
            );
        }

        // Clean national ID and phone
        const cleanNationalId = national_id.replace(/[\s-]/g, '');
        const cleanPhone = phone.replace(/[\s-]/g, '').replace(/^\+66/, '0').replace(/^66/, '0');
        const nationalIdKey = `id:${cleanNationalId}`;

        // Check national_id rate limit
        const idCheck = checkRateLimit(nationalIdKey, MAX_ATTEMPTS_ID);
        if (!idCheck.allowed) {
            return NextResponse.json(
                { success: false, error: `เลขบัตรนี้ถูกล็อค กรุณารอ ${idCheck.remainingTime} นาที` },
                { status: 429 }
            );
        }

        // Validate formats
        if (!/^\d{13}$/.test(cleanNationalId)) {
            recordFailedAttempt(ipKey, MAX_ATTEMPTS_IP);
            return NextResponse.json(
                { success: false, error: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' },
                { status: 400 }
            );
        }

        if (!/^0\d{9}$/.test(cleanPhone)) {
            recordFailedAttempt(ipKey, MAX_ATTEMPTS_IP);
            return NextResponse.json(
                { success: false, error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0' },
                { status: 400 }
            );
        }

        // Create Supabase clients
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

        // Use service client to query volunteer data (bypass RLS)
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Query volunteer by national_id
        const { data: volunteer, error: queryError } = await serviceClient
            .from('volunteers')
            .select('*')
            .eq('national_id', cleanNationalId)
            .single();

        if (queryError || !volunteer) {
            recordFailedAttempt(ipKey, MAX_ATTEMPTS_IP);
            recordFailedAttempt(nationalIdKey, MAX_ATTEMPTS_ID);
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลอาสาสมัครในระบบ กรุณาติดต่อ รพ.สต.' },
                { status: 401 }
            );
        }

        // Verify phone number
        const volunteerPhone = (volunteer.phone || '').replace(/[\s-]/g, '').replace(/^\+66/, '0').replace(/^66/, '0');

        if (volunteerPhone !== cleanPhone) {
            const result = recordFailedAttempt(nationalIdKey, MAX_ATTEMPTS_ID);
            return NextResponse.json(
                {
                    success: false,
                    error: result.locked
                        ? 'เลขบัตรนี้ถูกล็อค 15 นาที เนื่องจากกรอกผิดหลายครั้ง'
                        : `เบอร์โทรศัพท์ไม่ตรงกับข้อมูลในระบบ (เหลือ ${result.attemptsLeft} ครั้ง)`
                },
                { status: 401 }
            );
        }

        // Clear rate limit on successful verification
        clearAttempts(ipKey);
        clearAttempts(nationalIdKey);

        // Check if volunteer has Supabase Auth user linked
        if (volunteer.auth_user_id) {
            // Use existing auth user - sign in with custom email
            const email = `${cleanNationalId}@volunteer.anamai.local`;
            const password = `volunteer_${cleanNationalId}_${cleanPhone}`;

            const authClient = createClient(supabaseUrl, supabaseAnonKey);
            const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
                email,
                password
            });

            if (signInError || !authData.session) {
                console.error('Supabase Auth sign in failed:', signInError);
                return NextResponse.json(
                    { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่' },
                    { status: 500 }
                );
            }

            // Return with Supabase session tokens
            const response = NextResponse.json({
                success: true,
                volunteer: {
                    id: volunteer.id,
                    name: volunteer.name,
                    phone: volunteer.phone
                }
            });

            // Set session cookies
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: '/'
            };

            response.cookies.set('sb-access-token', authData.session.access_token, cookieOptions);
            response.cookies.set('sb-refresh-token', authData.session.refresh_token, cookieOptions);
            response.cookies.set('volunteer-session', JSON.stringify({
                id: volunteer.id,
                name: volunteer.name,
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
            }), { ...cookieOptions, httpOnly: false });

            return response;
        } else {
            // No Supabase Auth user yet - create one
            const email = `${cleanNationalId}@volunteer.anamai.local`;
            const password = `volunteer_${cleanNationalId}_${cleanPhone}`;

            // Create user in Supabase Auth
            const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (createError) {
                console.error('Failed to create Supabase Auth user:', createError);
                // Fallback: login without Supabase Auth (legacy mode)
                const response = NextResponse.json({
                    success: true,
                    volunteer: {
                        id: volunteer.id,
                        name: volunteer.name,
                        phone: volunteer.phone
                    },
                    warning: 'Legacy mode - contact admin'
                });

                response.cookies.set('volunteer-session', JSON.stringify({
                    id: volunteer.id,
                    name: volunteer.name,
                    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
                }), {
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60,
                    path: '/'
                });

                return response;
            }

            // Link auth user to volunteer
            await serviceClient
                .from('volunteers')
                .update({ auth_user_id: newUser.user.id })
                .eq('id', volunteer.id);

            // Sign in with new user
            const authClient = createClient(supabaseUrl, supabaseAnonKey);
            const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
                email,
                password
            });

            if (signInError || !authData.session) {
                console.error('Sign in after create failed:', signInError);
                return NextResponse.json(
                    { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
                    { status: 500 }
                );
            }

            // Return with session
            const response = NextResponse.json({
                success: true,
                volunteer: {
                    id: volunteer.id,
                    name: volunteer.name,
                    phone: volunteer.phone
                }
            });

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                maxAge: 30 * 24 * 60 * 60,
                path: '/'
            };

            response.cookies.set('sb-access-token', authData.session.access_token, cookieOptions);
            response.cookies.set('sb-refresh-token', authData.session.refresh_token, cookieOptions);
            response.cookies.set('volunteer-session', JSON.stringify({
                id: volunteer.id,
                name: volunteer.name,
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
            }), { ...cookieOptions, httpOnly: false });

            return response;
        }
    } catch (error) {
        console.error('Volunteer login error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}
