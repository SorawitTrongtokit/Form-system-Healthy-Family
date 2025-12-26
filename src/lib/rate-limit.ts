import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Rate limiting config
const MAX_ATTEMPTS_IP = 10;
const MAX_ATTEMPTS_ID = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000;    // 5 minutes window

interface RateLimitRecord {
    key: string;
    attempts: number;
    last_attempt: string;
    locked_until: string | null;
}

// Helper to access rate_limits table (not in generated Supabase types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rateLimitsTable(client: SupabaseClient<any, any, any>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).from('rate_limits');
}

export async function checkRateLimit(
    serviceClient: SupabaseClient,
    key: string,
    maxAttempts: number
): Promise<{ allowed: boolean; remainingTime: number }> {
    const now = new Date();

    const { data } = await rateLimitsTable(serviceClient)
        .select('*')
        .eq('key', key)
        .single();

    const record = data as RateLimitRecord | null;
    if (!record) return { allowed: true, remainingTime: 0 };

    // Check if locked
    if (record.locked_until && new Date(record.locked_until) > now) {
        const remainingMs = new Date(record.locked_until).getTime() - now.getTime();
        return {
            allowed: false,
            remainingTime: Math.ceil(remainingMs / 1000 / 60)
        };
    }

    // Reset if outside the attempt window
    const lastAttempt = new Date(record.last_attempt);
    if (now.getTime() - lastAttempt.getTime() > ATTEMPT_WINDOW) {
        await rateLimitsTable(serviceClient)
            .update({ attempts: 0, locked_until: null, last_attempt: now.toISOString() })
            .eq('key', key);
        return { allowed: true, remainingTime: 0 };
    }

    return { allowed: record.attempts < maxAttempts, remainingTime: 0 };
}

export async function recordFailedAttempt(
    serviceClient: SupabaseClient,
    key: string,
    maxAttempts: number
): Promise<{ locked: boolean; attemptsLeft: number }> {
    const now = new Date();

    const { data } = await rateLimitsTable(serviceClient)
        .select('attempts')
        .eq('key', key)
        .single();

    const existing = data as { attempts: number } | null;
    const currentAttempts = existing ? existing.attempts + 1 : 1;
    const shouldLock = currentAttempts >= maxAttempts;
    const lockedUntil = shouldLock ? new Date(now.getTime() + LOCKOUT_DURATION).toISOString() : null;

    await rateLimitsTable(serviceClient)
        .upsert({
            key,
            attempts: currentAttempts,
            last_attempt: now.toISOString(),
            locked_until: lockedUntil
        }, { onConflict: 'key' });

    return {
        locked: shouldLock,
        attemptsLeft: Math.max(0, maxAttempts - currentAttempts)
    };
}

export async function clearAttempts(
    serviceClient: SupabaseClient,
    key: string
): Promise<void> {
    await rateLimitsTable(serviceClient)
        .delete()
        .eq('key', key);
}

export { MAX_ATTEMPTS_IP, MAX_ATTEMPTS_ID, LOCKOUT_DURATION };
