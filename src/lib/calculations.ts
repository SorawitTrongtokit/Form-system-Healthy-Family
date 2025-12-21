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

// เกณฑ์น้ำหนักตามอายุ - อ้างอิงตามมาตรฐานที่กำหนด
// Key = อายุเป็นเดือน, Value = น้ำหนักมาตรฐาน (กก.) ± 10%
const weightForAgeBoys: Record<number, { min: number; max: number }> = {
    0: { min: 2.97, max: 3.63 },      // แรกเกิด 3.3 กก.
    12: { min: 8.64, max: 10.56 },    // 1 ปี 9.6 กก.
    24: { min: 10.98, max: 13.42 },   // 2 ปี 12.2 กก.
    36: { min: 12.87, max: 15.73 },   // 3 ปี 14.3 กก.
    48: { min: 14.67, max: 17.93 },   // 4 ปี 16.3 กก.
    60: { min: 16.47, max: 20.13 },   // 5 ปี 18.3 กก.
    72: { min: 18.45, max: 22.55 },   // 6 ปี 20.5 กก.
    84: { min: 20.61, max: 25.19 },   // 7 ปี 22.9 กก.
    96: { min: 23.04, max: 28.16 },   // 8 ปี 25.6 กก.
    108: { min: 25.74, max: 31.46 },  // 9 ปี 28.6 กก.
    120: { min: 28.80, max: 35.20 },  // 10 ปี 32.0 กก.
    132: { min: 32.31, max: 39.49 },  // 11 ปี 35.9 กก.
    144: { min: 36.45, max: 44.55 },  // 12 ปี 40.5 กก.
    156: { min: 41.04, max: 50.16 },  // 13 ปี 45.6 กก.
    168: { min: 45.99, max: 56.21 },  // 14 ปี 51.1 กก.
    180: { min: 50.67, max: 61.93 },  // 15 ปี 56.3 กก.
    192: { min: 54.72, max: 66.88 },  // 16 ปี 60.8 กก.
    204: { min: 57.96, max: 70.84 },  // 17 ปี 64.4 กก.
    216: { min: 60.21, max: 73.59 },  // 18 ปี 66.9 กก.
};

const weightForAgeGirls: Record<number, { min: number; max: number }> = {
    0: { min: 2.88, max: 3.52 },      // แรกเกิด 3.2 กก.
    12: { min: 8.01, max: 9.79 },     // 1 ปี 8.9 กก.
    24: { min: 10.35, max: 12.65 },   // 2 ปี 11.5 กก.
    36: { min: 12.51, max: 15.29 },   // 3 ปี 13.9 กก.
    48: { min: 14.49, max: 17.71 },   // 4 ปี 16.1 กก.
    60: { min: 16.38, max: 20.02 },   // 5 ปี 18.2 กก.
    72: { min: 18.18, max: 22.22 },   // 6 ปี 20.2 กก.
    84: { min: 20.16, max: 24.64 },   // 7 ปี 22.4 กก.
    96: { min: 22.50, max: 27.50 },   // 8 ปี 25.0 กก.
    108: { min: 25.38, max: 31.02 },  // 9 ปี 28.2 กก.
    120: { min: 28.71, max: 35.09 },  // 10 ปี 31.9 กก.
    132: { min: 33.21, max: 40.59 },  // 11 ปี 36.9 กก.
    144: { min: 38.25, max: 46.75 },  // 12 ปี 42.5 กก.
    156: { min: 41.49, max: 50.71 },  // 13 ปี 46.1 กก.
    168: { min: 43.83, max: 53.57 },  // 14 ปี 48.7 กก.
    180: { min: 46.08, max: 56.32 },  // 15 ปี 51.2 กก.
    192: { min: 47.70, max: 58.30 },  // 16 ปี 53.0 กก.
    204: { min: 48.96, max: 59.84 },  // 17 ปี 54.4 กก.
    216: { min: 50.58, max: 61.82 },  // 18 ปี 56.2 กก.
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

// เกณฑ์ส่วนสูงตามอายุ - อ้างอิงตามมาตรฐานที่กำหนด
// Key = อายุเป็นเดือน, Value = ส่วนสูงมาตรฐาน (ซม.) ± 5%
const heightForAgeBoys: Record<number, { min: number; max: number }> = {
    0: { min: 47.41, max: 52.40 },    // แรกเกิด 49.9 ซม.
    12: { min: 71.92, max: 79.49 },   // 1 ปี 75.7 ซม.
    24: { min: 82.75, max: 91.46 },   // 2 ปี 87.1 ซม.
    36: { min: 91.30, max: 100.91 },  // 3 ปี 96.1 ซม.
    48: { min: 98.14, max: 108.47 },  // 4 ปี 103.3 ซม.
    60: { min: 104.50, max: 115.50 }, // 5 ปี 110.0 ซม.
    72: { min: 110.20, max: 121.80 }, // 6 ปี 116.0 ซม.
    84: { min: 115.62, max: 127.79 }, // 7 ปี 121.7 ซม.
    96: { min: 120.94, max: 133.67 }, // 8 ปี 127.3 ซม.
    108: { min: 125.97, max: 139.23 },// 9 ปี 132.6 ซม.
    120: { min: 130.91, max: 144.69 },// 10 ปี 137.8 ซม.
    132: { min: 135.95, max: 150.26 },// 11 ปี 143.1 ซม.
    144: { min: 141.65, max: 156.56 },// 12 ปี 149.1 ซม.
    156: { min: 148.20, max: 163.80 },// 13 ปี 156.0 ซม.
    168: { min: 155.04, max: 171.36 },// 14 ปี 163.2 ซม.
    180: { min: 160.55, max: 177.45 },// 15 ปี 169.0 ซม.
    192: { min: 163.50, max: 180.72 },// 16 ปี 172.1 ซม.
    204: { min: 165.40, max: 182.81 },// 17 ปี 174.1 ซม.
    216: { min: 166.63, max: 184.17 },// 18 ปี 175.4 ซม.
};

const heightForAgeGirls: Record<number, { min: number; max: number }> = {
    0: { min: 46.65, max: 51.56 },    // แรกเกิด 49.1 ซม.
    12: { min: 70.30, max: 77.70 },   // 1 ปี 74.0 ซม.
    24: { min: 81.42, max: 89.99 },   // 2 ปี 85.7 ซม.
    36: { min: 90.35, max: 99.86 },   // 3 ปี 95.1 ซม.
    48: { min: 97.57, max: 107.84 },  // 4 ปี 102.7 ซม.
    60: { min: 103.93, max: 114.87 }, // 5 ปี 109.4 ซม.
    72: { min: 109.35, max: 120.86 }, // 6 ปี 115.1 ซม.
    84: { min: 114.76, max: 126.84 }, // 7 ปี 120.8 ซม.
    96: { min: 120.08, max: 132.72 }, // 8 ปี 126.4 ซม.
    108: { min: 125.40, max: 138.60 },// 9 ปี 132.0 ซม.
    120: { min: 131.67, max: 145.53 },// 10 ปี 138.6 ซม.
    132: { min: 137.75, max: 152.25 },// 11 ปี 145.0 ซม.
    144: { min: 143.64, max: 158.76 },// 12 ปี 151.2 ซม.
    156: { min: 148.01, max: 163.59 },// 13 ปี 155.8 ซม.
    168: { min: 150.58, max: 166.43 },// 14 ปี 158.5 ซม.
    180: { min: 151.91, max: 167.90 },// 15 ปี 159.9 ซม.
    192: { min: 152.38, max: 168.42 },// 16 ปี 160.4 ซม.
    204: { min: 152.67, max: 168.74 },// 17 ปี 160.7 ซม.
    216: { min: 154.95, max: 171.26 },// 18 ปี 163.1 ซม.
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

// เกณฑ์ BMI ตามอายุ (ชาย) - อ้างอิงจากตารางมาตรฐาน ± 10%
const bmiForAgeBoys: Record<number, { min: number; max: number }> = {
    0: { min: 12.06, max: 14.74 },    // แรกเกิด BMI 13.4
    12: { min: 15.12, max: 18.48 },   // 1 ปี BMI 16.8
    24: { min: 14.40, max: 17.60 },   // 2 ปี BMI 16.0
    36: { min: 13.95, max: 17.05 },   // 3 ปี BMI 15.5
    48: { min: 13.77, max: 16.83 },   // 4 ปี BMI 15.3
    60: { min: 13.68, max: 16.72 },   // 5 ปี BMI 15.2
    72: { min: 13.77, max: 16.83 },   // 6 ปี BMI 15.3
    84: { min: 13.95, max: 17.05 },   // 7 ปี BMI 15.5
    96: { min: 14.13, max: 17.27 },   // 8 ปี BMI 15.7
    108: { min: 14.58, max: 17.82 },  // 9 ปี BMI 16.2
    120: { min: 14.94, max: 18.26 },  // 10 ปี BMI 16.6
    132: { min: 15.48, max: 18.92 },  // 11 ปี BMI 17.2
    144: { min: 16.11, max: 19.69 },  // 12 ปี BMI 17.9
    156: { min: 16.92, max: 20.68 },  // 13 ปี BMI 18.8
    168: { min: 17.28, max: 21.12 },  // 14 ปี BMI 19.2
    180: { min: 17.73, max: 21.67 },  // 15 ปี BMI 19.7
    192: { min: 18.45, max: 22.55 },  // 16 ปี BMI 20.5
    204: { min: 19.17, max: 23.43 },  // 17 ปี BMI 21.3
    216: { min: 19.53, max: 23.87 },  // 18 ปี BMI 21.7
};

// เกณฑ์ BMI ตามอายุ (หญิง) - อ้างอิงจากตารางมาตรฐาน ± 10%
const bmiForAgeGirls: Record<number, { min: number; max: number }> = {
    0: { min: 11.97, max: 14.63 },    // แรกเกิด BMI 13.3
    12: { min: 14.67, max: 17.93 },   // 1 ปี BMI 16.3
    24: { min: 14.13, max: 17.27 },   // 2 ปี BMI 15.7
    36: { min: 13.86, max: 16.94 },   // 3 ปี BMI 15.4
    48: { min: 13.77, max: 16.83 },   // 4 ปี BMI 15.3
    60: { min: 13.68, max: 16.72 },   // 5 ปี BMI 15.2
    72: { min: 13.77, max: 16.83 },   // 6 ปี BMI 15.3
    84: { min: 13.86, max: 16.94 },   // 7 ปี BMI 15.4
    96: { min: 14.13, max: 17.27 },   // 8 ปี BMI 15.7
    108: { min: 14.49, max: 17.71 },  // 9 ปี BMI 16.1
    120: { min: 14.94, max: 18.26 },  // 10 ปี BMI 16.6
    132: { min: 15.84, max: 19.36 },  // 11 ปี BMI 17.6
    144: { min: 16.65, max: 20.35 },  // 12 ปี BMI 18.5
    156: { min: 17.01, max: 20.79 },  // 13 ปี BMI 18.9
    168: { min: 17.37, max: 21.23 },  // 14 ปี BMI 19.3
    180: { min: 17.91, max: 21.89 },  // 15 ปี BMI 19.9
    192: { min: 18.45, max: 22.55 },  // 16 ปี BMI 20.5
    204: { min: 18.90, max: 23.10 },  // 17 ปี BMI 21.0
    216: { min: 18.99, max: 23.21 },  // 18 ปี BMI 21.1
};

// คำนวณเกณฑ์น้ำหนักตามส่วนสูง (ใช้ BMI ตามอายุ)
export function getWeightForHeightCriteria(
    weight: number,
    height: number,
    gender: 'male' | 'female',
    ageMonths?: number
): 'normal' | 'underweight' | 'overweight' {
    const bmi = calculateBMI(weight, height);

    // ถ้าไม่มีอายุ ใช้เกณฑ์ทั่วไป
    if (!ageMonths) {
        if (bmi < 14) return 'underweight';
        if (bmi > 22) return 'overweight';
        return 'normal';
    }

    // ใช้ตาราง BMI ตามอายุและเพศ
    const table = gender === 'male' ? bmiForAgeBoys : bmiForAgeGirls;
    const nearestAge = Object.keys(table)
        .map(Number)
        .reduce((prev, curr) =>
            Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev
        );

    const range = table[nearestAge];
    if (!range) return 'normal';

    if (bmi < range.min) return 'underweight';
    if (bmi > range.max) return 'overweight';
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
