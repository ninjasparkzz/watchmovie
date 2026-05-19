import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pngPath = path.join(__dirname, 'icon.png');
const icoPath = path.join(__dirname, 'icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('PNG icon not found at:', pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);
const pngSize = pngBuffer.length;

// ICO Header (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type (1 = ICO)
header.writeUInt16LE(1, 4); // Image count (1)

// Directory Entry (16 bytes)
const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // Width (0 means 256)
entry.writeUInt8(0, 1); // Height (0 means 256)
entry.writeUInt8(0, 2); // Color palette (0 for no palette)
entry.writeUInt8(0, 3); // Reserved (0)
entry.writeUInt16LE(1, 4); // Color planes (1)
entry.writeUInt16LE(32, 6); // Bits per pixel (32)
entry.writeUInt32LE(pngSize, 8); // Image size in bytes
entry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

// Combine and write to file
const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);

console.log('Successfully generated Windows ICO file at:', icoPath);
