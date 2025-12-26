# Deployment Guide

## ระบบครอบครัวสุขภาพดี รพ.สต.มะตูม

---

## 📋 Pre-Deployment Checklist

- [ ] มี Supabase Project แล้ว
- [ ] มี Vercel Account แล้ว
- [ ] รัน SQL Migration แล้ว
- [ ] สร้าง Admin User แล้ว

---

## Step 1: Setup Supabase

### 1.1 สร้าง Project ใหม่

1. ไปที่ [supabase.com](https://supabase.com)
2. Create New Project
3. จด URL และ Keys ไว้

### 1.2 รัน Database Schema

```
Supabase Dashboard → SQL Editor → New Query
```

รัน 2 ไฟล์ตามลำดับ:

1. `scripts/supabase-schema.sql` (สร้างตาราง)
2. `scripts/supabase-rls-secure.sql` (RLS + Audit + Rate Limits)

### 1.3 สร้าง Admin User

```
Supabase Dashboard → Authentication → Users → Add User
```

- Email: `admin@yourdomain.com`
- Password: (รหัสที่ปลอดภัย)
- ✅ Auto Confirm User

---

## Step 2: Deploy to Vercel

### 2.1 เชื่อมต่อ Repository

1. ไปที่ [vercel.com](https://vercel.com)
2. Import Git Repository
3. เลือก `real-anamai`

### 2.2 ตั้งค่า Environment Variables

| Variable | ค่า | หมายเหตุ |
|----------|-----|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | จาก Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | service_role (ห้ามเผย!) |

### 2.3 Deploy

กด **Deploy** และรอจนเสร็จ

---

## Step 3: Post-Deployment

### 3.1 ทดสอบ Admin Login

1. ไปที่ `https://your-app.vercel.app/admin`
2. Login ด้วย Email/Password ที่สร้างใน Supabase
3. ควรเห็น Admin Dashboard

### 3.2 เพิ่มข้อมูล อสม

1. ใน Admin Dashboard → จัดการ อสม.
2. เพิ่ม อสม. พร้อมเลขบัตรและเบอร์โทร

### 3.3 ทดสอบ Volunteer Login

1. ไปที่ `https://your-app.vercel.app/login`
2. ใส่เลขบัตร + เบอร์โทร ของ อสม.
3. ควรเห็นเฉพาะบ้านที่ตัวเองดูแล

---

## 🔄 Updates & Maintenance

### อัพเดทโค้ด

```bash
git add .
git commit -m "Update"
git push origin main
# Vercel จะ auto-deploy
```

### อัพเดท Database Schema

รันใน Supabase SQL Editor → ระวังเรื่อง Migration

---

## ⚠️ Security Notes

1. **ห้ามเผย `SUPABASE_SERVICE_ROLE_KEY`** - bypass RLS ได้ทุกอย่าง
2. **ตรวจสอบ RLS** - ทดสอบว่า อสม. เห็นเฉพาะข้อมูลตัวเอง
3. **Rate Limiting** - ล็อค 15 นาทีหลังล้มเหลว 5 ครั้ง
4. **Audit Logs** - ดูได้ผ่าน Supabase → Table Editor → audit_logs

---

## 🆘 Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| Login ไม่ได้ | เช็ค Environment Variables |
| อสม. ไม่เห็นข้อมูล | เช็คว่ารัน SQL แล้ว + link auth_user_id |
| Rate limit ถูกล็อค | รอ 15 นาที หรือลบใน rate_limits table |
| Build failed | รัน `npm run build` ในเครื่องก่อน push |

---

## 📞 Support

ติดต่อผู้พัฒนา: [sorawit.tro@pccpl.ac.th]
