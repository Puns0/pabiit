const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.html', '.css', '.js']) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === 'scratch' || item === '.git' || item.startsWith('.')) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      res = res.concat(getFiles(full, exts));
    } else if (exts.includes(path.extname(item))) {
      res.push(full);
    }
  }
  return res;
}

const files = getFiles('.');
console.log('Auditing ' + files.length + ' project files...');

const rules = [
  { name: 'import ', regex: /\bimport\s+[^'"`]*(?:from\s+)?['"`]/g },
  { name: 'export ', regex: /\bexport\s+(?:default\s+|var\s+|let\s+|const\s+|function\s+|class\s+|\{)/g },
  { name: 'type="module"', regex: /type=["']module["']/g },
  { name: 'lorem', regex: /lorem\s+ipsum/gi },
  { name: 'TODO', regex: /\bTODO\b/gi },
  { name: 'emoji', regex: /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu }
];

let violationsCount = 0;

for (const file of files) {
  // If docs, skip
  if (file.includes('docs')) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const r of rules) {
    let match;
    r.regex.lastIndex = 0;
    while ((match = r.regex.exec(content)) !== null) {
      // Check if match is in a comment
      const lines = content.substring(0, match.index).split('\n');
      const lineNum = lines.length;
      const lineText = lines[lineNum - 1];
      console.log(`[VIOLATION: ${r.name}] ${file}:${lineNum}: "${match[0]}"`);
      violationsCount++;
    }
  }
}

console.log('Total violations found for import/export/type=module/lorem/TODO/emoji: ' + violationsCount);

// Check http:// and https:// (allowed ONLY in comments or references text)
console.log('\nChecking http:// and https:// occurrences outside comments/references...');
let urlViolations = 0;
for (const file of files) {
  if (file.includes('docs')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.includes('http://') || trimmed.includes('https://')) {
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--');
      const isRef = trimmed.includes('Reference') || trimmed.includes('ref-list') || trimmed.includes('href=') || trimmed.includes('xmlns=');
      if (!isComment && !isRef) {
        console.log(`[POTENTIAL URL] ${file}:${idx + 1}: ${trimmed}`);
        urlViolations++;
      }
    }
  });
}
console.log('Total non-comment/non-ref URLs: ' + urlViolations);

// Check dark/navy background colors: (#0..#2 hex backgrounds)
console.log('\nChecking dark/navy background hexes (#0..#2) in CSS and inline styles...');
let darkBgViolations = 0;
for (const file of files) {
  if (file.includes('docs')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for background or background-color with #000, #111, #0a0a0a, #001f3f (navy), etc.
    const bgMatch = line.match(/background(?:-color)?\s*:\s*(#[0-2][0-9a-fA-F]{2,5}|navy|black)\b/i);
    if (bgMatch) {
      console.log(`[DARK BG] ${file}:${idx + 1}: ${line.trim()}`);
      darkBgViolations++;
    }
  });
}
console.log('Total dark bg violations: ' + darkBgViolations);

// Check presenter assignments
console.log('\nChecking team/presenter assignment wording...');
let presenterViolations = 0;
const presenterRegex = /\b(?:presenter\s+[1-3]|slide\s+\d+\s+by|member\s+[1-3]\s+presents|speaker\s+[1-3]|turn\s+to\s+speak)\b/gi;
for (const file of files) {
  if (file.includes('docs')) continue;
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = presenterRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    console.log(`[PRESENTER ASSIGNMENT] ${file}:${lineNum}: "${match[0]}"`);
    presenterViolations++;
  }
}
console.log('Total presenter assignment violations: ' + presenterViolations);
