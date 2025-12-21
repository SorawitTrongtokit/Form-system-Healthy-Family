# 📚 คู่มือการติดตั้งระบบครอบครัวสุขภาพดี

## สารบัญ

1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [ขั้นตอนการติดตั้ง](#ขั้นตอนการติดตั้ง)
3. [การตั้งค่า Database](#การตั้งค่า-database)
4. [การ Deploy บน Vercel](#การ-deploy-บน-vercel)
5. [การปรับแต่งสำหรับ รพ.สต.](#การปรับแต่งสำหรับ-รพสต)
6. [การใช้งานเบื้องต้น](#การใช้งานเบื้องต้น)

---

## ความต้องการของระบบ

### บัญชีที่ต้องมี (ฟรี)

- [GitHub](https://github.com) - เก็บ Source Code
- [Supabase](https://supabase.com) - ฐานข้อมูล (ฟรี 500MB)
- [Vercel](https://vercel.com) - Hosting (ฟรี)

### เครื่องมือสำหรับ Developer

- Node.js 18+ (สำหรับ development)
- Git

---

## ขั้นตอนการติดตั้ง

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/Form-system-Healthy-Family.git
cd Form-system-Healthy-Family
npm install
```

### 2. ทดสอบ Local

```bash
npm run dev
```

เปิด <http://localhost:3000>

---

## การตั้งค่า Database

### 1. สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. ตั้งชื่อ Project (เช่น `healthy-family-YOUR-CLINIC`)
3. เลือก Region: **Singapore** (ใกล้ไทยที่สุด)
4. สร้าง Password และจดไว้

### 2. สร้างตาราง (SQL Editor)

ไปที่ **SQL Editor** แล้วรันคำสั่งนี้:

```sql
-- ตาราง อาสาสมัคร (volunteers)
CREATE TABLE volunteers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    national_id VARCHAR(13) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ตาราง บ้าน (houses)
CREATE TABLE houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_number VARCHAR(50) NOT NULL,
    village_no INTEGER NOT NULL,
    volunteer_id UUID REFERENCES volunteers(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ตาราง ประชากร (residents)
CREATE TABLE residents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id),
    national_id VARCHAR(13),
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ตาราง ข้อมูลสุขภาพ (health_records)
CREATE TABLE health_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resident_id UUID REFERENCES residents(id),
    house_id UUID REFERENCES houses(id),
    record_date DATE NOT NULL,
    age_group VARCHAR(10) NOT NULL,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    weight_criteria VARCHAR(20),
    height_criteria VARCHAR(20),
    weight_for_height VARCHAR(20),
    vaccination VARCHAR(20),
    development VARCHAR(30),
    iron_supplement VARCHAR(20),
    oral_health VARCHAR(30),
    alcohol VARCHAR(20),
    smoking VARCHAR(20),
    drug_use VARCHAR(20),
    diabetes VARCHAR(20),
    hypertension VARCHAR(30),
    dependency VARCHAR(30),
    passed_criteria BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- เปิด Row Level Security
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- สร้าง Policies
CREATE POLICY "Allow all for volunteers" ON volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for houses" ON houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for residents" ON residents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for health_records" ON health_records FOR ALL USING (true) WITH CHECK (true);
```

### 3. คัดลอก API Keys

ไปที่ **Settings → API** แล้วจด:

- `Project URL` (เช่น <https://xxx.supabase.co>)
- `anon public` key

---

## การ Deploy บน Vercel

### 1. เชื่อมต่อ GitHub

1. ไปที่ [vercel.com](https://vercel.com)
2. Import Git Repository
3. เลือก Repository ที่ Fork มา

### 2. ตั้งค่า Environment Variables

ใน Vercel Dashboard → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | <https://xxx.supabase.co> |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhxxxx... |
| `NEXT_PUBLIC_ADMIN_USERNAME` | admin |
| `ADMIN_PASSWORD` | รหัสผ่านที่ต้องการ |

### 3. Deploy

กด **Deploy** และรอ 1-2 นาที

---

## การปรับแต่งสำหรับ รพ.สต

### 1. เปลี่ยนชื่อ รพ.สต

แก้ไขไฟล์ `src/app/layout.tsx`:

```tsx
title: 'ระบบครอบครัวสุขภาพดี - รพ.สต.XXX',
description: 'ระบบบันทึกข้อมูลสุขภาพ รพ.สต.XXX',
```

### 2. เปลี่ยนโลโก้

แทนที่ไฟล์ `public/logo.jpg` ด้วยโลโก้ใหม่

### 3. เปลี่ยนข้อความหน้าแรก

แก้ไขไฟล์ `src/app/page.tsx`

---

## การใช้งานเบื้องต้น

### สำหรับ Admin

1. เข้า `/admin` → Login ด้วย Username/Password ที่ตั้งไว้
2. เพิ่มอาสาสมัคร → เพิ่มบ้าน → เพิ่มประชากร

### สำหรับอาสาสมัคร

1. เข้า `/login` → กรอกเลขบัตรประชาชน 13 หลัก
2. เลือกบ้าน → เลือกคน → กรอกแบบฟอร์มสุขภาพ

### Export ข้อมูล

1. Login เป็น Admin
2. ไปที่ `/export`
3. ดาวน์โหลด Excel

---

## การสนับสนุน

หากมีปัญหาหรือต้องการความช่วยเหลือ:

- 📧 Email: [sorawit.tro@pccpl.ac.th]
- 📱 โทร: [094-5259153]

---

**พัฒนาโดย:** [สรวิชญ์ ตรงต่อกิจ]
**เวอร์ชัน:** 1.0.0
