# วิธีแก้ไขปัญหา TypeScript ใน Firebase ด้วยตนเอง

หากสคริปต์ `firebase-fix.js` ไม่ทำงาน คุณสามารถแก้ไขไฟล์ด้วยตนเองตามคำแนะนำนี้

## 1. แก้ไขไฟล์ src/index.ts หรือ functions/src/index.ts

เปลี่ยนจาก:
```typescript
import * as express from 'express';
import * as cors from 'cors';
```

เป็น:
```typescript
import express from 'express';
import cors from 'cors';
```

## 2. แก้ไขไฟล์ src/routes.ts หรือ functions/src/routes.ts

เปลี่ยนจาก:
```typescript
import * as promptpay from 'promptpay-qr';
```

เป็น:
```typescript
import promptpay from 'promptpay-qr';
```

และที่ฟังก์ชัน generate-promptpay-qr ให้เพิ่ม `return;` ในบรรทัดที่มีปัญหา:
```typescript
app.post('/api/generate-promptpay-qr', async (req, res) => {
  // ... code ...
  // เพิ่มตรงนี้ถ้าไม่มี return อยู่แล้ว
  return;
});
```

## 3. แก้ไขไฟล์ src/firestoreStorage.ts หรือ functions/src/firestoreStorage.ts

เปลี่ยนจาก:
```typescript
import * as bcrypt from 'bcrypt';

export class FirestoreStorage implements IStorage {
  // ...
  const newSetting: Setting = { ...setting, id: nextId };
  // ...
}

export const storage: IStorage = new FirestoreStorage();
```

เป็น:
```typescript
import bcrypt from 'bcrypt';

export class FirestoreStorage {
  // ...
  const newSetting = { ...setting, id: nextId };
  // ...
}

export const storage = new FirestoreStorage();
```

## 4. แก้ไขไฟล์ functions/tsconfig.json

เพิ่มตัวเลือกต่อไปนี้ในส่วน compilerOptions:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    // ... options อื่นๆ คงเดิม
  }
}
```

## 5. รันคำสั่ง deploy อีกครั้ง

```bash
firebase deploy
```