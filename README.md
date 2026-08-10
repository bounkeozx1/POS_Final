# POS-SST — The Ground Camp

ระบบ POS + Self-Ordering ทำงานบน **XAMPP (Apache + PHP + MySQL)**
ข้อมูลทั้งหมดอยู่ใน MySQL ไม่มีโหมดสำรองที่เก็บในเบราว์เซอร์

## เปิดใช้งาน

1. เปิด XAMPP Control Panel → Start **Apache** และ **MySQL**
2. import `database.sql` ใน phpMyAdmin (ได้ฐานข้อมูล `pos_ground_camp` พร้อมข้อมูลตั้งต้น)
3. เปิดเบราว์เซอร์:

| หน้า | URL | ล็อกอิน |
|------|-----|---------|
| ลูกค้า (Self-Ordering) | http://localhost/POS-SST-main/ | — |
| แอดมิน | http://localhost/POS-SST-main/admin.html | `admin` / `1234` |

> ต้องเปิดผ่าน `http://localhost/...` เท่านั้น
> เปิดไฟล์ตรง ๆ (`file://`) หรือผ่าน static server อื่นจะขึ้นหน้า error เพราะ PHP ไม่ทำงาน

รายละเอียดการติดตั้ง การพิสูจน์ว่าเชื่อม DB จริง และข้อจำกัดที่ทราบ อยู่ใน [SETUP.md](SETUP.md)
