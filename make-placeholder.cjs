const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'dist', 'client');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(path.join(dir, 'index.html'), '<!DOCTYPE html><html><body>Live Server Active</body></html>');
console.log('✅ Dummy index.html generated successfully for Capacitor validation!');