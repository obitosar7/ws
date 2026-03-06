#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'dist';

function isLikelyReadable(text) {
  if (!text.length) return false;
  let readable = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 32 && code <= 126) || ch === '\n' || ch === '\r' || ch === '\t') readable++;
  }
  return readable / text.length > 0.95;
}

function decodeHexString(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  try {
    const buffer = Buffer.from(hex, 'hex');
    const text = buffer.toString('utf8');
    return isLikelyReadable(text) ? text : null;
  } catch {
    return null;
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hexMatches = content.match(/"([0-9a-fA-F]{8,})"/g) || [];
  const unique = new Set();

  for (const raw of hexMatches) {
    const hex = raw.slice(1, -1);
    const decoded = decodeHexString(hex);
    if (decoded) unique.add(`${hex} => ${decoded}`);
  }

  return [...unique];
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && /\.(cjs|mjs|js|ts)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

const files = walk(targetDir);
let foundAny = false;

for (const file of files) {
  const lines = scanFile(file);
  if (!lines.length) continue;
  foundAny = true;
  console.log(`\n# ${file}`);
  for (const line of lines) console.log(line);
}

if (!foundAny) console.log('No decodable hex-encoded strings found.');
