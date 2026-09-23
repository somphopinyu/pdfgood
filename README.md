# PDFgood - Client-Side PDF Merger Web App

**PDFgood** คือเว็บแอปพลิเคชันสำหรับรวมไฟล์ PDF หลายๆ ไฟล์เข้าด้วยกัน ที่ประมวลผลฝั่งเบราว์เซอร์ของผู้ใช้ **100% (Client-Side Processing)** ไม่มีการส่งไฟล์หรือข้อมูลใดๆ ออกไปยังเซิร์ฟเวอร์ภายนอก เหมาะสำหรับใช้งานส่วนตัว ปลอดภัยสูงสุด โฮสต์บน **GitHub Pages** ได้ฟรี และรองรับการใช้งานแบบ Offline (PWA)

![PDFgood Logo](assets/logo.svg)

---

## 🌟 ฟีเจอร์หลัก (Features)

* **100% Client-Side & Zero Data Transfer:** ไฟล์ PDF ถูกอ่านและสร้างใหม่ในหน่วยความจำ RAM ของเครื่องผู้ใช้ผ่าน JavaScript ปลอดภัย ข้อมูลไม่รั่วไหล
* **Drag & Drop Upload:** รองรับการลากไฟล์วาง หรือเลือกหลายไฟล์พร้อมกัน
* **Drag to Reorder (SortableJS):** สามารถลากสลับลำดับก่อน-หลังของไฟล์ PDF ก่อนทำการรวมได้ง่ายดาย
* **File Management:** แสดงจำนวนหน้าของแต่ละไฟล์ ลบไฟล์ที่ไม่ต้องการ หรือเลื่อนขึ้น-ลงได้
* **Fast Export:** ปุ่มรวมไฟล์สร้าง PDF ใหม่และดาวน์โหลดลงเครื่องโดยอัตโนมัติ
* **Offline PWA Support:** มี Service Worker และ Web Manifest สามารถติดตั้งลงเครื่อง Desktop/Mobile และเปิดใช้งานแม้อยู่ในสถานะไม่มีอินเทอร์เน็ต
* **Ad-free & Responsive:** หน้าจอสะอาดตา ไม่มีโฆษณา ใช้งานได้สะดวกลื่นไหลทั้งบนคอมพิวเตอร์ แท็บเล็ต และมือถือ

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

* **HTML5 / ES6+ JavaScript / CSS (Tailwind CSS)**
* **[pdf-lib](https://pdf-lib.js.org/):** Library ประมวลผลและสร้างไฟล์ PDF ฝั่ง Client-side
* **[SortableJS](https://sortablejs.github.io/Sortable/):** Library สำหรับจัดการ Drag & Drop สลับลำดับใน File List
* **Service Worker:** จัดการ Caching สำหรับการทำงานแบบ Offline (PWA)

---

## 🚀 การทดสอบใช้งานในเครื่อง (Local Setup)

### ผ่าน Laragon / Web Server
เนื่องจากโปรเจกต์นี้ตั้งอยู่ใน `c:\laragon\www\pdfgood` สามารถเปิดใช้งานได้ง่ายๆ ดังนี้:
1. เปิด Laragon และกด **Start All**
2. เปิดเบราว์เซอร์แล้วไปที่: `http://localhost/pdfgood`

### ผ่านการเปิดไฟล์โดยตรง
สามารถเปิดไฟล์ `index.html` บน Web Browser (เช่น Google Chrome, Microsoft Edge, Firefox) ได้ทันที

---

## 📦 การ Deploy ขึ้น GitHub Pages

1. **สร้าง Repository บน GitHub:**
   - ไปที่ [GitHub](https://github.com/new) แล้วสร้าง repository ใหม่ชื่อ `pdfgood` (หรือชื่อตามต้องการ)

2. **Push โค้ดขึ้น Repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for PDFgood"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/pdfgood.git
   git push -u origin main
   ```

3. **เปิดใช้งาน GitHub Pages:**
   - ไปที่ **Settings** ของ Repository บน GitHub
   - เมนูด้านซ้ายเลือก **Pages**
   - ในหัวข้อ **Build and deployment > Source**: เลือก `Deploy from a branch`
   - เลือก **Branch**: `main` และโฟลเดอร์ `/ (root)`
   - กด **Save**

4. **เข้าใช้งานเว็บไซต์:**
   - รอ 1-2 นาที GitHub จะสร้าง URL สำหรับเข้าใช้งาน เช่น `https://<YOUR_USERNAME>.github.io/pdfgood/`

---

## 🔒 ความปลอดภัยและความเป็นส่วนตัว (Privacy Notice)

* แอปพลิเคชันนี้ไม่มี Backend Server และไม่มีการใช้ Tracking Script หรือ Analytics ใดๆ
* กระบวนการรวมไฟล์เกิดขึ้นภายในเว็บบราวเซอร์ของคุณ (In-Browser Execution) 100%
