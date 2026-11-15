const fs = require('fs');
const path = require('path');

function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === 'scratch' || f.startsWith('.')) continue;
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.js') || f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('.getAttribute')) {
          console.log(`${full}:${i+1}: ${l.trim()}`);
        }
      });
    }
  }
}
search('.');

