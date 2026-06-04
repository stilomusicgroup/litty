import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, 'src');
const EXTENSIONS = new Set(['.tsx', '.ts', '.css', '.svg', '.json']);

let totalFiles = 0;
let totalReplacements = 0;

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!EXTENSIONS.has(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Hex replacements (case-insensitive with word boundary after)
  content = content.replace(/#39ff14\b/gi, '#00FF41');
  content = content.replace(/#22c55e\b/gi, '#00FF41');
  content = content.replace(/#4ade80\b/gi, '#00FF41');
  content = content.replace(/#16a34a\b/gi, '#00FF41');
  content = content.replace(/#00ff00\b/gi, '#00FF41');
  content = content.replace(/#0f0\b/gi, '#00FF41');

  // HSL space-separated replacements
  content = content.replace(/142\s+71%\s+53%/g, '135 100% 50%');
  content = content.replace(/106\s+100%\s+54%/g, '135 100% 50%');

  // RGBA replacements (various spacing patterns)
  content = content.replace(/rgba\(\s*34\s*,\s*197\s*,\s*94\s*,\s*([0-9.]+)\s*\)/gi, 'rgba(0, 255, 65, $1)');
  content = content.replace(/rgba\(\s*57\s*,\s*255\s*,\s*20\s*,\s*([0-9.]+)\s*\)/gi, 'rgba(0, 255, 65, $1)');
  content = content.replace(/rgba\(\s*0\s*,\s*255\s*,\s*0\s*,\s*([0-9.]+)\s*\)/gi, 'rgba(0, 255, 65, $1)');

  // RGB replacements
  content = content.replace(/rgb\(\s*34\s*,\s*197\s*,\s*94\s*\)/gi, '#00FF41');
  content = content.replace(/rgb\(\s*57\s*,\s*255\s*,\s*20\s*\)/gi, '#00FF41');
  content = content.replace(/rgb\(\s*0\s*,\s*255\s*,\s*0\s*\)/gi, '#00FF41');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const replacements = (original.match(/#39ff14|#22c55e|#4ade80|#16a34a|#00ff00|#0f0|142\s+71%\s+53%|106\s+100%\s+54%|rgba\(\s*(34|57|0)\s*,\s*(197|255|255)\s*,\s*(94|20|0)\s*,|rgb\(\s*(34|57|0)\s*,\s*(197|255|255)\s*,\s*(94|20|0)\s*\)/gi) || []).length;
    totalReplacements += replacements;
    totalFiles++;
    console.log(`Updated: ${filePath} (${replacements} replacements)`);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(SRC_DIR);
console.log(`\nDone. ${totalFiles} files modified, ${totalReplacements} total replacements.`);
