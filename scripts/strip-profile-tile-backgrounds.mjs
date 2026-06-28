/**
 * Strips the baked-in dark tile background from profile shortcut PNGs.
 * Flood-fills from image edges through dark/neutral pixels; keeps neon icon strokes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesDir = path.resolve(__dirname, '../assets/profile-tiles');

function isBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (luma < 24) return true;
  if (luma < 72 && saturation < 0.55) return true;
  if (luma < 95 && saturation < 0.18) return true;
  return false;
}

function stripBackground(filePath) {
  return sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const { width, height, channels } = info;
      const visited = new Uint8Array(width * height);
      const queue = [];

      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const idx = y * width + x;
        if (visited[idx]) return;
        const i = idx * channels;
        if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2])) return;
        visited[idx] = 1;
        queue.push(idx);
      };

      for (let x = 0; x < width; x += 1) {
        push(x, 0);
        push(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        push(0, y);
        push(width - 1, y);
      }

      while (queue.length > 0) {
        const idx = queue.pop();
        const i = idx * channels;
        data[i + 3] = 0;

        const x = idx % width;
        const y = (idx - x) / width;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }

      const tmpPath = `${filePath}.tmp.png`;
      return sharp(data, { raw: { width, height, channels } })
        .png()
        .toFile(tmpPath)
        .then(() => {
          fs.renameSync(tmpPath, filePath);
        });
    });
}

const files = fs.readdirSync(tilesDir).filter((name) => name.endsWith('.png'));

for (const name of files) {
  const filePath = path.join(tilesDir, name);
  await stripBackground(filePath);
  console.log(`Processed ${name}`);
}

console.log(`Done — ${files.length} tiles.`);
