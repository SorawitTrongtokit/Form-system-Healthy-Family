// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrnlfbmzzoatklooqnko.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybmxmYm16em9hdGtsb29xbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTI0MDcsImV4cCI6MjA4MTcyODQwN30.rk7H0FFvMaVvlkuHyvgckEygjvZgA36XwpPrlS2cuqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
