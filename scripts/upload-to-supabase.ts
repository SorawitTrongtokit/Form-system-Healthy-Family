// Script to upload village 6 data to Supabase
// Run with: npx tsx scripts/upload-to-supabase.ts

import { createClient } from '@supabase/supabase-js';
import { realVolunteers, realHouses, realResidents } from '../src/lib/real-data-village6';

// Supabase credentials
const supabaseUrl = 'https://rrnlfbmzzoatklooqnko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybmxmYm16em9hdGtsb29xbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTI0MDcsImV4cCI6MjA4MTcyODQwN30.rk7H0FFvMaVvlkuHyvgckEygjvZgA36XwpPrlS2cuqg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadData() {
    console.log('🚀 Starting data upload to Supabase...\n');

    try {
        // 1. Upload Volunteers
        console.log('📤 Uploading volunteers...');
        const { error: volError } = await supabase
            .from('volunteers')
            .upsert(realVolunteers, { onConflict: 'id' });

        if (volError) {
            console.error('❌ Volunteer error:', volError.message);
        } else {
            console.log(`✅ Uploaded ${realVolunteers.length} volunteers`);
        }

        // 2. Upload Houses
        console.log('\n📤 Uploading houses...');
        const { error: houseError } = await supabase
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
        let residentErrors = 0;
        for (let i = 0; i < realResidents.length; i += batchSize) {
            const batch = realResidents.slice(i, i + batchSize);
            const { error: resError } = await supabase
                .from('residents')
                .upsert(batch, { onConflict: 'id' });

            if (resError) {
                console.error(`❌ Resident batch ${Math.floor(i / batchSize) + 1} error:`, resError.message);
                residentErrors++;
            } else {
                console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} residents`);
            }
        }

        if (residentErrors === 0) {
            console.log(`✅ Uploaded ${realResidents.length} residents total`);
        }

        console.log('\n🎉 Data upload complete!');
        console.log('\nSummary:');
        console.log(`  - Volunteers: ${realVolunteers.length}`);
        console.log(`  - Houses: ${realHouses.length}`);
        console.log(`  - Residents: ${realResidents.length}`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

uploadData();
