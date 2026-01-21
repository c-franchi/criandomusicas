#!/usr/bin/env node
/**
 * Version Bump Script
 * 
 * Usage:
 *   node scripts/bump-version.js patch   # 2.3.0 -> 2.3.1
 *   node scripts/bump-version.js minor   # 2.3.0 -> 2.4.0
 *   node scripts/bump-version.js major   # 2.3.0 -> 3.0.0
 *   node scripts/bump-version.js 2.5.0   # Set specific version
 * 
 * This script updates version in:
 *   - src/lib/version.ts
 *   - public/sw.js
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../src/lib/version.ts');
const SW_FILE = path.join(__dirname, '../public/sw.js');

function getCurrentVersion() {
  const content = fs.readFileSync(VERSION_FILE, 'utf8');
  const match = content.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('Could not find APP_VERSION in version.ts');
  }
  return match[1];
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(current, type) {
  const v = parseVersion(current);
  
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      // Assume it's a specific version
      parseVersion(type); // Validate format
      return type;
  }
}

function updateVersionFile(newVersion) {
  let content = fs.readFileSync(VERSION_FILE, 'utf8');
  content = content.replace(
    /APP_VERSION\s*=\s*['"][^'"]+['"]/,
    `APP_VERSION = '${newVersion}'`
  );
  fs.writeFileSync(VERSION_FILE, content);
  console.log(`✅ Updated ${VERSION_FILE}`);
}

function updateSwFile(newVersion) {
  let content = fs.readFileSync(SW_FILE, 'utf8');
  content = content.replace(
    /const SW_VERSION = ['"][^'"]+['"]/,
    `const SW_VERSION = '${newVersion}'`
  );
  content = content.replace(
    /\/\/ Version: [^\n]+/,
    `// Version: ${newVersion} - Updated ${new Date().toISOString().split('T')[0]}`
  );
  fs.writeFileSync(SW_FILE, content);
  console.log(`✅ Updated ${SW_FILE}`);
}

// Main
const arg = process.argv[2] || 'patch';
const currentVersion = getCurrentVersion();
const newVersion = bumpVersion(currentVersion, arg);

console.log(`\n📦 Bumping version: ${currentVersion} → ${newVersion}\n`);

updateVersionFile(newVersion);
updateSwFile(newVersion);

console.log(`\n🎉 Version updated to ${newVersion}\n`);
