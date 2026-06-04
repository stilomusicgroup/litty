const fs = require('fs');

function gateConsoleLogs(content, envAccessor) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)console\.log\(/);

    if (!match) {
      result.push(line);
      i++;
      continue;
    }

    const indent = match[1];
    let depth = 1;
    let blockLines = [line];
    let j = i + 1;

    while (j < lines.length && depth > 0) {
      const currentLine = lines[j];
      blockLines.push(currentLine);

      for (const ch of currentLine) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }

      j++;
    }

    const fullBlock = blockLines.join('\n');
    const guardedBlock = fullBlock.replace(
      /^(\s*)console\.log\(/,
      `${indent}if (${envAccessor} !== 'silent') console.log(`
    );

    result.push(guardedBlock);
    i = j;
  }

  return result.join('\n');
}

const filePath = '/app/prompt-runs/project-bf15f6fd-baf6-4045-8640-bbf83e15d2ce/server/partyserver/src/routes/index.ts';
const content = fs.readFileSync(filePath, 'utf8');
const gated = gateConsoleLogs(content, "(c.env as any).LOG_LEVEL");
fs.writeFileSync(filePath, gated);
console.log('Gated console.log calls in index.ts');
