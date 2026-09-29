# Rich Menu และการส่งต่อแอดมิน

ไฟล์ภาพเมนูอยู่ที่ `public/rich-menu/sby-modes.png` และ action ของเมนูอยู่ใน `src/richMenu.js`:

- `mode=general` — โหมดคำถามทั่วไป
- `mode=scholarship` — โหมดทุนช้างเผือก
- `mode=admin` — โหมดติดต่อแอดมิน

ตั้งค่า token ใน `.env` แล้วรันจากเครื่องที่เชื่อม LINE Channel:

```powershell
npm install
npm run menu:setup
```

ระบบจะสร้างหรือใช้ Rich Menu ชื่อ `SBY Chatbot Modes v1` และตั้งเป็น default menu

## ตั้งค่าแอดมิน

1. ให้บัญชีแอดมินเพิ่ม Official Account เป็นเพื่อน
2. ส่ง `/my-id` ให้บอต
3. นำ LINE user ID ที่บอตตอบกลับไปใส่ `ADMIN_USER_ID` ใน Hostinger
4. Redeploy แอป

เมื่อผู้ใช้เลือกโหมดติดต่อแอดมิน ข้อความจะถูกส่งไปยังบัญชีนี้พร้อม ticket เช่น `T12AB34` แอดมินตอบกลับด้วย:

```text
ตอบ T12AB34 ข้อความที่ต้องการส่งให้ผู้ใช้
```

ticket อยู่ในหน่วยความจำของ process และหมดเมื่อแอป restart หากต้องการระบบ ticket ถาวร ควรเพิ่มฐานข้อมูลหรือ Redis ในขั้นต่อไป

