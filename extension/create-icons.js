/**
 * Helper script to create placeholder icon files
 * Run with: node create-icons.js
 *
 * Note: This creates simple data URI placeholders.
 * For production, replace with actual icon designs.
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple colored square as base64 PNG
function createSimpleIcon(size, color) {
  // This is a minimal PNG data URI for a colored square
  // In production, use actual icon designs

  const canvas = `
<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
ctx.fillStyle = '${color}';
ctx.fillRect(0, 0, ${size}, ${size});
ctx.fillStyle = 'white';
ctx.font = 'bold ${Math.floor(size/2)}px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('D', ${size/2}, ${size/2});
console.log(c.toDataURL());
</script>
</body>
</html>
  `.trim();

  return canvas;
}

const sizes = [16, 32, 48, 128];
const colors = {
  gray: '#6B7280',
  green: '#10B981',
};

console.log('Creating placeholder icon files...');
console.log('\nIMPORTANT: This script creates basic placeholder files.');
console.log('For actual icons, you have two options:\n');
console.log('1. Use an image editor (GIMP, Photoshop, Figma, etc.) to create proper icons');
console.log('2. Use ImageMagick (if installed):');
console.log('   brew install imagemagick  # macOS');
console.log('   apt-get install imagemagick  # Linux\n');

for (const [colorName, colorValue] of Object.entries(colors)) {
  for (const size of sizes) {
    const filename = `${colorName}-${size}.png`;
    const filepath = path.join(iconsDir, filename);

    // Create a simple text placeholder that explains how to create icons
    const placeholder = `PNG placeholder for ${filename}

To create actual icons, use one of these methods:

1. ImageMagick (recommended):
   convert -size ${size}x${size} xc:${colorValue} -gravity center -pointsize ${Math.floor(size/2)} -fill white -annotate +0+0 "D" ${filepath}

2. Online tool:
   Visit https://www.favicon-generator.org/ and upload your logo
   Or use https://realfavicongenerator.net/

3. Design tool:
   Create ${size}x${size}px PNG in Figma, GIMP, or Photoshop
   Use color ${colorValue} for background
   Add a white "D" or your logo in the center

4. Use existing logo:
   If you have a logo.svg or logo.png, resize it to ${size}x${size}

Replace this file with your actual icon.
`;

    fs.writeFileSync(filepath, placeholder, 'utf8');
    console.log(`Created placeholder: ${filename}`);
  }
}

console.log('\n✓ Placeholder files created in extension/public/icons/');
console.log('\n⚠️  IMPORTANT: Replace these placeholders with actual PNG images before building!');
console.log('\nQuick ImageMagick commands:');
console.log('cd extension/public/icons');

for (const [colorName, colorValue] of Object.entries(colors)) {
  for (const size of sizes) {
    const filename = `${colorName}-${size}.png`;
    console.log(`convert -size ${size}x${size} xc:${colorValue} -gravity center -pointsize ${Math.floor(size/2)} -fill white -annotate +0+0 "D" ${filename}`);
  }
}

console.log('\nOr create a base icon and resize:');
console.log('convert -size 128x128 xc:#6B7280 -gravity center -pointsize 64 -fill white -annotate +0+0 "D" base-gray.png');
console.log('for size in 16 32 48; do convert base-gray.png -resize ${size}x${size} gray-${size}.png; done');
