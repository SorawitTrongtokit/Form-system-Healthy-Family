# ระบบแบบฟอร์มครอบครัวสุขภาพดี

## รพ.สต.มะตูม | Matum Health Promotion Hospital

ระบบ PWA สำหรับเก็บข้อมูลสุขภาพชุมชน ใช้งานโดยอาสาสมัครสาธารณสุข (อสม.)

---

## 🚀 Quick Start

```bash
# 1. Clone และติดตั้ง
git clone <repo-url>
cd real-anamai
npm install

# 2. ตั้งค่า Environment
cp .env.example .env.local
# แก้ไขค่าใน .env.local

# 3. รันในโหมด Development
npm run dev
```

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── admin/           # Admin pages (dashboard, volunteers, houses)
│   ├── api/             # API routes (login, logout, session)
│   ├── dashboard/       # Public dashboard
│   ├── login/           # Volunteer login
│   ├── survey/          # Health survey form
│   └── volunteer/       # Volunteer pages
├── components/          # Shared components
└── lib/
    ├── supabase.ts      # Supabase client (anon key)
    ├── supabase-server.ts # Supabase server (service role)
    ├── rate-limit.ts    # Database rate limiting
    └── national-id.ts   # Thai ID utilities
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | Supabase Auth (Admin + Volunteer) |
| Row Level Security | อสม. เห็นเฉพาะข้อมูลบ้านตัวเอง |
| Rate Limiting | Database-based (works on serverless) |
| Audit Logging | PostgreSQL triggers |
| Session | HTTP-only cookies |
| CSP Headers | Configured in next.config.ts |

---

## 📋 Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` ต้องเก็บเป็นความลับ ห้ามใส่ในโค้ด

---

## 👥 User Roles

| Role | Login Method | Access |
|------|--------------|--------|
| Admin | Email + Password | ข้อมูลทั้งหมด, Export, จัดการ อสม. |
| อสม. | เลขบัตร + เบอร์โทร | บ้านในความรับผิดชอบเท่านั้น |

---

## 📖 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - วิธี Deploy ไป Vercel
- **[scripts/supabase-rls-secure.sql](./scripts/supabase-rls-secure.sql)** - RLS Policies

---

## 📄 License

© 2024 รพ.สต.มะตูม - Internal Use Only
