-- Fix SQL for Supabase (Run this in SQL Editor)
-- ปัญหา: RLS Policy และ column disease หายไป

-- 1. เพิ่ม column disease ในตาราง residents
ALTER TABLE residents ADD COLUMN IF NOT EXISTS disease TEXT;

-- 2. ลบ RLS policies เดิมที่มีปัญหา (ถ้ามี)
DROP POLICY IF EXISTS "Allow public read on volunteers" ON volunteers;
DROP POLICY IF EXISTS "Allow public read on houses" ON houses;
DROP POLICY IF EXISTS "Allow public read on residents" ON residents;
DROP POLICY IF EXISTS "Allow public read on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public insert on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on health_records" ON health_records;
DROP POLICY IF EXISTS "Allow public update on houses" ON houses;

-- 3. สร้าง RLS policies ใหม่ที่อนุญาตทุกอย่าง (สำหรับ demo)

-- Volunteers
CREATE POLICY "Allow all on volunteers" ON volunteers FOR ALL USING (true) WITH CHECK (true);

-- Houses  
CREATE POLICY "Allow all on houses" ON houses FOR ALL USING (true) WITH CHECK (true);

-- Residents
CREATE POLICY "Allow all on residents" ON residents FOR ALL USING (true) WITH CHECK (true);

-- Health Records
CREATE POLICY "Allow all on health_records" ON health_records FOR ALL USING (true) WITH CHECK (true);

-- เสร็จแล้ว! รัน upload script อีกครั้ง
