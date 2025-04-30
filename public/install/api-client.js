/**
 * API Client สำหรับการติดตั้งระบบ
 */

// ตรวจสอบระบบก่อนการติดตั้ง
async function checkSystem() {
  try {
    const response = await fetch('/api/install/check');
    return await response.json();
  } catch (error) {
    console.error('Error checking system:', error);
    throw new Error('ไม่สามารถตรวจสอบระบบได้');
  }
}

// ทดสอบการเชื่อมต่อกับฐานข้อมูล
async function testDatabaseConnection(dbConfig) {
  try {
    const response = await fetch('/api/install/test-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dbConfig)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error testing database connection:', error);
    throw new Error('ไม่สามารถทดสอบการเชื่อมต่อฐานข้อมูลได้');
  }
}

// ติดตั้งระบบ
async function installSystem(installData) {
  try {
    const response = await fetch('/api/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(installData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error installing system:', error);
    throw new Error('ไม่สามารถติดตั้งระบบได้');
  }
}

// สร้างข้อความ URL สำหรับเชื่อมต่อฐานข้อมูลจากข้อมูลการเชื่อมต่อแบบแยกส่วน
function buildConnectionString(dbConfig) {
  if (dbConfig.type === 'url') {
    return dbConfig.url;
  }
  
  const { host, port, name, user, password } = dbConfig;
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

window.installApi = {
  checkSystem,
  testDatabaseConnection,
  installSystem,
  buildConnectionString
};