/**
 * National ID Utilities
 * Mask และจัดการเลขบัตรประชาชน 13 หลัก
 */

/**
 * Mask national ID for display
 * อสม.: เห็น 1-2345-XXXXX-12-3
 * 
 * @param nationalId - เลขบัตรประชาชน 13 หลัก
 * @returns masked string
 */
export function maskNationalId(nationalId: string | null | undefined): string {
    if (!nationalId) return '-';

    // Clean the input
    const cleaned = nationalId.replace(/[\s-]/g, '');

    if (cleaned.length !== 13) return nationalId;

    // Format: 1-2345-XXXXX-12-3
    return `${cleaned[0]}-${cleaned.slice(1, 5)}-XXXXX-${cleaned.slice(11, 13)}-${cleaned[12]}`;
}

/**
 * Format national ID with dashes (for admin view)
 * Example: 1-2345-67890-12-3
 * 
 * @param nationalId - เลขบัตรประชาชน 13 หลัก
 * @returns formatted string
 */
export function formatNationalId(nationalId: string | null | undefined): string {
    if (!nationalId) return '-';

    const cleaned = nationalId.replace(/[\s-]/g, '');

    if (cleaned.length !== 13) return nationalId;

    return `${cleaned[0]}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned[12]}`;
}

/**
 * Validate Thai National ID
 * ตรวจสอบ checksum ของเลขบัตรประชาชนไทย
 * 
 * @param nationalId - เลขบัตรประชาชน 13 หลัก
 * @returns { valid: boolean, message: string }
 */
export function validateNationalId(nationalId: string): { valid: boolean; message: string } {
    const cleaned = nationalId.replace(/[\s-]/g, '');

    if (cleaned.length !== 13) {
        return { valid: false, message: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
    }

    if (!/^\d{13}$/.test(cleaned)) {
        return { valid: false, message: 'เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น' };
    }

    // Checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * (13 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 10;

    if (parseInt(cleaned[12]) !== checkDigit) {
        return { valid: false, message: 'เลขบัตรประชาชนไม่ถูกต้อง (checksum)' };
    }

    return { valid: true, message: '' };
}
