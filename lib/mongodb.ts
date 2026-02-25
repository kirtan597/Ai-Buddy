import mongoose from 'mongoose';

// Support both MONGODB_URI and MONGO_URI just in case of env var name mismatch
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var _mongooseCache: MongooseCache | undefined;
}

// Use a global variable to preserve connection across hot-reloads in dev
// and across invocations where the same container is reused in production
const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

async function dbConnect() {
    if (!MONGODB_URI) {
        throw new Error(
            'MONGODB_URI environment variable is not defined. ' +
            'Add it to .env.local for development or to your Netlify environment variables for production.'
        );
    }

    // Return existing connection if available
    if (cached.conn) {
        return cached.conn;
    }

    // Create new connection promise if none exists
    if (!cached.promise) {
        const opts: mongoose.ConnectOptions = {
            // Reduced timeout for serverless — Netlify Functions timeout at 26s max
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
            // Keep connections alive for container reuse
            maxPoolSize: 1,         // Limit pool size for serverless
            minPoolSize: 0,
            connectTimeoutMS: 5000,
        };

        console.log('[DB] Connecting to MongoDB...');
        cached.promise = mongoose
            .connect(MONGODB_URI, opts)
            .then((m) => {
                console.log('[DB] MongoDB connected successfully');
                return m;
            })
            .catch((err) => {
                cached.promise = null; // Reset so next call retries
                console.error('[DB] MongoDB connection failed:', err.message);
                throw err;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
