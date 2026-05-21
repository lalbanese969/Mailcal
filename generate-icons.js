// Run with: node generate-icons.js
// Generates minimal PNG icons for the PWA manifest
const fs = require('fs');
const path = require('path');

function createPNG(size) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xffffffff;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcInput));
    return Buffer.concat([len, typeBytes, data, crcBuf]);
  }

  // IHDR: size x size, 8-bit RGB
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data: dark background with white "M" lettermark
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      // Background: #0a0a0a
      let r = 10, g = 10, b = 10;

      // Draw a simple "M" shape in the center
      const cx = size / 2, cy = size / 2;
      const s = size * 0.35;
      const thick = Math.max(2, size * 0.08);

      // Left vertical bar
      if (x >= cx - s && x <= cx - s + thick && y >= cy - s && y <= cy + s) { r = 255; g = 255; b = 255; }
      // Right vertical bar
      else if (x >= cx + s - thick && x <= cx + s && y >= cy - s && y <= cy + s) { r = 255; g = 255; b = 255; }
      // Left diagonal (top half)
      else if (y >= cy - s && y <= cy && Math.abs(x - (cx - s + (y - (cy - s)) * (s / (s)))) <= thick) { r = 255; g = 255; b = 255; }
      // Right diagonal (top half)
      else if (y >= cy - s && y <= cy && Math.abs(x - (cx + s - (y - (cy - s)) * (s / (s)))) <= thick) { r = 255; g = 255; b = 255; }

      row.push(r, g, b);
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);

  // zlib compress (level 0 = stored, simplest valid deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

const iconsDir = path.join(__dirname, 'icons');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512));
console.log('Icons generated: icons/icon-192.png, icons/icon-512.png');
