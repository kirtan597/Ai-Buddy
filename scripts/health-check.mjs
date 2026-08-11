#!/usr/bin/env node
/**
 * health-check.mjs
 * Run: node scripts/health-check.mjs
 * Checks: env vars, MongoDB connectivity, OpenRouter API key validity
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const REQUIRED_ENV = [
  'OPENAI_API_KEY',
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const OPTIONAL_ENV = ['OPENROUTER_API_KEY_IMAGE', 'OPENROUTER_API_KEY_VIDEO'];

let allPassed = true;

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label) { console.log(`  ❌ ${label}`); allPassed = false; }
function warn(label) { console.log(`  ⚠️  ${label}`); }
function section(title) { console.log(`\n── ${title} ${'─'.repeat(40 - title.length)}`); }

// ── 1. Environment Variables ──────────────────────────────────────────────────
section('Environment Variables');
for (const key of REQUIRED_ENV) {
  if (process.env[key]) pass(key);
  else fail(`${key} is MISSING`);
}
for (const key of OPTIONAL_ENV) {
  if (process.env[key]) pass(`${key} (optional)`);
  else warn(`${key} not set — related feature disabled`);
}

// ── 2. MongoDB Connectivity ───────────────────────────────────────────────────
section('MongoDB Connectivity');
if (process.env.MONGODB_URI) {
  try {
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    pass(`Connected to MongoDB`);
    await mongoose.disconnect();
  } catch (err) {
    fail(`MongoDB connection failed: ${err.message}`);
  }
} else {
  warn('Skipping MongoDB check — MONGODB_URI not set');
}

// ── 3. OpenRouter API Key ─────────────────────────────────────────────────────
section('OpenRouter API Key');
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
if (apiKey) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) pass(`API key valid (${res.status})`);
    else fail(`API key rejected (${res.status} ${res.statusText})`);
  } catch (err) {
    fail(`OpenRouter unreachable: ${err.message}`);
  }
} else {
  warn('Skipping API key check — key not set');
}

// ── 4. Node Version ───────────────────────────────────────────────────────────
section('Runtime');
const [major] = process.versions.node.split('.').map(Number);
if (major >= 20) pass(`Node.js v${process.versions.node}`);
else fail(`Node.js v${process.versions.node} — requires >=20`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(44));
if (allPassed) {
  console.log('🟢 All checks passed — app is healthy\n');
  process.exit(0);
} else {
  console.log('🔴 Some checks failed — review above\n');
  process.exit(1);
}
