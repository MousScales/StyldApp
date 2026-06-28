/**
 * Converts StyleSheet.create style blocks to plain objects so useResponsiveStyles
 * can substitute brand accent colors. Run: node scripts/unwrap-stylesheet-for-brand.mjs
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

function unwrapStyleSheetCreate(source, varName) {
  const open = `const ${varName} = StyleSheet.create({`;
  let idx = source.indexOf(open);
  if (idx === -1) return source;

  const start = idx + open.length - 1; // points at '{'
  let depth = 0;
  let i = start;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  // Expect `});` after closing brace
  const afterBrace = source.slice(i + 1).match(/^\s*\)\s*;/);
  if (!afterBrace) return source;

  const end = i + 1 + afterBrace[0].length;
  const inner = source.slice(start + 1, i);
  const replacement = `{${inner}};`;
  return source.slice(0, idx) + `const ${varName} = ${replacement}` + source.slice(end);
}

function addResponsiveHookToDefaultExport(source) {
  if (source.includes('useResponsiveStyles(BASE_STYLES)')) return source;

  const hookImport =
    "import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';";
  const hookImportAlt = (rel) =>
    `import { useResponsiveStyles } from '${rel}';`;

  // Find relative path - try common depths
  if (!source.includes('useResponsiveStyles')) {
    const fileDepth = source.split('\n').find((l) => l.includes("from '../"))?.match(/(\.\.\/)+/)?.[0];
    let importLine = "import { useResponsiveStyles } from '../hooks/useResponsiveStyles';";
    if (source.includes("from '../../")) {
      importLine = "import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';";
    } else if (source.includes("from '../../../")) {
      importLine = "import { useResponsiveStyles } from '../../../hooks/useResponsiveStyles';";
    }
    const themeImport = source.indexOf("from '../../theme'");
    const themeImport2 = source.indexOf("from '../theme'");
    const insertAt = themeImport !== -1 ? source.indexOf('\n', themeImport) + 1 : themeImport2 !== -1 ? source.indexOf('\n', themeImport2) + 1 : source.indexOf('\n') + 1;
    source = source.slice(0, insertAt) + importLine + '\n' + source.slice(insertAt);
  }

  // Inject hook after function opening brace of default export
  const match = source.match(/export default function \w+[^{]*\{/);
  if (!match) return source;
  const insertPos = match.index + match[0].length;
  return (
    source.slice(0, insertPos) +
    '\n  const styles = useResponsiveStyles(BASE_STYLES);' +
    source.slice(insertPos)
  );
}

function renameStylesToBase(source) {
  if (source.includes('const BASE_STYLES =')) return source;
  if (!source.includes('const styles = StyleSheet.create(')) return source;

  source = source.replace('const styles = StyleSheet.create(', 'const BASE_STYLES = StyleSheet.create(');
  // Replace styles. with hook - will be `styles` from hook
  return source;
}

function processFile(filePath) {
  let source = fs.readFileSync(filePath, 'utf8');
  const original = source;

  const varNames = [];
  const re = /const (\w+) = StyleSheet\.create\(\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    varNames.push(m[1]);
  }
  if (varNames.length === 0) return false;

  const hasAccent =
    /colors\.accent(Pink|Blue)|accentPink(Muted|Border|Deep|Soft|Glow|Ring)|activeGlow|subtleTintBg/.test(
      source,
    );
  if (!hasAccent) return false;

  for (const name of varNames) {
    source = unwrapStyleSheetCreate(source, name);
  }

  // Only unwrap StyleSheet.create — do not auto-inject hooks (too error-prone).

  if (source !== original) {
    fs.writeFileSync(filePath, source);
    console.log('fixed:', path.relative(process.cwd(), filePath));
    return true;
  }
  return false;
}

let count = 0;
for (const file of walk(ROOT)) {
  if (processFile(file)) count += 1;
}
console.log(`Done. Updated ${count} file(s).`);
