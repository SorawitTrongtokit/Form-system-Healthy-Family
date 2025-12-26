-- =====================================================
-- SECURITY MIGRATION: RLS Policies + Audit Logging
-- ระบบครอบครัวสุขภาพดี รพ.สต.มะตูม
-- 
-- ⚠️ ต้องรัน script นี้ใน Supabase SQL Editor
-- ⚠️ ก่อนรัน ต้องสร้าง volunteer users ใน Authentication ก่อน
-- =====================================================

-- =====================================================
-- PART 1: สร้างตาราง Audit Logs
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ⚠️ CRITICAL: Only service role can access audit_logs
-- ไม่มี policy สำหรับ anon key = ไม่มีใครอ่านได้ยกเว้น service role
-- (เพราะ service role bypass RLS)

-- Drop existing policies first
DROP POLICY IF EXISTS "System can insert audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Only authenticated can read audit_logs" ON audit_logs;

-- System trigger สามารถ insert ได้ (ผ่าน SECURITY DEFINER)
CREATE POLICY "System can insert audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- PART 1.2: Log Retention (90 วัน ตาม พ.ร.บ. คอมพิวเตอร์)
-- =====================================================

-- Function: ลบ logs ที่เก่าเกิน 90 วัน
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_audit INTEGER;
    deleted_rate INTEGER;
BEGIN
    -- ลบ audit_logs ที่เก่าเกิน 90 วัน
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_audit = ROW_COUNT;
    
    -- ลบ rate_limits ที่เก่าเกิน 1 วัน (ไม่จำเป็นต้องเก็บนาน)
    DELETE FROM rate_limits 
    WHERE last_attempt < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS deleted_rate = ROW_COUNT;
    
    -- Log การลบ (optional - สำหรับ monitoring)
    RAISE NOTICE 'Cleanup completed: % audit_logs, % rate_limits deleted', deleted_audit, deleted_rate;
    
    RETURN deleted_audit + deleted_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 1.3: Auto-Cleanup (ใช้ pg_cron หรือ Supabase Edge Function)
-- =====================================================
-- 
-- วิธีที่ 1: ใช้ Supabase Dashboard → Database → Extensions → Enable pg_cron
-- แล้วรัน:
-- SELECT cron.schedule('cleanup-logs', '0 3 * * *', 'SELECT cleanup_old_logs()');
-- (รันทุกวัน เวลา 03:00)
--
-- วิธีที่ 2: สร้าง Supabase Edge Function เรียก cleanup_old_logs() ทุกวัน
--
-- วิธีที่ 3: เรียก cleanup_old_logs() จาก Admin Dashboard เป็นประจำ
-- =====================================================

-- ⚠️ TIMEZONE NOTICE:
-- Supabase ใช้ UTC เป็น default
-- created_at ใช้ TIMESTAMPTZ ซึ่งจะแปลง timezone อัตโนมัติ
-- เวลาใน audit_logs จะถูกต้องแม้ server ใช้ UTC

-- =====================================================
-- PART 1.5: Rate Limits Table (for Serverless)
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,           -- 'ip:xxx' or 'id:xxx'
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ⚠️ CRITICAL: NO POLICIES = service role only
-- rate_limits ต้องจัดการผ่าน service role เท่านั้น
-- ไม่มี policy = anon/authenticated ไม่สามารถ read/write ได้

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- =====================================================
-- PART 2: Audit Trigger Function (PostgreSQL)
-- =====================================================

CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid()::text,
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: Create Triggers for sensitive tables
-- =====================================================

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS health_records_audit ON health_records;
DROP TRIGGER IF EXISTS residents_audit ON residents;
DROP TRIGGER IF EXISTS volunteers_audit ON volunteers;

-- Create triggers
CREATE TRIGGER health_records_audit
    AFTER INSERT OR UPDATE OR DELETE ON health_records
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER residents_audit
    AFTER INSERT OR UPDATE OR DELETE ON residents
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER volunteers_audit
    AFTER INSERT OR UPDATE OR DELETE ON volunteers
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- =====================================================
-- PART 4: เพิ่ม Column สำหรับ link volunteer กับ auth.users
-- =====================================================

-- Add auth_user_id column to volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_volunteers_auth_user ON volunteers(auth_user_id);

-- =====================================================
-- PART 5: DROP ALL OLD POLICIES (Clean slate)
-- =====================================================

-- Drop all existing policies on all tables
DROP POLICY IF EXISTS "Allow public read on volunteers" ON volunteers;
DROP POLICY IF EXISTS "Allow public read on houses" ON houses;
DROP POLICY IF EXISTS "Allow public read on residents" ON residents;
DROP POLICY IF EXISTS "Allow public read on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public insert on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on houses" ON houses;
DROP POLICY IF EXISTS "Allow all on volunteers" ON volunteers;
DROP POLICY IF EXISTS "Allow all on houses" ON houses;
DROP POLICY IF EXISTS "Allow all on residents" ON residents;
DROP POLICY IF EXISTS "Allow all on health_records" ON health_records;
DROP POLICY IF EXISTS "Volunteers can read own data" ON volunteers;
DROP POLICY IF EXISTS "Volunteers can read assigned houses" ON houses;
DROP POLICY IF EXISTS "Volunteers can update assigned houses" ON houses;
DROP POLICY IF EXISTS "Volunteers can read assigned residents" ON residents;
DROP POLICY IF EXISTS "Volunteers can read assigned health_records" ON health_records;
DROP POLICY IF EXISTS "Volunteers can insert health_records" ON health_records;
DROP POLICY IF EXISTS "Volunteers can update health_records" ON health_records;
DROP POLICY IF EXISTS "Only authenticated can read audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role manages rate_limits" ON rate_limits;

-- =====================================================
-- PART 6: CREATE SECURE RLS POLICIES
-- =====================================================

-- ----- VOLUNTEERS TABLE -----
-- อสม. สามารถดูข้อมูลตัวเองเท่านั้น (ผ่าน auth_user_id)
CREATE POLICY "volunteers_select_own" ON volunteers
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND auth_user_id = auth.uid()
    );

-- ห้าม UPDATE/DELETE ผ่าน client (เฉพาะ service role)

-- ----- HOUSES TABLE -----
-- อสม. เห็นเฉพาะบ้านที่ตัวเองดูแล
CREATE POLICY "houses_select_assigned" ON houses
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND volunteer_id IN (
            SELECT id FROM volunteers WHERE auth_user_id = auth.uid()
        )
    );

-- อสม. สามารถ update บ้านที่ตัวเองดูแล (เช่น latitude/longitude)
CREATE POLICY "houses_update_assigned" ON houses
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND volunteer_id IN (
            SELECT id FROM volunteers WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- ป้องกันเปลี่ยน volunteer_id ไปเป็นคนอื่น
        volunteer_id IN (
            SELECT id FROM volunteers WHERE auth_user_id = auth.uid()
        )
    );

-- ห้าม INSERT/DELETE houses ผ่าน client (เฉพาะ Admin)

-- ----- RESIDENTS TABLE -----
-- อสม. เห็นเฉพาะคนในบ้านที่ตัวเองดูแล
CREATE POLICY "residents_select_assigned" ON residents
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND house_id IN (
            SELECT h.id FROM houses h
            JOIN volunteers v ON h.volunteer_id = v.id
            WHERE v.auth_user_id = auth.uid()
        )
    );

-- ห้าม INSERT/UPDATE/DELETE residents ผ่าน client (เฉพาะ Admin จัดการข้อมูลประชากร)

-- ----- HEALTH_RECORDS TABLE -----
-- อสม. เห็นเฉพาะ records ของบ้านที่ตัวเองดูแล
CREATE POLICY "health_records_select_assigned" ON health_records
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND house_id IN (
            SELECT h.id FROM houses h
            JOIN volunteers v ON h.volunteer_id = v.id
            WHERE v.auth_user_id = auth.uid()
        )
    );

-- อสม. สามารถเพิ่ม records ของบ้านที่ตัวเองดูแล
CREATE POLICY "health_records_insert_assigned" ON health_records
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND house_id IN (
            SELECT h.id FROM houses h
            JOIN volunteers v ON h.volunteer_id = v.id
            WHERE v.auth_user_id = auth.uid()
        )
    );

-- อสม. สามารถแก้ไข records ที่ตัวเองสร้าง
CREATE POLICY "health_records_update_assigned" ON health_records
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND house_id IN (
            SELECT h.id FROM houses h
            JOIN volunteers v ON h.volunteer_id = v.id
            WHERE v.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- ป้องกันเปลี่ยน house_id/resident_id ไปเป็นบ้านอื่น
        house_id IN (
            SELECT h.id FROM houses h
            JOIN volunteers v ON h.volunteer_id = v.id
            WHERE v.auth_user_id = auth.uid()
        )
    );

-- ห้าม DELETE health_records ผ่าน client (เก็บเป็น audit trail)

-- =====================================================
-- PART 7: Function to mask national ID for display
-- =====================================================

CREATE OR REPLACE FUNCTION mask_national_id(national_id TEXT)
RETURNS TEXT AS $$
BEGIN
    IF national_id IS NULL OR LENGTH(national_id) != 13 THEN
        RETURN national_id;
    END IF;
    -- Format: 1-2345-XXXXX-12-3
    RETURN SUBSTRING(national_id, 1, 1) || '-' ||
           SUBSTRING(national_id, 2, 4) || '-XXXXX-' ||
           SUBSTRING(national_id, 12, 2) || '-' ||
           SUBSTRING(national_id, 13, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- SECURITY SUMMARY:
-- =====================================================
-- 
-- | ตาราง          | SELECT        | INSERT        | UPDATE        | DELETE        |
-- |----------------|---------------|---------------|---------------|---------------|
-- | volunteers     | ตัวเองเท่านั้น     | Service Role  | Service Role  | Service Role  |
-- | houses         | บ้านตัวเอง       | Service Role  | บ้านตัวเอง       | Service Role  |
-- | residents      | บ้านตัวเอง       | Service Role  | Service Role  | Service Role  |
-- | health_records | บ้านตัวเอง       | บ้านตัวเอง       | บ้านตัวเอง       | Service Role  |
-- | audit_logs     | Service Role  | Trigger only  | -             | -             |
-- | rate_limits    | Service Role  | Service Role  | Service Role  | Service Role  |
-- 
-- Admin ใช้ SUPABASE_SERVICE_ROLE_KEY ผ่าน supabase-server.ts (bypass RLS)
-- อสม. ใช้ anon key + JWT จาก Supabase Auth
-- =====================================================
