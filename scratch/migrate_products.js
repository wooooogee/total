const fs = require('fs');
const path = require('path');

// Extract DEFAULT_PRODUCTS from db.ts using regex or just require if it was typescript compiled
// Since it's TS, I'll just manually define the defaults here to merge.
const DEFAULT_MAPPING = {
  '더좋은하이브리드698': '하이브리드698',
  '더좋은프리미엄540': '프리미엄540',
  '더좋은헬스케어580': '헬스케어580',
  '더좋은통신결합': '통신결합',
  '더좋은라이즈498': '라이즈498',
  '좋은건강크루즈': '크루즈',
  '더좋은크루즈': '크루즈',
  '굿라이프헬스케어': '굿라이프헬스케어'
};

const filePath = path.join(process.cwd(), 'data', 'products.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

data.forEach(p => {
  if (!p.targetSheetName) {
    p.targetSheetName = DEFAULT_MAPPING[p.id] || '';
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log('Migrated data/products.json');
