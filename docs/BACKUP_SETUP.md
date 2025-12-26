# วิธีตั้งค่า GitHub Actions Backup ไป Google Drive

## ขั้นตอนที่ 1: สร้าง Rclone Config

### 1.1 ติดตั้ง Rclone ในเครื่อง
```bash
# Windows (PowerShell)
winget install Rclone.Rclone

# หรือดาวน์โหลดจาก https://rclone.org/downloads/
```

### 1.2 ตั้งค่า Google Drive
```bash
rclone config
```

ทำตามขั้นตอน:
1. เลือก `n` (New remote)
2. ตั้งชื่อ: `gdrive`
3. เลือก `drive` (Google Drive)
4. client_id: กด Enter (ใช้ default)
5. client_secret: กด Enter (ใช้ default)
6. scope: เลือก `1` (Full access)
7. root_folder_id: กด Enter (ใช้ root)
8. service_account_file: กด Enter (ไม่ใช้)
9. Edit advanced config: `n`
10. Use auto config: `y`
11. จะเปิด Browser ให้ Login Google และอนุญาต
12. Team Drive: `n`
13. เสร็จแล้วกด `y` เพื่อ confirm

### 1.3 ดู Config ที่สร้าง
```bash
# Windows
type %APPDATA%\rclone\rclone.conf

# Linux/Mac
cat ~/.config/rclone/rclone.conf
```

---

## ขั้นตอนที่ 2: หา Supabase Database URL

1. ไปที่ **Supabase Dashboard** → **Project Settings** → **Database**
2. หา **Connection string** → **URI**
3. จะได้ URL ประมาณนี้:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## ขั้นตอนที่ 3: ตั้งค่า GitHub Secrets

ไปที่ **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

เพิ่ม 2 Secrets:

### RCLONE_CONFIG
Copy ทั้งหมดจาก `rclone.conf`:
```ini
[gdrive]
type = drive
client_id = 
client_secret = 
scope = drive
token = {"access_token":"...","token_type":"Bearer","refresh_token":"...","expiry":"..."}
team_drive = 
```

### SUPABASE_DB_URL
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## ขั้นตอนที่ 4: ทดสอบ

1. ไปที่ **GitHub** → **Actions** → **Backup Supabase to Google Drive**
2. กด **Run workflow** → **Run workflow**
3. รอดูผลลัพธ์

---

## ตารางการ Backup

| รายการ | ค่า |
|--------|-----|
| ความถี่ | ทุกวัน 09:00 เวลาไทย |
| เก็บไว้ | 30 วันล่าสุด |
| ตำแหน่ง | Google Drive: `Backups/anamai-db/` |

---

## การ Restore

```bash
# ดาวน์โหลด backup จาก Google Drive
rclone copy gdrive:Backups/anamai-db/supabase_backup_YYYYMMDD_HHMMSS.sql.gz ./

# แตกไฟล์
gunzip supabase_backup_YYYYMMDD_HHMMSS.sql.gz

# Restore ไป Supabase
psql "postgresql://..." -f supabase_backup_YYYYMMDD_HHMMSS.sql
```

---

## ⚠️ หมายเหตุสำคัญ

1. **ห้ามเผย Secrets** - Database URL และ Rclone config มี credentials
2. **ตรวจสอบ Backup** - ควรทดสอบ restore เป็นประจำ
3. **Token Expiry** - Google OAuth token อาจหมดอายุ ต้อง rclone config ใหม่
