#!/usr/bin/env node
/**
 * generate-icons.js
 * 
 * Run this once to generate all required PWA icon sizes from your source SVG.
 * 
 * Usage:
 *   node generate-icons.js
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Place your source icon at: public/icons/source.svg
 * (Export your aperture logo SVG from the app's WeatherIcons.tsx LogoIcon component,
 *  or use any 512x512+ PNG/SVG as the source.)
 * 
 * This will output all required sizes into public/icons/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE = path.join(__dirname, 'public', 'icons', 'source.png');
const OUTPUT_DIR = path.join(__dirname, 'public', 'icons');

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌  Source icon not found at public/icons/source.svg');
    console.error('   Export your app logo as a PNG (512x512 or larger) and save it there first.');
    process.exit(1);
  }

  console.log('Generating PWA icons...\n');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 13, g: 17, b: 23, alpha: 1 } // #0D1117 — your dark bg
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✅  icon-${size}x${size}.png`);
  }

  // Also generate a maskable version of 192 and 512 with safe zone padding (80% content area)
  for (const size of [192, 512]) {
    const paddedSize = Math.round(size * 0.8);
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}-maskable.png`);
    await sharp(SOURCE)
      .resize(paddedSize, paddedSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: Math.round((size - paddedSize) / 2),
        bottom: Math.round((size - paddedSize) / 2),
        left: Math.round((size - paddedSize) / 2),
        right: Math.round((size - paddedSize) / 2),
        background: { r: 13, g: 17, b: 23, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✅  icon-${size}x${size}-maskable.png (safe zone padded)`);
  }

  console.log('\n✅  All icons generated in public/icons/');
  console.log('\nNext: take screenshots of the app and save them as:');
  console.log('  public/screenshots/forecast-mobile.png  (390x844)');
  console.log('  public/screenshots/forecast-desktop.png (1280x800)');
}

generateIcons().catch(console.error);
