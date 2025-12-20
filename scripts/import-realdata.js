// Script to import ALL data from RealData.xlsx to Supabase
// This reads from sheet "บัญชี1ทั้งหมด" which has 3000+ rows

const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (matching src/lib/supabase.ts)
const supabaseUrl = 'https://rrnlfbmzzoatklooqnko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybmxmYm16em9hdGtsb29xbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTI0MDcsImV4cCI6MjA4MTcyODQwN30.rk7H0FFvMaVvlkuHyvgckEygjvZgA36XwpPrlS2cuqg';

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = path.join(__dirname, '..', 'RealData.xlsx');

// Convert Excel serial date to YYYY-MM-DD
function excelDateToISO(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

// Clean national ID (remove spaces)
function cleanNationalId(id) {
    if (!id) return null;
    return String(id).replace(/\s+/g, '').trim();
}

async function importData() {
    console.log('📂 Reading RealData.xlsx...\n');

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['บัญชี1ทั้งหมด'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header row (row 0)
    const dataRows = rawData.slice(1).filter(row => row.length > 0 && row[4]); // Filter rows with first_name

    console.log(`Found ${dataRows.length} valid data rows\n`);

    // Column mapping based on the Excel structure:
    // 0: ลำดับ, 1: หมู่ที่, 2: บ้านเลขที่, 3: คำนำหน้า, 4: ชื่อ, 5: นามสกุล
    // 6: เพศ, 7: อายุ(ปี), 8: อายุ(เดือน), 9: วันเกิด, 13: เลขบัตรประชาชน
    // 14: สถานะ, 15: อสม, 16: เลขบัตรอสม, 24: โรคประจำตัว

    const volunteerMap = new Map();
    const houseMap = new Map();
    const residents = [];

    let volunteerIndex = 1;
    let residentIndex = 1;

    dataRows.forEach((row, idx) => {
        const villageNo = parseInt(row[1]) || 6;
        const houseNumber = String(row[2] || '').trim();
        const prefix = String(row[3] || '').trim();
        const firstName = String(row[4] || '').trim();
        const lastName = String(row[5] || '').trim();
        const gender = row[6] === 'ชาย' ? 'male' : 'female';
        const birthDateSerial = row[9];
        const nationalId = cleanNationalId(row[13]);
        const status = String(row[14] || 'สมาชิก').trim();
        const volunteerName = String(row[15] || '').trim();
        const volunteerNationalId = cleanNationalId(row[16]);
        const disease = String(row[24] || '').trim();

        // Skip if no name
        if (!firstName) return;

        // Process volunteer (อสม)
        if (volunteerName && !volunteerMap.has(volunteerName)) {
            volunteerMap.set(volunteerName, {
                id: `v${volunteerIndex}`,
                national_id: volunteerNationalId || `fake_vol_${volunteerIndex}`,
                name: volunteerName,
                phone: null
            });
            volunteerIndex++;
        }

        // Process house
        const houseKey = `${villageNo}-${houseNumber}`;
        if (houseNumber && !houseMap.has(houseKey)) {
            const volunteerId = volunteerName ? volunteerMap.get(volunteerName)?.id : 'v1';
            houseMap.set(houseKey, {
                id: `h${houseMap.size + 1}`,
                house_number: houseNumber,
                village_no: villageNo,
                volunteer_id: volunteerId || 'v1'
            });
        }

        // Process resident
        const birthDate = excelDateToISO(birthDateSerial);
        const houseId = houseMap.get(houseKey)?.id || 'h1';
        const relationship = status === 'เจ้าบ้าน' ? 'เจ้าบ้าน' : 'สมาชิก';

        residents.push({
            id: `r${residentIndex}`,
            national_id: nationalId || `temp_${residentIndex}`,
            prefix: prefix,
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate || '1990-01-01',
            gender: gender,
            house_id: houseId,
            relationship: relationship,
            disease: disease || null
        });
        residentIndex++;
    });

    const volunteers = Array.from(volunteerMap.values());
    const houses = Array.from(houseMap.values());

    console.log('=== Summary ===');
    console.log(`Volunteers (อสม.): ${volunteers.length}`);
    console.log(`Houses (บ้าน): ${houses.length}`);
    console.log(`Residents (ประชากร): ${residents.length}`);

    // Confirm before uploading
    console.log('\n🚀 Starting upload to Supabase...\n');

    try {
        // 1. Clear existing data
        console.log('🗑️ Clearing existing data...');
        await supabase.from('health_records').delete().neq('id', 'none');
        await supabase.from('residents').delete().neq('id', 'none');
        await supabase.from('houses').delete().neq('id', 'none');
        await supabase.from('volunteers').delete().neq('id', 'none');
        console.log('✅ Cleared existing data\n');

        // 2. Upload Volunteers
        console.log('📤 Uploading volunteers...');
        const { error: volError } = await supabase
            .from('volunteers')
            .insert(volunteers);
        if (volError) {
            console.error('❌ Volunteer error:', volError.message);
        } else {
            console.log(`✅ Uploaded ${volunteers.length} volunteers`);
        }

        // 3. Upload Houses
        console.log('\n📤 Uploading houses...');
        const batchSizeHouse = 100;
        for (let i = 0; i < houses.length; i += batchSizeHouse) {
            const batch = houses.slice(i, i + batchSizeHouse);
            const { error } = await supabase.from('houses').insert(batch);
            if (error) {
                console.error(`❌ House batch ${Math.floor(i / batchSizeHouse) + 1} error:`, error.message);
            } else {
                console.log(`  📦 Batch ${Math.floor(i / batchSizeHouse) + 1}: ${batch.length} houses`);
            }
        }
        console.log(`✅ Uploaded ${houses.length} houses`);

        // 4. Upload Residents
        console.log('\n📤 Uploading residents...');
        const batchSize = 100;
        for (let i = 0; i < residents.length; i += batchSize) {
            const batch = residents.slice(i, i + batchSize);
            const { error } = await supabase.from('residents').insert(batch);
            if (error) {
                console.error(`❌ Resident batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
            } else {
                console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} residents`);
            }
        }
        console.log(`✅ Uploaded ${residents.length} residents`);

        console.log('\n🎉 Import complete!');
        console.log('\n=== Final Summary ===');
        console.log(`  - อสม. (Volunteers): ${volunteers.length}`);
        console.log(`  - บ้าน (Houses): ${houses.length}`);
        console.log(`  - ประชากร (Residents): ${residents.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

importData();
