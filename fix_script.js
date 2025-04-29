const fs = require('fs');
const path = require('path');

// อ่านไฟล์
const filePath = './client/src/components/admin/CustomizationOptionManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// แก้ไขทั้งสองตำแหน่งโดยใช้ความแตกต่างของบรรทัดก่อนหน้า
const oldString = '                            {type.label}';
const newString = '                            {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}';

// แก้ไขทุกตำแหน่ง
content = content.replace(new RegExp(oldString, 'g'), newString);

// บันทึกไฟล์
fs.writeFileSync(filePath, content, 'utf8');

console.log('แก้ไขเรียบร้อยแล้ว');
