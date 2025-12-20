// Import script for real data from Excel to Supabase
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase config
const SUPABASE_URL = 'https://rrnlfbmzzoatklooqnko.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybmxmYm16em9hdGtsb29xbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTI0MDcsImV4cCI6MjA4MTcyODQwN30.rk7H0FFvMaVvlkuHyvgckEygjvZgA36XwpPrlS2cuqg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to convert Excel date serial to ISO date string
function excelDateToISO(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

// Helper to convert gender
function convertGender(gender) {
    if (gender === 'ชาย') return 'male';
    if (gender === 'หญิง') return 'female';
    return 'male';
}

async function importData() {
    console.log('🚀 Starting data import...\n');

    // Read Excel file
    const wb = XLSX.readFile('RealData.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    console.log(`📊 Found ${data.length} rows in Excel\n`);

    // Step 1: Clear existing data
    console.log('🗑️ Clearing existing data...');

    await supabase.from('health_records').delete().neq('id', '');
    console.log('  ✓ Cleared health_records');

    await supabase.from('residents').delete().neq('id', '');
    console.log('  ✓ Cleared residents');

    await supabase.from('houses').delete().neq('id', '');
    console.log('  ✓ Cleared houses');

    await supabase.from('volunteers').delete().neq('id', '');
    console.log('  ✓ Cleared volunteers\n');

    // Step 2: Extract unique volunteers
    // Schema: id, national_id, name, phone
    const volunteersMap = new Map();
    data.forEach(row => {
        const name = row['อสม'];
        const nationalId = String(row['เลขบัตรอสม'] || '');
        if (name && nationalId && !volunteersMap.has(nationalId)) {
            volunteersMap.set(nationalId, { name, national_id: nationalId });
        }
    });

    const volunteers = Array.from(volunteersMap.values()).map((v, idx) => ({
        id: `v${idx + 1}`,
        name: v.name,
        national_id: v.national_id,
        phone: ''
    }));

    console.log(`👤 Found ${volunteers.length} unique volunteers`);

    // Step 3: Extract unique houses
    // Schema: id, house_number, village_no, volunteer_id, latitude, longitude, photo_url
    const housesMap = new Map();
    data.forEach(row => {
        const villageNo = String(row['หมู่ที่']).replace(/^0+/, '') || '1';
        const houseNumber = String(row['บ้านเลขที่'] || '');
        const volunteerNationalId = String(row['เลขบัตรอสม'] || '');
        const key = `${villageNo}-${houseNumber}`;

        if (!housesMap.has(key)) {
            housesMap.set(key, {
                village_no: parseInt(villageNo) || 1,
                house_number: houseNumber,
                volunteer_national_id: volunteerNationalId
            });
        }
    });

    const houses = Array.from(housesMap.entries()).map(([key, h], idx) => {
        const volunteer = volunteers.find(v => v.national_id === h.volunteer_national_id);
        return {
            id: `h${idx + 1}`,
            house_number: h.house_number,
            village_no: h.village_no,
            volunteer_id: volunteer ? volunteer.id : volunteers[0]?.id,
            latitude: 0,
            longitude: 0
        };
    });

    console.log(`🏠 Found ${houses.length} unique houses`);

    // Step 4: Create residents
    // Schema: id, national_id, prefix, first_name, last_name, birth_date, gender, house_id, relationship, disease
    const residents = data.map((row, idx) => {
        const villageNo = String(row['หมู่ที่']).replace(/^0+/, '') || '1';
        const houseNumber = String(row['บ้านเลขที่'] || '');
        const key = `${villageNo}-${houseNumber}`;
        const house = houses.find(h => `${h.village_no}-${h.house_number}` === key);

        return {
            id: `r${idx + 1}`,
            house_id: house ? house.id : houses[0]?.id,
            prefix: row['คำนำหน้า'] || '',
            first_name: row['ชื่อ'] || '',
            last_name: row['นามสกุล'] || '',
            national_id: String(row['เลขที่บัตรประชาชน'] || ''),
            birth_date: excelDateToISO(row['วันเกิด']) || '2000-01-01',
            gender: convertGender(row['เพศ']),
            relationship: row['สถานะ'] === 'เจ้าบ้าน' ? 'เจ้าบ้าน' : 'สมาชิก',
            disease: row['โรคประจำตัว'] || null
        };
    });

    console.log(`👥 Prepared ${residents.length} residents\n`);

    // Step 5: Insert data into Supabase
    console.log('📤 Uploading to Supabase...');

    // Insert volunteers
    const { error: volError } = await supabase.from('volunteers').insert(volunteers);
    if (volError) {
        console.error('Error inserting volunteers:', volError);
    } else {
        console.log(`  ✓ Inserted ${volunteers.length} volunteers`);
    }

    // Insert houses
    const { error: houseError } = await supabase.from('houses').insert(houses);
    if (houseError) {
        console.error('Error inserting houses:', houseError);
    } else {
        console.log(`  ✓ Inserted ${houses.length} houses`);
    }

    // Insert residents in batches of 100
    const batchSize = 100;
    let successBatches = 0;
    for (let i = 0; i < residents.length; i += batchSize) {
        const batch = residents.slice(i, i + batchSize);
        const { error: resError } = await supabase.from('residents').insert(batch);
        if (resError) {
            console.error(`Error inserting residents batch ${i / batchSize + 1}:`, resError);
        } else {
            successBatches++;
        }
    }
    console.log(`  ✓ Inserted ${successBatches} batches of residents`);

    console.log('\n✅ Import completed!');
    console.log(`   - Volunteers: ${volunteers.length}`);
    console.log(`   - Houses: ${houses.length}`);
    console.log(`   - Residents: ${residents.length}`);
}

importData().catch(console.error);
