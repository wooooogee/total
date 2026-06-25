const fs = require('fs');
const file = 'src/app/admin/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/<th className="p-5 /g, '<th className="px-2 py-3 ');
content = content.replace(/<td className="p-5/g, '<td className="px-2 py-3');
fs.writeFileSync(file, content);
console.log('Replaced padding successfully.');
