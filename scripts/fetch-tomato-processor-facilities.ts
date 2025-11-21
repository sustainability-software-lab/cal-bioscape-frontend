import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const TOMATO_PROCESSOR_SPREADSHEET_ID = process.env.TOMATO_PROCESSOR_SPREADSHEET_ID;
const TOMATO_PROCESSOR_SHEET1_NAME = process.env.TOMATO_PROCESSOR_SHEET1_NAME || 'Facility List and Location';
const TOMATO_PROCESSOR_SHEET2_NAME = process.env.TOMATO_PROCESSOR_SHEET2_NAME || 'Capacity Information';
const OUTPUT_FILE = 'src/data/tomato-processor-facilities.json'; // Define the output file path

async function main() {
  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch data from Sheet 1 (Facilities)
    const sheet1Response = await sheets.spreadsheets.values.get({
      spreadsheetId: TOMATO_PROCESSOR_SPREADSHEET_ID,
      range: `${TOMATO_PROCESSOR_SHEET1_NAME}!A:Z`,
    });
    const sheet1Values = sheet1Response.data.values as string[][];

    // Fetch data from Sheet 2 (Attributes)
    const sheet2Response = await sheets.spreadsheets.values.get({
      spreadsheetId: TOMATO_PROCESSOR_SPREADSHEET_ID,
      range: `${TOMATO_PROCESSOR_SHEET2_NAME}!A:Z`,
    });
    const sheet2Values = sheet2Response.data.values as string[][];

    if (!sheet1Values || sheet1Values.length === 0 || !sheet2Values || sheet2Values.length === 0) {
      console.log('No data found.');
      return;
    }

    // Process and merge data
    const facilitiesHeader = sheet1Values[0];
    console.log("Facilities Header:", facilitiesHeader);
    console.log("Facilities Header (JSON):", JSON.stringify(facilitiesHeader));
    const facilitiesData = sheet1Values.slice(1);

    // Infer the attributes header row by reading the first 10 rows
    const numRowsToRead = 10;
    const headerCandidates = sheet2Values.slice(0, numRowsToRead);

    let attributesHeaderIndex = -1;

    for (let i = 0; i < headerCandidates.length; i++) {
      const row = headerCandidates[i];
      if (row && row[0] === 'Name') {
        attributesHeaderIndex = i;
        break;
      }
    }

    if (attributesHeaderIndex === -1) {
      console.warn("Could not find header row in Capacity Information sheet. Using first row as header.");
      attributesHeaderIndex = 0;
    }

    const attributesHeader = sheet2Values[attributesHeaderIndex];
    console.log("Attributes Header:", attributesHeader);
    console.log("Attributes Header (JSON):", JSON.stringify(attributesHeader));
    const attributesData = sheet2Values.slice(attributesHeaderIndex + 1);

    // Create a map of attribute data for easier merging, using "Facility Name" as the key
    const attributesMap = new Map<string, any>();
    attributesData.forEach(row => {
      const facilityName = row[0]; // Assuming the first column is the Facility Name
      if (!facilityName) {
        console.warn("Skipping row in Capacity Information sheet due to missing Facility Name.");
        return;
      }
      const attribute = Object.fromEntries(attributesHeader.map((header, index) => [header, row[index]]));
      attributesMap.set(facilityName, attribute);
    });

    // Convert facilities data to objects
    const facilitiesObjects = facilitiesData.map(facility => {
      return Object.fromEntries(facilitiesHeader.map((header, index) => [header, facility[index]]));
    });

    // Merge facilities data with attribute data, using "Name" from facilities and "Facility Name" from attributes
    const mergedData = facilitiesObjects.map(facility => {
      const facilityName = facility["Name"];
      // Perform case-insensitive comparison
      let attributeData = attributesMap.get(facilityName) || {};
      if (Object.keys(attributeData).length === 0) {
        if (facilityName) {
          for (const [key, value] of attributesMap.entries()) {
            if (key.toLowerCase() === facilityName.toLowerCase()) {
              attributeData = value;
              break;
            }
          }
        }
      }
      const merged = { ...facility, ...attributeData, pomace: attributeData["Pomace"] };
      return merged;
    });

    // Write the merged data to the output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedData, null, 2));
    console.log(`Data written to ${OUTPUT_FILE}`);

  } catch (error: any) {
    console.error('Error fetching or processing data:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

main();