import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const sourceIcon = path.join(root, 'aiostreams-site', 'public', 'icon-192.png');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const icons = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

async function writeIcon(directory, size, name) {
  const targetDir = path.join(resDir, directory);
  await fs.mkdir(targetDir, { recursive: true });
  await sharp(sourceIcon)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(path.join(targetDir, name));
}

await fs.access(sourceIcon);

for (const [directory, size] of icons) {
  await writeIcon(directory, size, 'ic_launcher.png');
  await writeIcon(directory, size, 'ic_launcher_round.png');
}

console.log('Generated Android launcher icons from aiostreams-site/public/icon-192.png');
