-- =====================================================
-- SECURITY MIGRATION: RLS Policies + Audit Logging
-- สำหรับระบบครอบครัวสุขภาพดี รพ.สต.มะตูม
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
    action TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs (only admin can read)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated can read audit_logs" ON audit_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

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

-- Allow all operations (managed by service role)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate_limits" ON rate_limits
    FOR ALL USING (true) WITH CHECK (true);

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
-- PART 5: DROP OLD INSECURE POLICIES
-- =====================================================

-- Drop all public read policies
DROP POLICY IF EXISTS "Allow public read on volunteers" ON volunteers;
DROP POLICY IF EXISTS "Allow public read on houses" ON houses;
DROP POLICY IF EXISTS "Allow public read on residents" ON residents;
DROP POLICY IF EXISTS "Allow public read on health_records" ON health_records;

-- Drop old insert/update policies
DROP POLICY IF EXISTS "Allow public insert on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on houses" ON houses;

-- =====================================================
-- PART 6: CREATE SECURE RLS POLICIES
-- =====================================================

-- ----- VOLUNTEERS TABLE -----
-- อสม. สามารถดูข้อมูลตัวเอง
CREATE POLICY "Volunteers can read own data" ON volunteers
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND auth_user_id = auth.uid()
    );

-- ----- HOUSES TABLE -----
-- อสม. เห็นเฉพาะบ้านที่ตัวเองดูแล
CREATE POLICY "Volunteers can read assigned houses" ON houses
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            volunteer_id IN (
                SELECT id FROM volunteers WHERE auth_user_id = auth.uid()
            )
        )
    );

-- อสม. สามารถแก้ไขบ้านที่ตัวเองดูแล
CREATE POLICY "Volunteers can update assigned houses" ON houses
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            volunteer_id IN (
                SELECT id FROM volunteers WHERE auth_user_id = auth.uid()
            )
        )
    );

-- ----- RESIDENTS TABLE -----
-- อสม. เห็นเฉพาะคนในบ้านที่ตัวเองดูแล
CREATE POLICY "Volunteers can read assigned residents" ON residents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            house_id IN (
                SELECT h.id FROM houses h
                JOIN volunteers v ON h.volunteer_id = v.id
                WHERE v.auth_user_id = auth.uid()
            )
        )
    );

-- ----- HEALTH_RECORDS TABLE -----
-- อสม. เห็นเฉพาะ records ของบ้านที่ตัวเองดูแล
CREATE POLICY "Volunteers can read assigned health_records" ON health_records
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            house_id IN (
                SELECT h.id FROM houses h
                JOIN volunteers v ON h.volunteer_id = v.id
                WHERE v.auth_user_id = auth.uid()
            )
        )
    );

-- อสม. สามารถเพิ่ม/แก้ไข records ของบ้านที่ตัวเองดูแล
CREATE POLICY "Volunteers can insert health_records" ON health_records
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            house_id IN (
                SELECT h.id FROM houses h
                JOIN volunteers v ON h.volunteer_id = v.id
                WHERE v.auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Volunteers can update health_records" ON health_records
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            house_id IN (
                SELECT h.id FROM houses h
                JOIN volunteers v ON h.volunteer_id = v.id
                WHERE v.auth_user_id = auth.uid()
            )
        )
    );

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
-- USAGE NOTES:
-- 1. Admin ใช้ SUPABASE_SERVICE_ROLE_KEY (bypass RLS) ผ่าน supabase-server.ts
-- 2. อสม. ใช้ anon key + JWT จาก Supabase Auth
-- 3. ต้อง link volunteers.auth_user_id กับ auth.users.id
-- =====================================================
