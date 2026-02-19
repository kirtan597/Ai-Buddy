import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

console.log('Testing MongoDB Connection...');
const uri = process.env.MONGODB_URI;
console.log('URI present:', !!uri);

if (!uri) {
    console.error('ERROR: MONGODB_URI is missing in .env.local');
    process.exit(1);
}

// Extract DB name for logging (hide credentials)
const dbName = uri.split('/').pop()?.split('?')[0];
console.log('Target Database:', dbName);

async function testConnection() {
    try {
        console.log('Attempting to connect (Timeout: 5s)...');
        // Force a short timeout for the test
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });
        console.log('✅ Connection Sucessful! Database is accessible.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error('❌ Connection Failed.');
        console.error('Error Name:', e.name);
        console.error('Error Message:', e.message);
        console.error('\nPOSSIBLE CAUSES:');
        console.error('1. IP Address not whitelisted in MongoDB Atlas.');
        console.error('2. Incorrect password or username.');
        console.error('3. Firewall/Network blocking the connection.');
        process.exit(1);
    }
}

testConnection();
