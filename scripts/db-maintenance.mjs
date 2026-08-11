#!/usr/bin/env node
/**
 * db-maintenance.mjs
 * Run: node scripts/db-maintenance.mjs [--dry-run]
 * Tasks:
 *   - Delete conversations older than 90 days with no messages
 *   - Delete orphaned messages (no parent conversation)
 *   - Print collection stats
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const STALE_DAYS = 90;

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in .env.local');
  process.exit(1);
}

console.log(`\n🔧 DB Maintenance ${DRY_RUN ? '(DRY RUN — no changes)' : '(LIVE)'}`);
console.log('─'.repeat(44));

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
console.log('✅ Connected to MongoDB\n');

const db = mongoose.connection.db;

// ── Stats ─────────────────────────────────────────────────────────────────────
const [convCount, msgCount, userCount] = await Promise.all([
  db.collection('conversations').countDocuments(),
  db.collection('messages').countDocuments(),
  db.collection('users').countDocuments(),
]);
console.log(`📊 Stats:`);
console.log(`   Users:         ${userCount}`);
console.log(`   Conversations: ${convCount}`);
console.log(`   Messages:      ${msgCount}`);

// ── 1. Stale empty conversations ──────────────────────────────────────────────
const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
const staleConvs = await db.collection('conversations').find({
  updatedAt: { $lt: cutoff },
}).toArray();

// Filter to those with no messages
const staleIds = [];
for (const conv of staleConvs) {
  const msgCnt = await db.collection('messages').countDocuments({ conversationId: conv._id.toString() });
  if (msgCnt === 0) staleIds.push(conv._id);
}

console.log(`\n🗑️  Stale empty conversations (>${STALE_DAYS}d): ${staleIds.length}`);
if (staleIds.length > 0 && !DRY_RUN) {
  const res = await db.collection('conversations').deleteMany({ _id: { $in: staleIds } });
  console.log(`   Deleted: ${res.deletedCount}`);
}

// ── 2. Orphaned messages ──────────────────────────────────────────────────────
const allConvIds = (await db.collection('conversations').find({}, { projection: { _id: 1 } }).toArray())
  .map(c => c._id.toString());

const orphanedMsgs = await db.collection('messages').find({
  conversationId: { $nin: allConvIds },
}).toArray();

console.log(`\n🗑️  Orphaned messages: ${orphanedMsgs.length}`);
if (orphanedMsgs.length > 0 && !DRY_RUN) {
  const orphanIds = orphanedMsgs.map(m => m._id);
  const res = await db.collection('messages').deleteMany({ _id: { $in: orphanIds } });
  console.log(`   Deleted: ${res.deletedCount}`);
}

// ── Done ──────────────────────────────────────────────────────────────────────
await mongoose.disconnect();
console.log('\n✅ Maintenance complete\n');
