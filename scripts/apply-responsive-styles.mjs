/**
 * Converts StyleSheet.create blocks to useResponsiveStyles (iPhone 15 Plus baseline).
 * Run: node scripts/apply-responsive-styles.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');
const SKIP = new Set([
  path.normalize('hooks/useResponsiveStyles.ts'),
  path.normalize('theme/layout.ts'),
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function hookImportFor(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(ROOT, 'hooks/useResponsiveStyles'));
  const normalized = rel.split(path.sep).join('/');
  const importPath = normalized.startsWith('.') ? normalized : `./${normalized}`;
  return `import { useResponsiveStyles } from '${importPath.replace(/\.ts$/, '')}';`;
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
    const preview = source.slice(match.index, bodyStart + 300);
    if (!preview.includes('styles.')) continue;
    if (preview.includes('useResponsiveStyles(BASE_STYLES)')) continue;

    starts.push(bodyStart);
  }

  return starts;
}

function injectHookIntoFunctions(source) {
  const hookLine = '  const styles = useResponsiveStyles(BASE_STYLES);';
  const starts = findFunctionBodyStarts(source).sort((a, b) => b - a);
  let result = source;

  for (const pos of starts) {
    result = `${result.slice(0, pos)}\n${hookLine}\n${result.slice(pos)}`;
  }

  return result;
}

function convertFile(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  if (SKIP.has(rel)) return false;

  let source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('const styles = StyleSheet.create(')) return false;
  if (source.includes('useResponsiveStyles(BASE_STYLES)')) return false;

  source = source.replace(/const styles = StyleSheet\.create\(/g, 'const BASE_STYLES = ');

  const marker = 'const BASE_STYLES = ';
  const idx = source.lastIndexOf(marker);
  if (idx === -1) return false;

  const after = source.indexOf('});', idx);
  if (after !== -1) {
    source = `${source.slice(0, after)}};${source.slice(after + 3)}`;
  }

  const importLine = hookImportFor(filePath);
  if (!source.includes('useResponsiveStyles')) {
    const importMatch = source.match(/^import .+;\r?\n/m);
    if (importMatch) {
      const insertAt = importMatch.index + importMatch[0].length;
      source = `${source.slice(0, insertAt)}${importLine}\n${source.slice(insertAt)}`;
    } else {
      source = `${importLine}\n${source}`;
    }
  }

  source = injectHookIntoFunctions(source);
  fs.writeFileSync(filePath, source, 'utf8');
  return true;
}

const files = walk(ROOT);
let count = 0;
for (const file of files) {
  if (convertFile(file)) {
    count += 1;
    console.log('converted', path.relative(process.cwd(), file));
  }
}
console.log(`Done. ${count} files converted.`);
