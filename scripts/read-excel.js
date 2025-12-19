// Script to read Excel file and show structure
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'หมู่ที่ 6 ครอบครัวสุขภาพดี.xlsx');

try {
    const workbook = XLSX.readFile(filePath);

    console.log('=== Sheet Names ===');
    console.log(workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n=== Sheet: ${sheetName} ===`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Show first 10 rows
        console.log('Headers and first 10 rows:');
        data.slice(0, 10).forEach((row, index) => {
            console.log(`Row ${index}: ${JSON.stringify(row)}`);
        });

        console.log(`\nTotal rows: ${data.length}`);
    });
} catch (error) {
    console.error('Error reading file:', error.message);
}
