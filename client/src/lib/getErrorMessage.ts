/**
 * ฟังก์ชั่นสำหรับแปลง Error เป็นข้อความที่แสดงผลได้
 * รวมถึงจัดการกับกรณีพิเศษต่างๆ เช่น JSON parse error, DOMException
 * @param error ข้อผิดพลาดที่ต้องการแปลง
 * @returns ข้อความแสดงข้อผิดพลาด
 */
export function getErrorMessage(error: unknown): string {
  // กรณีที่เป็น Error object จริงๆ
  if (error instanceof Error) {
    // กรณี SyntaxError ที่เกิดจาก JSON parse
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return 'เกิดข้อผิดพลาดในการอ่านข้อมูลจากเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง';
    }
    
    // กรณี DOMException (เช่น CORS, Network error)
    if ('DOMException' in window && error instanceof DOMException) {
      if (error.name === 'NetworkError') {
        return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      }
      if (error.name === 'AbortError') {
        return 'การเชื่อมต่อถูกยกเลิก โปรดลองใหม่อีกครั้ง';
      }
      return `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.name}`;
    }
    
    // สำหรับ Error ทั่วไป
    return error.message;
  }
  
  // สำหรับข้อความ error โดยตรง
  if (typeof error === 'string') {
    return error;
  }
  
  // กรณีที่เป็น object ที่มี message property
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  
  // สำหรับกรณีที่ไม่สามารถระบุข้อผิดพลาดได้แน่ชัด
  console.error('Unknown error object', error);
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ โปรดลองใหม่อีกครั้ง';
}