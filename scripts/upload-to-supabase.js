// Script to upload village 6 data to Supabase
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://rrnlfbmzzoatklooqnko.supabase.co';
const supabaseKey = 'sb_publishable_qmBcvaZ7Rko6EgSsM2uTug_F3LERUdK';

const supabase = createClient(supabaseUrl, supabaseKey);

// Import real data
const { realVolunteers, realHouses, realResidents } = require('../src/lib/real-data-village6.ts');

async function uploadData() {
    console.log('🚀 Starting data upload to Supabase...\n');

    try {
        // 1. Upload Volunteers
        console.log('📤 Uploading volunteers...');
        const { data: volData, error: volError } = await supabase
            .from('volunteers')
            .upsert(realVolunteers, { onConflict: 'id' });

        if (volError) {
            console.error('❌ Volunteer error:', volError.message);
        } else {
            console.log(`✅ Uploaded ${realVolunteers.length} volunteers`);
        }

        // 2. Upload Houses
        console.log('\n📤 Uploading houses...');
        const { data: houseData, error: houseError } = await supabase
            .from('houses')
            .upsert(realHouses, { onConflict: 'id' });

        if (houseError) {
            console.error('❌ House error:', houseError.message);
        } else {
            console.log(`✅ Uploaded ${realHouses.length} houses`);
        }

        // 3. Upload Residents
        console.log('\n📤 Uploading residents...');
        // Upload in batches of 50 to avoid timeout
        const batchSize = 50;
        for (let i = 0; i < realResidents.length; i += batchSize) {
            const batch = realResidents.slice(i, i + batchSize);
            const { error: resError } = await supabase
                .from('residents')
                .upsert(batch, { onConflict: 'id' });

            if (resError) {
                console.error(`❌ Resident batch ${i / batchSize + 1} error:`, resError.message);
            } else {
                console.log(`  📦 Batch ${i / batchSize + 1}: ${batch.length} residents`);
            }
        }
        console.log(`✅ Uploaded ${realResidents.length} residents total`);

        console.log('\n🎉 Data upload complete!');
        console.log('\nSummary:');
        console.log(`  - Volunteers: ${realVolunteers.length}`);
        console.log(`  - Houses: ${realHouses.length}`);
        console.log(`  - Residents: ${realResidents.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

uploadData();
