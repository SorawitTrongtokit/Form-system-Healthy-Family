// Health Calculations - BMI, Weight/Height Criteria
import { AgeGroup } from './types';

// คำนวณ BMI
export function calculateBMI(weight: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

// คำนวณอายุจากวันเกิด
export function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// คำนวณอายุเป็นเดือน (สำหรับเด็ก 0-5 ปี)
export function calculateAgeInMonths(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}

// กำหนดกลุ่มอายุ
export function getAgeGroup(age: number): AgeGroup {
    if (age <= 5) return '0-5';
    if (age <= 14) return '6-14';
    if (age <= 18) return '15-18';
    if (age <= 59) return '19-59';
    return '60+';
}

// ชื่อกลุ่มอายุภาษาไทย
export function getAgeGroupLabel(ageGroup: AgeGroup): string {
    const labels: Record<AgeGroup, string> = {
        '0-5': 'อายุ 0-5 ปี',
        '6-14': 'อายุ 6-14 ปี',
        '15-18': 'อายุ 15-18 ปี',
        '19-59': 'อายุ 19-59 ปี',
        '60+': 'อายุ 60 ปีขึ้นไป'
    };
    return labels[ageGroup];
}

// เกณฑ์น้ำหนักตามอายุ (สำหรับเด็ก 0-5 ปี) - อ้างอิง WHO
// ค่าโดยประมาณ ควรใช้ตารางจริงจาก WHO
const weightForAgeBoys: Record<number, { min: number; max: number }> = {
    0: { min: 2.5, max: 4.4 },
    6: { min: 6.4, max: 9.8 },
    12: { min: 7.7, max: 12.0 },
    24: { min: 9.7, max: 15.3 },
    36: { min: 11.3, max: 18.3 },
    48: { min: 12.7, max: 21.2 },
    60: { min: 14.1, max: 24.2 },
};

const weightForAgeGirls: Record<number, { min: number; max: number }> = {
    0: { min: 2.4, max: 4.2 },
    6: { min: 5.8, max: 9.3 },
    12: { min: 7.0, max: 11.5 },
    24: { min: 9.0, max: 14.8 },
    36: { min: 10.8, max: 18.1 },
    48: { min: 12.3, max: 21.5 },
    60: { min: 13.7, max: 24.9 },
};

// คำนวณเกณฑ์น้ำหนักตามอายุ
export function getWeightCriteria(
    weight: number,
    ageMonths: number,
    gender: 'male' | 'female'
): 'normal' | 'underweight' | 'overweight' {
    const table = gender === 'male' ? weightForAgeBoys : weightForAgeGirls;
    const nearestAge = Object.keys(table)
        .map(Number)
        .reduce((prev, curr) =>
            Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev
        );

    const range = table[nearestAge];
    if (!range) return 'normal';

    if (weight < range.min) return 'underweight';
    if (weight > range.max) return 'overweight';
    return 'normal';
}

// เกณฑ์ส่วนสูงตามอายุ (สำหรับเด็ก 0-5 ปี)
const heightForAgeBoys: Record<number, { min: number; max: number }> = {
    0: { min: 46.1, max: 53.7 },
    6: { min: 63.3, max: 71.9 },
    12: { min: 71.0, max: 80.5 },
    24: { min: 81.7, max: 93.9 },
    36: { min: 88.7, max: 103.5 },
    48: { min: 94.9, max: 111.7 },
    60: { min: 100.7, max: 119.2 },
};

const heightForAgeGirls: Record<number, { min: number; max: number }> = {
    0: { min: 45.4, max: 52.9 },
    6: { min: 61.2, max: 70.3 },
    12: { min: 68.9, max: 79.2 },
    24: { min: 80.0, max: 92.9 },
    36: { min: 87.4, max: 102.7 },
    48: { min: 94.1, max: 111.3 },
    60: { min: 99.9, max: 118.9 },
};

// คำนวณเกณฑ์ส่วนสูงตามอายุ
export function getHeightCriteria(
    height: number,
    ageMonths: number,
    gender: 'male' | 'female'
): 'normal' | 'short' | 'tall' {
    const table = gender === 'male' ? heightForAgeBoys : heightForAgeGirls;
    const nearestAge = Object.keys(table)
        .map(Number)
        .reduce((prev, curr) =>
            Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev
        );

    const range = table[nearestAge];
    if (!range) return 'normal';

    if (height < range.min) return 'short';
    if (height > range.max) return 'tall';
    return 'normal';
}

// คำนวณเกณฑ์น้ำหนักตามส่วนสูง
export function getWeightForHeightCriteria(
    weight: number,
    height: number,
    gender: 'male' | 'female'
): 'normal' | 'underweight' | 'overweight' {
    // ใช้ BMI-for-age สำหรับความง่าย
    const bmi = calculateBMI(weight, height);

    // เกณฑ์ BMI สำหรับเด็ก (โดยทั่วไป)
    if (bmi < 14) return 'underweight';
    if (bmi > 18) return 'overweight';
    return 'normal';
}

// ตรวจสอบผ่านเกณฑ์สุขภาพตามกลุ่มอายุ
export function checkPassedCriteria(
    ageGroup: AgeGroup,
    data: Record<string, unknown>
): boolean {
    switch (ageGroup) {
        case '0-5':
            return (
                data.weight_criteria === 'normal' &&
                data.height_criteria === 'normal' &&
                data.vaccination === 'complete' &&
                data.development === 'normal'
            );
        case '6-14':
            return (
                data.weight_criteria === 'normal' &&
                data.height_criteria === 'normal' &&
                data.vaccination === 'complete' &&
                data.development === 'normal' &&
                (data.oral_health === 'normal' || data.oral_health === 'abnormal_treated')
            );
        case '15-18':
            return (
                data.alcohol === 'never' &&
                data.smoking === 'never' &&
                data.drug_use === 'never'
            );
        case '19-59':
        case '60+':
            return (
                (data.diabetes === 'no' || data.diabetes === 'hba1c_low') &&
                (data.hypertension === 'no' || data.hypertension === 'bp_controlled') &&
                data.dependency !== 'no_caregiver'
            );
        default:
            return false;
    }
}

// แปลงค่าเกณฑ์เป็นภาษาไทย
export const criteriaLabels = {
    weight_criteria: {
        normal: 'ปกติ',
        underweight: 'น้ำหนักต่ำกว่าเกณฑ์',
        overweight: 'น้ำหนักเกินเกณฑ์'
    },
    height_criteria: {
        normal: 'ปกติ',
        short: 'เตี้ยกว่าเกณฑ์',
        tall: 'สูงกว่าเกณฑ์'
    },
    weight_for_height: {
        normal: 'สมส่วน',
        underweight: 'ผอม',
        overweight: 'อ้วน'
    },
    vaccination: {
        complete: 'ครบตามช่วงอายุ',
        incomplete: 'ไม่ครบตามช่วงอายุ'
    },
    development: {
        normal: 'สมวัย',
        delayed_referred: 'ไม่สมวัย (ได้รับการส่งต่อ)',
        delayed: 'ไม่สมวัย'
    },
    iron_supplement: {
        received: 'ได้รับ',
        not_received: 'ไม่ได้รับ'
    },
    oral_health: {
        normal: 'ตรวจแล้วไม่พบความผิดปกติ',
        abnormal_treated: 'พบความผิดปกติ (ได้รับบริการส่งต่อ/แก้ไข)',
        abnormal_untreated: 'พบความผิดปกติ (ยังไม่ได้รับบริการ)',
        not_checked: 'ไม่ได้รับการตรวจ'
    },
    alcohol: {
        regular: 'ดื่มเป็นประจำ',
        occasional: 'ดื่มเป็นครั้งคราว',
        never: 'ไม่ดื่ม'
    },
    smoking: {
        regular: 'สูบเป็นประจำ',
        occasional: 'สูบเป็นครั้งคราว',
        never: 'ไม่สูบ'
    },
    drug_use: {
        used: 'เคยใช้',
        using: 'ใช้อยู่',
        never: 'ไม่ใช้'
    },
    diabetes: {
        no: 'ไม่ป่วย',
        hba1c_low: 'ป่วย HbA1C < 8.5',
        hba1c_high: 'ป่วย HbA1C > 8.6',
        other: 'อื่นๆ'
    },
    hypertension: {
        no: 'ไม่ป่วย',
        bp_controlled: 'ป่วย BP < 140/90 mmHg',
        bp_uncontrolled: 'ป่วย BP > 140/90 mmHg'
    },
    dependency: {
        independent: 'ดูแลตนเองได้',
        has_caregiver: 'ได้รับการดูแล Caregiver',
        no_caregiver: 'ไม่ได้รับการดูแล'
    }
};
