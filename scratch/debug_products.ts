import { getProductConfigsFromSheet } from '../src/lib/googleSheets';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Fetching products from Google Sheets...");
  try {
    const products = await getProductConfigsFromSheet();
    console.log("Fetched products count:", products.length);
    products.forEach(p => {
      console.log(`Product: ${p.id} (${p.name})`);
      console.log(` - requireHealthcare:`, p.requireHealthcare);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
