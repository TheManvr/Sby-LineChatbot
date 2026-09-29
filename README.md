# SBY LINE Chatbot

LINE chatbot สำหรับโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน รุ่นแรกตอบเฉพาะคำถามเรื่อง **ทุนช้างเผือก ปีการศึกษา 2570** โดยใช้ข้อมูลจากประกาศของโรงเรียนลงวันที่ 28 กันยายน 2569

## ความสามารถปัจจุบัน

- ตอบคุณสมบัติ วันสมัคร ค่าสมัคร เลขบัญชี วันและเวลาสอบ วิชาสอบ จำนวนทุน เงื่อนไข GPAX เกียรติบัตร และวันประกาศผล
- ปฏิเสธคำถามนอกขอบเขตอย่างสุภาพ เช่น ค่าเครื่องแบบหรือเรื่องทั่วไปของโรงเรียน
- ใช้ OpenAI API และชื่อตัวแปร environment แบบเดียวกับ CyberGuardBot
- หาก AI ใช้งานไม่ได้ ระบบยังตอบคำถามหลักจากข้อมูลที่ตรวจทานแล้วได้
- ไม่บันทึกข้อความผู้ใช้ LINE user ID token หรือ secret ลง log
- แยกคลังข้อมูลเป็น `data/topics/` เพื่อเพิ่มเรื่องเครื่องแบบ ค่าเทอม ปฏิทิน หรือหัวข้ออื่นในอนาคต

## การทำงาน

1. LINE ส่ง event มาที่ `POST /webhook`
2. LINE SDK ตรวจลายเซ็นด้วย `LINE_CHANNEL_SECRET`
3. ระบบค้นเฉพาะข้อมูลทุนที่เกี่ยวข้องกับคำถาม
4. ถ้าเปิด AI ระบบส่งเฉพาะข้อความคำถามและข้อมูลที่ค้นพบให้ OpenAI เรียบเรียง โดยกำชับให้ตอบจากข้อมูลนั้นเท่านั้น
5. ถ้า AI ปิด ใช้งานเกินโควตา หรือเกิดข้อผิดพลาด ระบบตอบด้วยข้อความที่ตรวจทานไว้ในคลังข้อมูล

## ตั้งค่า

ในโปรเจกต์มีไฟล์ `.env` จริงเตรียมช่องไว้ให้แล้ว (ไฟล์นี้ถูก `.gitignore` และไม่ควร commit) ใช้ Node.js 22 ขึ้นไป แล้วกรอกค่าต่อไปนี้:

```dotenv
LINE_CHANNEL_ACCESS_TOKEN=ใส่ Channel access token ของ LINE Developers
LINE_CHANNEL_SECRET=ใส่ Channel secret ของ LINE Developers
PORT=3000
AI_ANALYSIS_ENABLED=false
OPENAI_API_KEY=ใส่ API key เดียวกับ CyberGuardBot
OPENAI_MODEL=gpt-5.4-nano
AI_REQUESTS_PER_HOUR=30
```

ค่าเริ่มต้น `AI_ANALYSIS_ENABLED=false` ทำให้บอตตอบจากข้อมูลที่ตรวจทานแล้วได้ทันทีโดยไม่ต้องมี OpenAI key เมื่อกรอก `OPENAI_API_KEY` แล้วให้เปลี่ยนเป็น `AI_ANALYSIS_ENABLED=true` เพื่อเปิดการเรียบเรียงคำตอบด้วย API เดียวกับ CyberGuardBot ห้าม commit ไฟล์ `.env` หรือ secret ใด ๆ ขึ้น GitHub

## รันในเครื่อง

```powershell
npm install
npm run check:knowledge
npm test
npm run dev
```

ตรวจสถานะที่ `http://localhost:3000/health` หากต้องทดสอบ LINE webhook ในเครื่อง ให้เปิด HTTPS tunnel แล้วนำ URL ที่ลงท้ายด้วย `/webhook` ไปใส่ใน LINE Developers Console

## Deploy บน Hostinger

ค่าหลักใช้แนวเดียวกับ CyberGuardBot:

- Node.js: `22.x`
- Package manager: `npm`
- Build/install command: `npm ci`
- Start command: `npm start`
- Entry file: `index.js`
- Health check: `/health`
- LINE webhook: `https://โดเมนของบอต/webhook`

ตั้ง environment variables จาก `.env.example` ในหน้า Hostinger โดยใช้ LINE Channel access token และ Channel secret ของ Official Account โรงเรียน ส่วน `OPENAI_API_KEY` ใช้ API key เดียวกับ CyberGuardBot ได้ หลัง deploy ให้กด **Verify** webhook ใน LINE Developers Console และเปิด **Use webhook**

## ตัวอย่างคำถาม

- สมัครวันไหน
- ค่าสมัครเท่าไร โอนบัญชีไหน
- ป.5 สมัครสอบระดับ ม.1 ได้ไหม
- ม.2 สมัครสอบระดับ ม.4 ได้ไหม
- สอบวันไหนและกี่โมง
- ต้องเอาเอกสารอะไรไปสอบ
- ทุนได้กี่บาท และต้องรักษาเกรดเท่าไร
- ประกาศผลวันไหน

## เพิ่มหัวข้อในอนาคต

ดูรูปแบบและขั้นตอนใน `docs/KNOWLEDGE_BASE.md` ระบบถูกเตรียมให้เพิ่มไฟล์หัวข้อใหม่ใน `data/topics/` โดยไม่ต้องเปลี่ยน webhook หรือการเชื่อม LINE

## ทดสอบ

```powershell
npm run check:knowledge
npm test
```

GitHub Actions จะตรวจคลังข้อมูล รัน tests และตรวจ dependency ทุกครั้งที่ push หรือเปิด pull request
