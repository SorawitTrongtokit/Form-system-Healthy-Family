-- Supabase Table Schema for ระบบครอบครัวสุขภาพดี
-- Run this SQL in Supabase SQL Editor

-- 1. Volunteers table (อาสาสมัคร)
CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  national_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Houses table (บ้าน)
CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  house_number TEXT NOT NULL,
  village_no INTEGER NOT NULL,
  volunteer_id TEXT REFERENCES volunteers(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Residents table (ประชากร)
CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  national_id TEXT,
  prefix TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  house_id TEXT REFERENCES houses(id),
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Health Records table (ข้อมูลสุขภาพ)
CREATE TABLE IF NOT EXISTS health_records (
  id TEXT PRIMARY KEY,
  resident_id TEXT REFERENCES residents(id),
  house_id TEXT REFERENCES houses(id),
  record_date DATE NOT NULL,
  age_group TEXT CHECK (age_group IN ('0-5', '6-14', '15-18', '19-59', '60+')),
  
  -- Common fields
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  bmi DECIMAL(4,1),
  
  -- Children fields (0-5, 6-14)
  weight_criteria TEXT,
  height_criteria TEXT,
  weight_for_height TEXT,
  vaccination TEXT,
  development TEXT,
  iron_supplement TEXT,
  oral_health TEXT,
  
  -- Teens fields (15-18)
  alcohol TEXT,
  smoking TEXT,
  drug_use TEXT,
  
  -- Adults fields (19-59, 60+)
  diabetes TEXT,
  hypertension TEXT,
  dependency TEXT,
  
  -- Result
  passed_criteria BOOLEAN,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- ⚠️ IMPORTANT: RLS Policies are NOT created here.
-- Run scripts/supabase-rls-secure.sql after this file to set up secure policies.
-- DO NOT use "USING (true)" policies in production!

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_houses_volunteer ON houses(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_residents_house ON residents(house_id);
CREATE INDEX IF NOT EXISTS idx_health_records_resident ON health_records(resident_id);
