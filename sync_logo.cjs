// sync-logo.js
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, 'LOGO+WITHTECH.png');
const dest = path.resolve(__dirname, 'android/app/src/main/res/drawable/logo_withtech.png');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied logo to', dest);
} else {
  console.error('Source logo not found:', src);
}
