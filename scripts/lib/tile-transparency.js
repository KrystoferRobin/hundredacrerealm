/**
 * Flood-fill edge-connected background pixels to transparent (for modern tile GIFs).
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

function matches(r, g, b, r0, g0, b0, tolerance) {
  return (
    Math.abs(r - r0) <= tolerance &&
    Math.abs(g - g0) <= tolerance &&
    Math.abs(b - b0) <= tolerance
  );
}

/**
 * @param {string} inputPath
 * @param {string} [outputPath]
 * @param {{ tolerance?: number }} [options]
 */
async function makeTileBackgroundTransparent(inputPath, outputPath, options = {}) {
  const tolerance = options.tolerance ?? 22;
  const out = outputPath || inputPath;

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`Expected 4 channels after ensureAlpha, got ${channels}`);
  }

  const visited = new Uint8Array(width * height);
  const queue = [];
  const seedPoints = [];
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 4))) {
    seedPoints.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 4))) {
    seedPoints.push([0, y], [width - 1, y]);
  }
  seedPoints.push([0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]);

  const idx = (x, y) => (y * width + x) * channels;
  const alphaAt = (x, y) => idx(x, y) + 3;

  for (const [x, y] of seedPoints) {
    const i = y * width + x;
    if (!visited[i]) {
      visited[i] = 1;
      queue.push([x, y]);
    }
  }

  const r0 = data[idx(0, 0)];
  const g0 = data[idx(0, 0) + 1];
  const b0 = data[idx(0, 0) + 2];

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const p = idx(x, y);
    if (!matches(data[p], data[p + 1], data[p + 2], r0, g0, b0, tolerance)) continue;
    data[alphaAt(x, y)] = 0;

    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      queue.push([nx, ny]);
    }
  }

  const ext = path.extname(out).toLowerCase();
  let pipeline = sharp(data, { raw: { width, height, channels: 4 } });
  if (ext === '.png') {
    await pipeline.png().toFile(out);
  } else {
    await pipeline.gif().toFile(out);
  }
}

/**
 * Process every GIF in a directory (in place).
 */
async function processModernTileDirectory(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.gif$/i.test(name)) continue;
    const filePath = path.join(dir, name);
    const meta = await sharp(filePath).metadata();
    if (meta.hasAlpha) continue;
    await makeTileBackgroundTransparent(filePath, filePath);
    count++;
  }
  return count;
}

module.exports = {
  makeTileBackgroundTransparent,
  processModernTileDirectory,
};
