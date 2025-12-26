import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        const accessToken = request.cookies.get('sb-access-token')?.value;
        const adminSession = request.cookies.get('admin-session')?.value;

        // Check if cookies exist
        if (!accessToken || !adminSession) {
            return NextResponse.json({ valid: false });
        }

        // Check session expiry
        try {
            const session = JSON.parse(adminSession);
            if (!session.expiresAt || session.expiresAt < Date.now()) {
                return NextResponse.json({ valid: false, reason: 'expired' });
            }
        } catch {
            return NextResponse.json({ valid: false, reason: 'invalid_session' });
        }

        // Validate token with Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({
                valid: false,
                reason: 'server_config_error'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Set the session and get user
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return NextResponse.json({ valid: false, reason: 'token_invalid' });
        }

        return NextResponse.json({
            valid: true,
            user: {
                email: user.email,
                id: user.id
            }
        });
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ valid: false, reason: 'error' });
    }
}
