// ============================================================
// AI Buddy - Auth & DB Diagnostics Script
// Run with: node test-auth.js
// ============================================================

const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

function check(label, value, hint) {
    const ok = !!value && value !== 'undefined';
    console.log(`${ok ? '✅' : '❌'} ${label}: ${ok ? (typeof value === 'string' ? value.substring(0, 40) + (value.length > 40 ? '...' : '') : value) : 'MISSING'}`);
    if (!ok && hint) console.log(`   💡 ${hint}`);
    return ok;
}

async function main() {
    console.log('\n══════════════════════════════════════════');
    console.log('     AI Buddy - Auth & DB Diagnostics    ');
    console.log('══════════════════════════════════════════\n');

    // ── 1. ENV VARS ──────────────────────────────────────────
    console.log('📋 ENVIRONMENT VARIABLES\n');
    let allEnvOk = true;
    allEnvOk &= check('MONGODB_URI', MONGODB_URI, 'Add MONGODB_URI to .env.local');
    allEnvOk &= check('GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID, 'Add GOOGLE_CLIENT_ID to .env.local from Google Cloud Console');
    allEnvOk &= check('GOOGLE_CLIENT_SECRET', GOOGLE_CLIENT_SECRET, 'Add GOOGLE_CLIENT_SECRET to .env.local');
    allEnvOk &= check('NEXTAUTH_SECRET', NEXTAUTH_SECRET, 'Generate with: openssl rand -base64 32');
    allEnvOk &= check('NEXTAUTH_URL', NEXTAUTH_URL, 'Should be http://localhost:3000 for local dev');

    // ── 2. GOOGLE OAUTH CONFIG CHECK ─────────────────────────
    console.log('\n🔑 GOOGLE OAUTH CONFIGURATION\n');
    if (GOOGLE_CLIENT_ID) {
        console.log('   Required Authorized Redirect URIs in Google Cloud Console:');
        console.log('   ✳  http://localhost:3000/api/auth/callback/google');
        console.log('   ✳  https://yourdomain.com/api/auth/callback/google  (for production)');
        console.log('\n   Required Authorized JavaScript Origins:');
        console.log('   ✳  http://localhost:3000');
        console.log('\n   ⚠️  For MOBILE testing on same WiFi network:');
        console.log('   ✳  Add: http://YOUR_LOCAL_IP:3000/api/auth/callback/google');
        console.log('   ✳  Add: http://YOUR_LOCAL_IP:3000 (as JS Origin)');
        console.log('\n   📍 Google Console URL:');
        console.log('   https://console.cloud.google.com/apis/credentials');
    }

    // ── 3. MONGODB CONNECTION ────────────────────────────────
    console.log('\n🍃 MONGODB CONNECTION TEST\n');
    if (!MONGODB_URI) {
        console.log('❌ Skipping MongoDB test - no URI found');
    } else {
        try {
            console.log('   Connecting to MongoDB Atlas...');
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
            });
            console.log('✅ MongoDB connected successfully!');

            // List collections
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log(`\n   📦 Collections in database:`);
            if (collections.length === 0) {
                console.log('   ⚠️  No collections yet (they are created on first use — this is normal)');
            } else {
                for (const col of collections) {
                    const count = await mongoose.connection.db.collection(col.name).countDocuments();
                    console.log(`   • ${col.name}: ${count} document(s)`);
                }
            }

            // Test User model
            console.log('\n   🧪 Testing User schema...');
            const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
                name: String,
                email: { type: String, unique: true },
                image: String,
                lastLoginAt: Date,
                createdAt: Date,
            }, { timestamps: true }));

            const userCount = await User.countDocuments();
            console.log(`✅ User collection: ${userCount} user(s) registered`);

            if (userCount > 0) {
                const users = await User.find({}, { name: 1, email: 1, createdAt: 1, lastLoginAt: 1 }).limit(5);
                console.log('\n   👥 Recent users:');
                for (const u of users) {
                    console.log(`   • ${u.name} (${u.email}) - Last login: ${u.lastLoginAt || 'never'}`);
                }
            }

            // Test Conversation model
            const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', new mongoose.Schema({
                _id: String,
                userId: mongoose.Types.ObjectId,
                title: String,
            }, { _id: false, timestamps: true }));

            const convCount = await Conversation.countDocuments();
            console.log(`✅ Conversations: ${convCount} conversation(s)`);

            // Test Message model
            const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
                conversationId: String,
                role: String,
                content: String,
            }, { timestamps: true }));

            const msgCount = await Message.countDocuments();
            console.log(`✅ Messages: ${msgCount} message(s)`);

        } catch (error) {
            console.error('❌ MongoDB connection FAILED:', error.message);
            if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                console.log('   💡 DNS resolution failed - check if your IP is whitelisted in MongoDB Atlas Network Access');
                console.log('   💡 Go to: https://cloud.mongodb.com → Network Access → Add IP (0.0.0.0/0 for dev)');
            } else if (error.message.includes('auth')) {
                console.log('   💡 Authentication failed - check your MONGODB_URI username/password');
            } else if (error.message.includes('timed out')) {
                console.log('   💡 Timeout - MongoDB Atlas is waking up or your IP is not whitelisted');
            }
        } finally {
            await mongoose.disconnect();
        }
    }

    // ── 4. NEXTAUTH ENDPOINT TEST ────────────────────────────
    console.log('\n🔐 NEXTAUTH ENDPOINT CHECK\n');
    const url = `${NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/providers`;
    console.log(`   Testing: GET ${url}`);
    try {
        const result = await new Promise((resolve, reject) => {
            const req = require('http').get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            });
            req.on('error', reject);
            req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        });
        if (result.status === 200) {
            const providers = JSON.parse(result.data);
            console.log(`✅ NextAuth is running! Providers: ${Object.keys(providers).join(', ')}`);
        } else {
            console.log(`⚠️  NextAuth responded with status: ${result.status}`);
        }
    } catch (e) {
        if (e.message === 'timeout' || e.code === 'ECONNREFUSED') {
            console.log('⚠️  Could not reach NextAuth endpoint (is npm run dev running?)');
        } else {
            console.log(`⚠️  NextAuth check error: ${e.message}`);
        }
    }

    // ── 5. FINAL CHECKLIST ───────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('📋 GOOGLE CONSOLE SETUP CHECKLIST');
    console.log('══════════════════════════════════════════');
    console.log(`
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client
3. Under "Authorized redirect URIs", make sure you have:
   ✅ http://localhost:3000/api/auth/callback/google

4. Under "Authorized JavaScript origins", make sure you have:
   ✅ http://localhost:3000

5. ⚠️  For MOBILE access on your local network:
   Your local IP: (run 'ipconfig' to find it, it's under IPv4 Address)
   Then add:
   ✅ http://YOUR_IP:3000 (as JavaScript origin)
   ✅ http://YOUR_IP:3000/api/auth/callback/google (as redirect URI)
   
   Also update NEXTAUTH_URL in .env.local:
   NEXTAUTH_URL=http://YOUR_IP:3000

6. In OAuth consent screen:
   ✅ Add your Google email under "Test users" if app is in testing mode
   ✅ Make sure "Email" and "Profile" scopes are enabled
`);

    console.log('══════════════════════════════════════════\n');
}

main().catch(console.error);
