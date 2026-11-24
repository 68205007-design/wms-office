# ระบบเบิก-จ่ายวัสดุสำนักงาน (Office WMS)

Web Application สำหรับจัดการคลังวัสดุสำนักงาน ครอบคลุมการรับเข้า ขอเบิก อนุมัติ ตัดสต็อก รายงาน และการแจ้งเตือน
เชื่อมต่อ Frontend ↔ Backend ↔ MySQL จริง

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts, Axios, Lucide React, React Router |
| Backend | Node.js + Express, Prisma ORM, JWT, bcrypt, Zod (validation), Helmet, Rate limit |
| Database | MySQL 8 |

## ฟีเจอร์หลัก

- **ระบบล็อกอิน** JWT + bcrypt, ออกจากระบบ, เปลี่ยนรหัสผ่าน, session ถูกยกเลิกทุกอุปกรณ์เมื่อออกจากระบบ/เปลี่ยนรหัสผ่าน/ถูกเปลี่ยนสิทธิ์
- **4 Role**: ผู้ดูแลระบบ (ADMIN), เจ้าหน้าที่คลัง (WAREHOUSE), ผู้อนุมัติ (APPROVER), ผู้ใช้งานทั่วไป (USER) ตรวจสิทธิ์ทั้งฝั่ง UI และ API
- **Dashboard**: สถิติ 6 การ์ด, กราฟเบิก/รับรายเดือน, กราฟเปรียบเทียบ, กราฟประเภทวัสดุ, วัสดุใกล้หมด, รายการเบิกล่าสุด
- **คลังวัสดุ**: CRUD + อัปโหลดรูป, ค้นหาตามรหัส/ชื่อ, กรองหมวดหมู่/สถานะ, pagination, ดูความเคลื่อนไหว
- **รับเข้าวัสดุ**: หลายรายการต่อเอกสาร, เพิ่มยอดอัตโนมัติ, เก็บประวัติและผู้ดำเนินการ
- **ขอเบิก**: หลายรายการต่อคำขอ, ตรวจยอดคงเหลือ, สถานะเริ่มต้น "รออนุมัติ"
- **อนุมัติ**: ตัดสต็อกใน DB Transaction, ป้องกันตัดซ้ำ 3 ชั้น (ล็อกสถานะแบบมีเงื่อนไข + ตัดเฉพาะเมื่อยอดพอ + unique index), ไม่อนุมัติพร้อมเหตุผล
- **ประวัติ / รายงาน 8 ประเภท**: เลือกช่วงวันที่, กราฟ, Export Excel, Export PDF/พิมพ์ (รองรับภาษาไทย)
- **ตั้งค่า**: ผู้ใช้, หมวดหมู่, หน่วยนับ, หน่วยงาน, จำนวนขั้นต่ำ, การแจ้งเตือน, ข้อมูลหน่วยงาน, Audit Log
- **แจ้งเตือน**: วัสดุใกล้หมด/หมด, คำขอใหม่, รออนุมัติ, อนุมัติ/ไม่อนุมัติ พร้อมจำนวนที่ยังไม่อ่าน

## โครงสร้างโปรเจกต์

```
wms/
├── backend/
│   ├── prisma/schema.prisma      # ตาราง 11 ตาราง (users, materials, categories, units, stock_transactions,
│   │                             #   requisitions, requisition_items, notifications, departments, audit_logs, settings)
│   ├── prisma/seed.js            # ข้อมูลทดสอบ + ประวัติย้อนหลัง 12 เดือน
│   ├── scripts/smoke-test.js     # ทดสอบ API end-to-end
│   └── src/  (app.js, server.js, routes/, middleware/, utils/, lib/)
├── frontend/
│   └── src/  (pages/, components/, context/, api/, utils/)
├── .github/workflows/            # CI (ทดสอบกับ MySQL จริง) + Deploy GitHub Pages
├── docker-compose.yml            # MySQL สำหรับพัฒนา
└── start-dev.bat                 # เปิดระบบบน Windows
```

## วิธีติดตั้งและเปิดใช้งาน (เครื่องตัวเอง)

ต้องมี **Node.js 18+** และ **MySQL 8** (ติดตั้งเอง, XAMPP/MariaDB 10.5+ หรือ `docker compose up -d`)

```bash
# 1) สร้างฐานข้อมูล (ถ้าไม่ใช้ docker)
#    CREATE DATABASE wms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2) Backend
cd backend
cp .env.example .env          # แก้ DATABASE_URL และ JWT_SECRET
npm install
npm run db:migrate            # สร้าง migration แรก + ตาราง (หรือ npm run db:push)
npm run db:seed               # ข้อมูลทดสอบ
npm run dev                   # http://localhost:4000/api

# 3) Frontend (หน้าต่างใหม่)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### ติดตั้งแบบคลิกเดียวบน Windows

1. ดับเบิลคลิก `scripts\setup.bat` — ถามข้อมูล MySQL, สร้าง `.env`, ติดตั้ง, สร้างตาราง, seed, รัน smoke test, build (บันทึกผลใน `scripts\setup.log`)
2. ดับเบิลคลิก `start-dev.bat` — เปิด Backend + Frontend แล้วเปิดเบราว์เซอร์
3. ดับเบิลคลิก `scripts\push-github.bat` — สร้าง repo `wms-office` บน GitHub, push โค้ด และเปิด GitHub Pages
ทดสอบ API ทั้งระบบ: `cd backend && npm run smoke`

### บัญชีทดสอบ

| บทบาท | Username | Password |
|---|---|---|
| ผู้ดูแลระบบ | admin | Admin@1234 |
| เจ้าหน้าที่คลัง | warehouse | Store@1234 |
| ผู้อนุมัติ | approver | Approve@1234 |
| ผู้ใช้งานทั่วไป | user | User@1234 |

> `npm run db:seed` จะ **ล้างข้อมูลเดิมทั้งหมด** แล้วสร้างข้อมูลทดสอบใหม่ (ใน production ต้องใส่ `--force`)

## Deploy บน GitHub

GitHub Pages เสิร์ฟได้เฉพาะไฟล์ static จึงแยกเป็น 2 ส่วน:

1. **Backend + MySQL** — ขึ้นบริการที่รัน Node ได้ เช่น Render (มี `render.yaml`) / Railway
   คู่กับ MySQL บนคลาวด์ (Railway MySQL, Aiven, TiDB Cloud) ตั้งค่า env:
   `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=https://<user>.github.io`, `PUBLIC_URL=https://<backend>`
2. **Frontend → GitHub Pages**
   - Repo → Settings → Pages → Source: **GitHub Actions**
   - Settings → Secrets and variables → Actions → **Variables** → `VITE_API_URL` = `https://<backend>/api`
   - push ไป `main` แล้ว workflow `deploy-pages.yml` จะ build และ deploy ให้อัตโนมัติ

ทางเลือก: deploy เป็น server เดียว — build frontend (`npm run build`) แล้ว backend จะเสิร์ฟ `frontend/dist` ให้เอง

> หมายเหตุ: รูปวัสดุเก็บในโฟลเดอร์ `backend/uploads` บนบริการฟรีที่ไม่มี persistent disk รูปอาจหายเมื่อรีสตาร์ต

## API หลัก

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | /api/auth/login, /logout, /change-password · GET /api/auth/me | ทุกคน |
| GET/POST/PUT/DELETE | /api/materials | อ่าน: ทุกคน · เขียน: ADMIN, WAREHOUSE |
| GET/POST | /api/stock-in | ADMIN, WAREHOUSE |
| GET/POST | /api/requisitions, GET /api/requisitions/items | ทุกคน (USER เห็นเฉพาะของตนเอง) |
| POST | /api/requisitions/:id/approve, /reject | ADMIN, APPROVER |
| GET | /api/reports/{daily,monthly,yearly,stock,low-stock,receipts,popular,department} | ADMIN, WAREHOUSE, APPROVER |
| CRUD | /api/users · /api/departments · /api/categories · /api/units · /api/settings | ตาม Role |
| GET/PATCH | /api/notifications | เจ้าของ |
