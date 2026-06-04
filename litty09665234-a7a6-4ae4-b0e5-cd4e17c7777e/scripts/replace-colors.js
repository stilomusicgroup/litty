import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';
const EXCLUDED_FILE = 'src/components/MobileBottomNav.tsx';

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else if (/\.(ts|tsx|css)$/.test(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

const files = getFiles(SRC_DIR);

for (const file of files) {
  const isMobileNav = file === EXCLUDED_FILE || file.endsWith('/MobileBottomNav.tsx');

  const replacements = [];

  if (!isMobileNav) {
    replacements.push(
      { from: '#39FF14', to: '#22c55e' },
      { from: '#39ff14', to: '#22c55e' },
      { from: 'rgba(57, 255, 20,', to: 'rgba(34, 197, 94,' },
      { from: 'rgba(57,255,20,', to: 'rgba(34,197,94,' },
    );
  }

  replacements.push(
    { from: '#83FF44', to: '#22c55e' },
    { from: '#83ff44', to: '#22c55e' },
    { from: '#39D353', to: '#22c55e' },
    { from: '#39d353', to: '#22c55e' },
    { from: 'rgba(131, 255, 68,', to: 'rgba(34, 197, 94,' },
    { from: 'rgba(131,255,68,', to: 'rgba(34,197,94,' },
    { from: 'rgba(0, 255, 70,', to: 'rgba(34, 197, 94,' },
    { from: 'rgba(0,255,70,', to: 'rgba(34,197,94,' },
    { from: '#111111', to: '#0f130f' },
    { from: '#111611', to: '#0f130f' },
    { from: '#141414', to: '#0f130f' },
  );

  replaceInFile(file, replacements);
}

console.log('Done');
