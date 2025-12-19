// Validation functions for Thai National ID and dates

// ตรวจสอบเลขบัตรประชาชน 13 หลัก
export function validateThaiNationalId(id: string): { valid: boolean; message: string } {
    // ลบช่องว่างและขีด
    const cleanId = id.replace(/[\s-]/g, '');

    // ตรวจสอบความยาว
    if (cleanId.length !== 13) {
        return { valid: false, message: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
    }

    // ตรวจสอบว่าเป็นตัวเลขทั้งหมด
    if (!/^\d{13}$/.test(cleanId)) {
        return { valid: false, message: 'เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น' };
    }

    // ตรวจสอบ checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleanId[i]) * (13 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 10;
    if (checkDigit !== parseInt(cleanId[12])) {
        return { valid: false, message: 'เลขบัตรประชาชนไม่ถูกต้อง' };
    }

    return { valid: true, message: '' };
}

// ตรวจสอบวันที่
export function validateDate(dateStr: string): { valid: boolean; message: string } {
    const date = new Date(dateStr);
    const today = new Date();

    if (isNaN(date.getTime())) {
        return { valid: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' };
    }

    if (date > today) {
        return { valid: false, message: 'วันเกิดต้องไม่เกินวันปัจจุบัน' };
    }

    // ตรวจสอบว่าอายุไม่เกิน 120 ปี
    const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    if (date < maxAge) {
        return { valid: false, message: 'วันเกิดไม่ถูกต้อง' };
    }

    return { valid: true, message: '' };
}

// ตรวจสอบน้ำหนัก
export function validateWeight(weight: number): { valid: boolean; message: string } {
    if (weight <= 0) {
        return { valid: false, message: 'น้ำหนักต้องมากกว่า 0' };
    }
    if (weight > 300) {
        return { valid: false, message: 'น้ำหนักไม่ถูกต้อง' };
    }
    return { valid: true, message: '' };
}

// ตรวจสอบส่วนสูง
export function validateHeight(height: number): { valid: boolean; message: string } {
    if (height <= 0) {
        return { valid: false, message: 'ส่วนสูงต้องมากกว่า 0' };
    }
    if (height > 250) {
        return { valid: false, message: 'ส่วนสูงไม่ถูกต้อง' };
    }
    return { valid: true, message: '' };
}

// Format เลขบัตรประชาชนให้อ่านง่าย
export function formatNationalId(id: string): string {
    const clean = id.replace(/[\s-]/g, '');
    if (clean.length !== 13) return id;
    return `${clean[0]}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean[12]}`;
}

// แปลงวันที่เป็นรูปแบบไทย
export function formatThaiDate(dateStr: string): string {
    const date = new Date(dateStr);
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.

    return `${day} ${month} ${year}`;
}
