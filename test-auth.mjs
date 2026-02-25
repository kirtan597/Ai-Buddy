import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local manually since we're in ESM
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const envPath = join(__dir, '.env.local');

try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
} catch (e) {
    console.warn('Could not load .env.local:', e.message);
}

const uri = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

console.log("\n════════════════════════════════════════");
console.log("   AI Buddy - Auth & DB Full Diagnostics");
console.log("════════════════════════════════════════\n");

// ── 1. ENV VARIABLES
console.log("📋 ENVIRONMENT VARIABLES:\n");
const envVars = {
    MONGODB_URI: uri,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET,
    NEXTAUTH_URL
};
for (const [k, v] of Object.entries(envVars)) {
    const ok = !!v;
    const display = v ? v.substring(0, 50) + (v.length > 50 ? '...' : '') : 'MISSING';
    console.log(`  ${ok ? '✅' : '❌'} ${k}: ${display}`);
}

// ── 2. MONGODB TEST
console.log("\n🍃 MONGODB CONNECTION:\n");
if (!uri) {
    console.log("  ❌ Skipping - no MONGODB_URI");
} else {
    try {
        console.log("  Connecting...");
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log("  ✅ Connected to MongoDB Atlas!\n");

        const colls = await mongoose.connection.db.listCollections().toArray();
        if (colls.length === 0) {
            console.log("  ℹ️  No collections yet — they'll be created on first Google login (normal!)");
        } else {
            console.log("  📦 Collections:");
            for (const c of colls) {
                const n = await mongoose.connection.db.collection(c.name).countDocuments();
                console.log(`     • ${c.name}: ${n} document(s)`);

                // Show sample data for 'users' collection
                if (c.name === 'users' && n > 0) {
                    const users = await mongoose.connection.db
                        .collection('users')
                        .find({}, { projection: { name: 1, email: 1, createdAt: 1, lastLoginAt: 1 } })
                        .limit(3).toArray();
                    for (const u of users) {
                        console.log(`       - ${u.name} (${u.email})`);
                    }
                }
            }
        }
        await mongoose.disconnect();
        console.log("\n  ✅ MongoDB test complete!");
    } catch (err) {
        console.log(`  ❌ MongoDB Error: ${err.message}`);
        if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
            console.log("  💡 Fix: Go to MongoDB Atlas → Network Access → Add your IP address");
            console.log("     Or add 0.0.0.0/0 to allow all IPs during development");
        } else if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
            console.log("  💡 Fix: Check your MongoDB username/password in MONGODB_URI");
        } else if (err.message.includes('timed out')) {
            console.log("  💡 Fix: Your IP is not whitelisted in MongoDB Atlas Network Access");
        }
    }
}

// ── 3. GOOGLE OAUTH SETUP GUIDE
console.log("\n🔑 GOOGLE OAUTH SETUP GUIDE:\n");
console.log("  Google Cloud Console: https://console.cloud.google.com/apis/credentials\n");
console.log("  ✅ Required Authorized Redirect URIs (add ALL of these):");
console.log("     http://localhost:3000/api/auth/callback/google");
console.log("     http://10.220.207.149:3000/api/auth/callback/google   ← For mobile testing\n");
console.log("  ✅ Required Authorized JavaScript Origins:");
console.log("     http://localhost:3000");
console.log("     http://10.220.207.149:3000   ← For mobile testing\n");
console.log("  ✅ .env.local for mobile testing:");
console.log("     NEXTAUTH_URL=http://10.220.207.149:3000");
console.log("     (Change this back to http://localhost:3000 for normal dev)\n");
console.log("  ✅ OAuth Consent Screen:");
console.log("     - Add your Google email to 'Test users' if app is in 'Testing' mode");
console.log("     - Make sure 'email' and 'profile' scopes are enabled");

console.log("\n════════════════════════════════════════\n");
