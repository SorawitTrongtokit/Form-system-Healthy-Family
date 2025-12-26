// Supabase Client Configuration
// Server-side client for authentication operations
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a server-side Supabase client with service role key
// This is used for admin operations and should NEVER be exposed to the client
export function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }

    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// Create a client that uses the session from cookies
export async function createAuthClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }

    if (!anonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    const client = createClient(supabaseUrl, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    if (accessToken && refreshToken) {
        await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });
    }

    return client;
}

// Verify admin session from cookies
export async function verifyAdminSession(): Promise<{ valid: boolean; email?: string }> {
    try {
        const client = await createAuthClient();
        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) {
            return { valid: false };
        }

        // Check if user is admin (you can customize this logic)
        // For now, any authenticated user is considered admin
        return { valid: true, email: user.email };
    } catch {
        return { valid: false };
    }
}
