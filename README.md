# 🏥 ระบบแบบฟอร์มครอบครัวสุขภาพดี

ระบบบันทึกข้อมูลสุขภาพประชาชนสำหรับ รพ.สต. (โรงพยาบาลส่งเสริมสุขภาพตำบล)

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## ✨ คุณสมบัติหลัก

### 📊 สำหรับ Admin

- จัดการข้อมูลอาสาสมัคร (อสม.)
- จัดการบ้าน/ครัวเรือน
- จัดการประชากร
- Export ข้อมูลเป็น Excel
- Dashboard สถิติภาพรวม

### 👩‍⚕️ สำหรับอาสาสมัคร

- Login ด้วยเลขบัตรประชาชน
- กรอกแบบฟอร์มสุขภาพ 5 กลุ่มวัย
- ดูสถานะผ่าน/ไม่ผ่านเกณฑ์

### 📋 แบบฟอร์มสุขภาพ 5 กลุ่มวัย

| กลุ่มวัย | เกณฑ์ที่ตรวจ |
|----------|-----------|
| 0-5 ปี | น้ำหนัก, ส่วนสูง, วัคซีน, พัฒนาการ |
| 6-14 ปี | น้ำหนัก, ส่วนสูง, วัคซีน, สุขภาพช่องปาก |
| 15-18 ปี | น้ำหนัก, ส่วนสูง, สุรา, บุหรี่, ยาเสพติด |
| 19-59 ปี | เบาหวาน, ความดัน, ภาวะพึ่งพิง |
| 60+ ปี | เบาหวาน, ความดัน, ภาวะพึ่งพิง |

### 🔒 ความปลอดภัย

- Admin Login พร้อม Brute-Force Protection
- Session Timeout 12 ชั่วโมง
- Row Level Security (RLS) บน Supabase

---

## 🚀 เริ่มต้นใช้งาน

### ความต้องการ

- Node.js 18+
- บัญชี Supabase (ฟรี)
- บัญชี Vercel (ฟรี)

### ติดตั้ง Local

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/Form-system-Healthy-Family.git
cd Form-system-Healthy-Family

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env.local
cp .env.example .env.local
# แก้ไขค่า Supabase URL และ Key

# รัน development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## 📁 โครงสร้างโปรเจค

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # หน้า Admin
│   │   ├── dashboard/     # Dashboard
│   │   ├── volunteers/    # จัดการอาสาสมัคร
│   │   ├── houses/        # จัดการบ้าน
│   │   └── residents/     # จัดการประชากร
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard สาธารณะ
│   ├── export/            # Export ข้อมูล
│   ├── login/             # หน้า Login อาสาสมัคร
│   ├── survey/            # แบบฟอร์มสุขภาพ
│   └── volunteer/         # หน้าอาสาสมัคร
├── lib/                   # Utilities
│   ├── calculations.ts    # คำนวณ BMI/เกณฑ์สุขภาพ
│   ├── store.ts          # State Management
│   ├── supabase.ts       # Supabase Client
│   ├── types.ts          # TypeScript Types
│   └── validation.ts     # Validation Functions
└── public/               # Static Files
    └── logo.jpg          # โลโก้
```

---

## ⚙️ Environment Variables

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
```

---

## 📖 เอกสารเพิ่มเติม

- [คู่มือการติดตั้ง (DEPLOYMENT_GUIDE.md)](./DEPLOYMENT_GUIDE.md)

---

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Icons:** Lucide React

---

## 📝 License

MIT License - สามารถนำไปใช้และดัดแปลงได้อย่างอิสระ

---

## 👨‍💻 ผู้พัฒนา

พัฒนาสำหรับ รพ.สต. ในประเทศไทย

---

**Made with ❤️ for Thai Public Health**
