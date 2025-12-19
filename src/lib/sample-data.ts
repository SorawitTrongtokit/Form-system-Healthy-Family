// Sample data for testing - ข้อมูลตัวอย่างสำหรับทดสอบ
import { Volunteer, House, Resident, HealthRecord } from './types';

// เลขบัตรประชาชนตัวอย่าง (คำนวณ checksum ถูกต้อง)
// สูตร: sum = Σ(digit[i] * (13-i)) for i=0..11, checkDigit = (11 - (sum % 11)) % 10
const DEMO_IDS = {
    volunteer1: '1234567890121',  // 1-2345-67890-12-1
    volunteer2: '1234567890138',  // 1-2345-67890-13-8  
    volunteer3: '1234567890145',  // 1-2345-67890-14-5
};

// อาสาสมัครตัวอย่าง
export const sampleVolunteers: Volunteer[] = [
    {
        id: 'v1',
        national_id: DEMO_IDS.volunteer1,
        name: 'นายสมชาย ใจดี',
        phone: '081-234-5678'
    },
    {
        id: 'v2',
        national_id: DEMO_IDS.volunteer2,
        name: 'นางสาวสมหญิง รักษ์สุขภาพ',
        phone: '089-876-5432'
    },
    {
        id: 'v3',
        national_id: DEMO_IDS.volunteer3,
        name: 'นายสุขใจ ช่วยเหลือ',
        phone: '086-111-2222'
    }
];

// ฟังก์ชันสร้างเลขบัตรประชาชน (ใช้สำหรับประชากรอื่นๆ)
function makeId(base: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(base[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return base + checkDigit;
}

// บ้านตัวอย่าง
export const sampleHouses: House[] = [
    // อาสาสมัครคนที่ 1 รับผิดชอบหมู่ 1
    { id: 'h1', house_number: '11', village_no: 1, volunteer_id: 'v1', latitude: 15.0500, longitude: 100.4800 },
    { id: 'h2', house_number: '12', village_no: 1, volunteer_id: 'v1', latitude: 15.0505, longitude: 100.4805 },
    { id: 'h3', house_number: '13', village_no: 1, volunteer_id: 'v1', latitude: 15.0510, longitude: 100.4810 },

    // อาสาสมัครคนที่ 2 รับผิดชอบหมู่ 3
    { id: 'h4', house_number: '34', village_no: 3, volunteer_id: 'v2', latitude: 15.0600, longitude: 100.4900 },
    { id: 'h5', house_number: '35', village_no: 3, volunteer_id: 'v2', latitude: 15.0605, longitude: 100.4905 },
    { id: 'h6', house_number: '36', village_no: 3, volunteer_id: 'v2', latitude: 15.0610, longitude: 100.4910 },

    // อาสาสมัครคนที่ 3 รับผิดชอบหมู่ 5
    { id: 'h7', house_number: '51', village_no: 5, volunteer_id: 'v3', latitude: 15.0700, longitude: 100.5000 },
    { id: 'h8', house_number: '52', village_no: 5, volunteer_id: 'v3', latitude: 15.0705, longitude: 100.5005 },
    { id: 'h9', house_number: '53', village_no: 5, volunteer_id: 'v3', latitude: 15.0710, longitude: 100.5010 },
    { id: 'h10', house_number: '54', village_no: 5, volunteer_id: 'v3', latitude: 15.0715, longitude: 100.5015 },
];

// ประชากรตัวอย่าง - กระจายครอบคลุมทุกกลุ่มอายุ
export const sampleResidents: Resident[] = [
    // บ้านที่ 1 (h1) - ครอบครัวที่มีเด็กเล็ก
    { id: 'r1', national_id: makeId('310150100001'), prefix: 'นาย', first_name: 'ประสิทธิ์', last_name: 'มีสุข', birth_date: '1985-03-15', gender: 'male', house_id: 'h1', relationship: 'เจ้าบ้าน' },
    { id: 'r2', national_id: makeId('310150100002'), prefix: 'นาง', first_name: 'สุดา', last_name: 'มีสุข', birth_date: '1988-07-22', gender: 'female', house_id: 'h1', relationship: 'ภรรยา' },
    { id: 'r3', national_id: makeId('310150100003'), prefix: 'เด็กชาย', first_name: 'น้องนุ่น', last_name: 'มีสุข', birth_date: '2021-05-10', gender: 'male', house_id: 'h1', relationship: 'บุตร' },

    // บ้านที่ 2 (h2) - ครอบครัวผู้สูงอายุ
    { id: 'r4', national_id: makeId('310150200001'), prefix: 'นาย', first_name: 'สมบูรณ์', last_name: 'แข็งแรง', birth_date: '1955-01-20', gender: 'male', house_id: 'h2', relationship: 'เจ้าบ้าน' },
    { id: 'r5', national_id: makeId('310150200002'), prefix: 'นาง', first_name: 'มาลี', last_name: 'แข็งแรง', birth_date: '1958-11-05', gender: 'female', house_id: 'h2', relationship: 'ภรรยา' },

    // บ้านที่ 3 (h3) - ครอบครัวที่มีวัยรุ่น
    { id: 'r6', national_id: makeId('310150300001'), prefix: 'นาย', first_name: 'วิชัย', last_name: 'เจริญ', birth_date: '1975-08-12', gender: 'male', house_id: 'h3', relationship: 'เจ้าบ้าน' },
    { id: 'r7', national_id: makeId('310150300002'), prefix: 'นาง', first_name: 'จันทร์', last_name: 'เจริญ', birth_date: '1978-04-25', gender: 'female', house_id: 'h3', relationship: 'ภรรยา' },
    { id: 'r8', national_id: makeId('310150300003'), prefix: 'นาย', first_name: 'ธนกร', last_name: 'เจริญ', birth_date: '2008-09-30', gender: 'male', house_id: 'h3', relationship: 'บุตร' },

    // บ้านที่ 4 (h4) - ครอบครัวที่มีเด็กประถม
    { id: 'r9', national_id: makeId('310150400001'), prefix: 'นาย', first_name: 'สุรชัย', last_name: 'ดีเลิศ', birth_date: '1982-12-01', gender: 'male', house_id: 'h4', relationship: 'เจ้าบ้าน' },
    { id: 'r10', national_id: makeId('310150400002'), prefix: 'นาง', first_name: 'อรุณี', last_name: 'ดีเลิศ', birth_date: '1985-06-18', gender: 'female', house_id: 'h4', relationship: 'ภรรยา' },
    { id: 'r11', national_id: makeId('310150400003'), prefix: 'เด็กหญิง', first_name: 'น้องมิ้นท์', last_name: 'ดีเลิศ', birth_date: '2015-02-14', gender: 'female', house_id: 'h4', relationship: 'บุตร' },

    // บ้านที่ 5 (h5) - คนโสด
    { id: 'r12', national_id: makeId('310150500001'), prefix: 'นางสาว', first_name: 'พิมพ์ใจ', last_name: 'รักษ์ธรรม', birth_date: '1990-10-10', gender: 'female', house_id: 'h5', relationship: 'เจ้าบ้าน' },

    // บ้านที่ 6 (h6) - ครอบครัวใหญ่
    { id: 'r13', national_id: makeId('310150600001'), prefix: 'นาย', first_name: 'สมพงษ์', last_name: 'รวมญาติ', birth_date: '1960-05-05', gender: 'male', house_id: 'h6', relationship: 'เจ้าบ้าน' },
    { id: 'r14', national_id: makeId('310150600002'), prefix: 'นาง', first_name: 'ทองคำ', last_name: 'รวมญาติ', birth_date: '1963-09-15', gender: 'female', house_id: 'h6', relationship: 'ภรรยา' },
    { id: 'r15', national_id: makeId('310150600003'), prefix: 'นาย', first_name: 'ก้องเกียรติ', last_name: 'รวมญาติ', birth_date: '1988-01-25', gender: 'male', house_id: 'h6', relationship: 'บุตร' },
    { id: 'r16', national_id: makeId('310150600004'), prefix: 'นาง', first_name: 'ปิ่นทอง', last_name: 'รวมญาติ', birth_date: '1990-04-12', gender: 'female', house_id: 'h6', relationship: 'สะใภ้' },
    { id: 'r17', national_id: makeId('310150600005'), prefix: 'เด็กหญิง', first_name: 'น้องทราย', last_name: 'รวมญาติ', birth_date: '2020-08-20', gender: 'female', house_id: 'h6', relationship: 'หลาน' },

    // บ้านที่ 7 (h7) - ผู้สูงอายุอยู่คนเดียว
    { id: 'r18', national_id: makeId('310150700001'), prefix: 'นาย', first_name: 'สมศักดิ์', last_name: 'อยู่เดียว', birth_date: '1950-03-30', gender: 'male', house_id: 'h7', relationship: 'เจ้าบ้าน' },

    // บ้านที่ 8 (h8) - ครอบครัวมีวัยรุ่น
    { id: 'r19', national_id: makeId('310150800001'), prefix: 'นาย', first_name: 'ประเสริฐ', last_name: 'ศรีสุข', birth_date: '1972-07-07', gender: 'male', house_id: 'h8', relationship: 'เจ้าบ้าน' },
    { id: 'r20', national_id: makeId('310150800002'), prefix: 'นาง', first_name: 'สุมาลี', last_name: 'ศรีสุข', birth_date: '1975-12-12', gender: 'female', house_id: 'h8', relationship: 'ภรรยา' },
    { id: 'r21', national_id: makeId('310150800003'), prefix: 'นาย', first_name: 'ภูมิพัฒน์', last_name: 'ศรีสุข', birth_date: '2006-06-06', gender: 'male', house_id: 'h8', relationship: 'บุตร' },

    // บ้านที่ 9 (h9) - ครอบครัวเล็ก
    { id: 'r22', national_id: makeId('310150900001'), prefix: 'นาย', first_name: 'ชัยวัฒน์', last_name: 'สุขสันต์', birth_date: '1995-04-04', gender: 'male', house_id: 'h9', relationship: 'เจ้าบ้าน' },
    { id: 'r23', national_id: makeId('310150900002'), prefix: 'นาง', first_name: 'พลอยใส', last_name: 'สุขสันต์', birth_date: '1997-08-08', gender: 'female', house_id: 'h9', relationship: 'ภรรยา' },

    // บ้านที่ 10 (h10) - ครอบครัว 3 รุ่น
    { id: 'r24', national_id: makeId('310151000001'), prefix: 'นาย', first_name: 'สำราญ', last_name: 'มั่งมี', birth_date: '1948-01-01', gender: 'male', house_id: 'h10', relationship: 'เจ้าบ้าน' },
    { id: 'r25', national_id: makeId('310151000002'), prefix: 'นาง', first_name: 'สมใจ', last_name: 'มั่งมี', birth_date: '1952-05-15', gender: 'female', house_id: 'h10', relationship: 'ภรรยา' },
    { id: 'r26', national_id: makeId('310151000003'), prefix: 'นาย', first_name: 'มนตรี', last_name: 'มั่งมี', birth_date: '1978-09-20', gender: 'male', house_id: 'h10', relationship: 'บุตร' },
    { id: 'r27', national_id: makeId('310151000004'), prefix: 'นาง', first_name: 'นภาพร', last_name: 'มั่งมี', birth_date: '1980-11-25', gender: 'female', house_id: 'h10', relationship: 'สะใภ้' },
    { id: 'r28', national_id: makeId('310151000005'), prefix: 'เด็กชาย', first_name: 'ภูมิรพี', last_name: 'มั่งมี', birth_date: '2012-03-10', gender: 'male', house_id: 'h10', relationship: 'หลาน' },
    { id: 'r29', national_id: makeId('310151000006'), prefix: 'เด็กหญิง', first_name: 'พิมพ์มาดา', last_name: 'มั่งมี', birth_date: '2018-07-07', gender: 'female', house_id: 'h10', relationship: 'หลาน' },
    { id: 'r30', national_id: makeId('310151000007'), prefix: 'เด็กชาย', first_name: 'น้องบีม', last_name: 'มั่งมี', birth_date: '2023-01-15', gender: 'male', house_id: 'h10', relationship: 'หลาน' },
];

// ข้อมูลสุขภาพตัวอย่าง (บางส่วน)
export const sampleHealthRecords: HealthRecord[] = [
    // ผู้สูงอายุ - ผ่านเกณฑ์
    {
        id: 'hr1',
        resident_id: 'r4',
        house_id: 'h2',
        record_date: '2024-12-15',
        age_group: '60+',
        weight: 65,
        height: 168,
        bmi: 23.0,
        diabetes: 'no',
        hypertension: 'bp_controlled',
        dependency: 'independent',
        passed_criteria: true
    },
    // ผู้สูงอายุ - ไม่ผ่านเกณฑ์
    {
        id: 'hr2',
        resident_id: 'r18',
        house_id: 'h7',
        record_date: '2024-12-15',
        age_group: '60+',
        weight: 70,
        height: 165,
        bmi: 25.7,
        diabetes: 'hba1c_high',
        hypertension: 'bp_uncontrolled',
        dependency: 'no_caregiver',
        passed_criteria: false
    },
    // เด็กเล็ก - ผ่านเกณฑ์
    {
        id: 'hr3',
        resident_id: 'r3',
        house_id: 'h1',
        record_date: '2024-12-15',
        age_group: '0-5',
        weight: 15,
        height: 95,
        weight_criteria: 'normal',
        height_criteria: 'normal',
        weight_for_height: 'normal',
        vaccination: 'complete',
        development: 'normal',
        iron_supplement: 'received',
        passed_criteria: true
    }
];

// ฟังก์ชันค้นหาอาสาสมัครจากเลขบัตรประชาชน
export function findVolunteerByNationalId(nationalId: string): Volunteer | undefined {
    const cleanId = nationalId.replace(/[\s-]/g, '');
    return sampleVolunteers.find(v => v.national_id === cleanId);
}

// ฟังก์ชันค้นหาบ้านที่อาสาสมัครรับผิดชอบ
export function getHousesByVolunteerId(volunteerId: string): House[] {
    return sampleHouses.filter(h => h.volunteer_id === volunteerId);
}

// ฟังก์ชันค้นหาประชากรในบ้าน
export function getResidentsByHouseId(houseId: string): Resident[] {
    return sampleResidents.filter(r => r.house_id === houseId);
}

// ฟังก์ชันค้นหาข้อมูลสุขภาพของประชากร
export function getHealthRecordByResidentId(residentId: string): HealthRecord | undefined {
    return sampleHealthRecords.find(hr => hr.resident_id === residentId);
}
