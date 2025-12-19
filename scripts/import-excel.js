// Script to import Excel data from หมู่ที่ 6 to sample-data.ts format
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'หมู่ที่ 6 ครอบครัวสุขภาพดี.xlsx');

// Convert Excel serial date to YYYY-MM-DD
function excelDateToISO(serial) {
    if (!serial || typeof serial !== 'number') return null;
    // Excel serial date: days since 1900-01-01 (but Excel thinks 1900 was a leap year)
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

// Generate valid Thai national ID (fake but valid checksum)
function generateNationalId(index) {
    const base = '3' + String(index).padStart(11, '0').slice(0, 11);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(base[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return base + checkDigit;
}

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['หมู่6'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header rows (0, 1, 2)
    const dataRows = rawData.slice(3).filter(row => row.length > 0 && row[1]);

    console.log(`Found ${dataRows.length} valid rows\n`);

    // Extract unique volunteers (อสม)
    const volunteerMap = new Map();
    const houseMap = new Map();
    const residents = [];

    let volunteerIndex = 1;
    let residentIndex = 1;

    dataRows.forEach((row, idx) => {
        const houseNumber = String(row[1] || '').trim();
        const volunteerName = String(row[2] || '').trim();
        const prefix = String(row[3] || '').trim();
        const firstName = String(row[4] || '').trim();
        const lastName = String(row[5] || '').trim();
        const gender = row[6] === 'ชาย' ? 'male' : 'female';
        const birthDateSerial = row[7];
        const age = parseInt(row[8]) || 0;
        const disease = String(row[10] || '').trim();

        // Skip if no name
        if (!firstName) return;

        // Process volunteer
        if (volunteerName && !volunteerMap.has(volunteerName)) {
            volunteerMap.set(volunteerName, {
                id: `v${volunteerIndex}`,
                national_id: generateNationalId(volunteerIndex * 1000),
                name: volunteerName,
                phone: `08${String(volunteerIndex).padStart(8, '0')}`
            });
            volunteerIndex++;
        }

        // Process house
        const houseKey = `${houseNumber}`;
        if (houseNumber && !houseMap.has(houseKey)) {
            const volunteerId = volunteerName ? volunteerMap.get(volunteerName)?.id : 'v1';
            houseMap.set(houseKey, {
                id: `h${houseMap.size + 1}`,
                house_number: houseNumber,
                village_no: 6,
                volunteer_id: volunteerId || 'v1'
            });
        }

        // Process resident
        const birthDate = excelDateToISO(birthDateSerial);
        const houseId = houseMap.get(houseKey)?.id || 'h1';

        residents.push({
            id: `r${residentIndex}`,
            national_id: generateNationalId(residentIndex),
            prefix: prefix,
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate || '1990-01-01',
            gender: gender,
            house_id: houseId,
            relationship: residentIndex === 1 ? 'เจ้าบ้าน' : 'สมาชิก',
            disease: disease
        });
        residentIndex++;
    });

    console.log('=== Summary ===');
    console.log(`Volunteers: ${volunteerMap.size}`);
    console.log(`Houses: ${houseMap.size}`);
    console.log(`Residents: ${residents.length}`);

    // Show sample data
    console.log('\n=== Sample Volunteers ===');
    Array.from(volunteerMap.values()).slice(0, 5).forEach(v => {
        console.log(`${v.id}: ${v.name} (${v.national_id})`);
    });

    console.log('\n=== Sample Houses ===');
    Array.from(houseMap.values()).slice(0, 5).forEach(h => {
        console.log(`${h.id}: บ้านเลขที่ ${h.house_number} หมู่ ${h.village_no} -> ${h.volunteer_id}`);
    });

    console.log('\n=== Sample Residents ===');
    residents.slice(0, 10).forEach(r => {
        console.log(`${r.id}: ${r.prefix}${r.first_name} ${r.last_name} (${r.birth_date}, ${r.gender}) -> ${r.house_id}`);
    });

    // Generate TypeScript code
    const output = `// Auto-generated from หมู่ที่ 6 ครอบครัวสุขภาพดี.xlsx
// Generated at: ${new Date().toISOString()}
import { Volunteer, House, Resident, HealthRecord } from './types';

// อาสาสมัคร หมู่ 6
export const realVolunteers: Volunteer[] = ${JSON.stringify(Array.from(volunteerMap.values()), null, 2)};

// บ้าน หมู่ 6
export const realHouses: House[] = ${JSON.stringify(Array.from(houseMap.values()), null, 2)};

// ประชากร หมู่ 6
export const realResidents: Resident[] = ${JSON.stringify(residents, null, 2)};

// ข้อมูลสุขภาพ (ยังไม่มี - รอเก็บจากอาสาสมัคร)
export const realHealthRecords: HealthRecord[] = [];
`;

    const outputPath = path.join(__dirname, '..', 'src', 'lib', 'real-data-village6.ts');
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`\n✅ Generated: ${outputPath}`);

} catch (error) {
    console.error('Error:', error.message);
}
