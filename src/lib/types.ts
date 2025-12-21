// Database Types for the Health Form System

// อาสาสมัคร (Volunteers)
export interface Volunteer {
    id: string;
    national_id: string;      // เลขบัตรประชาชน (ใช้ login)
    name: string;             // ชื่อ-สกุล
    phone?: string;           // เบอร์โทร
}

// บ้าน (Houses)
export interface House {
    id: string;
    house_number: string;     // บ้านเลขที่
    village_no: number;       // หมู่ที่ (1-6)
    volunteer_id: string;     // อาสาสมัครที่รับผิดชอบ
    latitude?: number;        // พิกัด GPS
    longitude?: number;
    photo_url?: string;       // รูปบ้าน
}

// ประชากร (Residents)
export interface Resident {
    id: string;
    national_id: string;      // เลขบัตรประชาชน
    prefix: string;           // คำนำหน้า
    first_name: string;
    last_name: string;
    birth_date: string;       // วันเกิด (YYYY-MM-DD)
    gender: 'male' | 'female';
    house_id: string;         // บ้านที่อาศัย
    relationship: string;     // ความสัมพันธ์กับเจ้าบ้าน
    disease?: string;
}

// กลุ่มอายุ
export type AgeGroup = '0-5' | '6-14' | '15-18' | '19-59' | '60+';

// ข้อมูลสุขภาพ (Health Records)
export interface HealthRecord {
    id: string;
    resident_id: string;
    house_id: string;
    record_date: string;
    age_group: AgeGroup;
    weight: number;
    height: number;
    bmi?: number;

    // กลุ่ม 0-5 ปี
    weight_criteria?: 'normal' | 'underweight' | 'overweight';
    height_criteria?: 'normal' | 'short' | 'tall';
    weight_for_height?: 'normal' | 'underweight' | 'overweight';
    vaccination?: 'complete' | 'incomplete';
    development?: 'normal' | 'delayed_referred' | 'delayed';
    iron_supplement?: 'received' | 'not_received';

    // กลุ่ม 6-14 ปี (เพิ่มเติม)
    oral_health?: 'normal' | 'abnormal_treated' | 'abnormal_untreated' | 'not_checked';

    // กลุ่ม 15-18 ปี
    alcohol?: 'regular' | 'occasional' | 'never';
    smoking?: 'regular' | 'occasional' | 'never';
    drug_use?: 'used' | 'using' | 'never';

    // กลุ่ม 19-59 และ 60+ ปี
    diabetes?: 'no' | 'hba1c_low' | 'hba1c_high' | 'other';
    hypertension?: 'no' | 'bp_controlled' | 'bp_uncontrolled';
    dependency?: 'independent' | 'has_caregiver' | 'no_caregiver';

    // ข้อมูลทั่วไป
    passed_criteria?: boolean;
    notes?: string;
}

// สำหรับแสดงข้อมูลบ้านพร้อมสถิติ
export interface HouseWithStats extends House {
    total_residents: number;
    surveyed_count: number;
    passed_count: number;
    failed_count: number;
    residents?: Resident[];
}

// สำหรับแสดงข้อมูลประชากรพร้อมอายุ
export interface ResidentWithAge extends Resident {
    age: number;
    age_group: AgeGroup;
    has_record: boolean;
}
