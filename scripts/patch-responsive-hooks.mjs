/**
 * Injects useResponsiveStyles hook into functions that use styles but missed conversion.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function functionBodyUsesStyles(source, bodyStart) {
  let depth = 1;
  let i = bodyStart;

  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    i += 1;
  }

  return source.slice(bodyStart, i - 1).includes('styles.');
}

function findFunctionBodyStarts(source) {
  const starts = [];
  const fnRegex = /(export\s+default\s+function\s+\w+\s*\(|export\s+function\s+\w+\s*\(|function\s+\w+\s*\()/g;
  let match;

  while ((match = fnRegex.exec(source)) !== null) {
    const parenStart = match.index + match[0].length;
    let depth = 1;
    let i = parenStart;

    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      i += 1;
    }

    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source[i] !== '{') continue;

    const bodyStart = i + 1;
    const preview = source.slice(bodyStart, bodyStart + 120);
    if (preview.includes('useResponsiveStyles(BASE_STYLES)')) continue;
    if (!functionBodyUsesStyles(source, bodyStart)) continue;

    starts.push(bodyStart);
  }

  return starts;
}

function injectHooks(source) {
  const hookLine = '  const styles = useResponsiveStyles(BASE_STYLES);';
  const starts = findFunctionBodyStarts(source).sort((a, b) => b - a);
  let result = source;

  for (const pos of starts) {
    result = `${result.slice(0, pos)}\n${hookLine}\n${result.slice(pos)}`;
  }

  return result;
}

let count = 0;
for (const file of walk(ROOT)) {
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes('BASE_STYLES')) continue;
  const next = injectHooks(source);
  if (next !== source) {
    fs.writeFileSync(file, next, 'utf8');
    count += 1;
    console.log('patched', path.relative(process.cwd(), file));
  }
}
console.log(`Done. ${count} files patched.`);
