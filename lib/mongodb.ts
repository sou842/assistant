import mongoose from 'mongoose';
import dns from 'dns';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // Set reliable fallback DNS servers (Google + Cloudflare) to bypass loopback DNS (127.0.0.1) errors on some systems
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (dnsErr) {
    console.warn('Failed to set custom DNS servers:', dnsErr);
  }

  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error('Missing MONGODB_URI');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB || 'jarvis',
    };

    console.log(`[dbConnect] Initiating mongoose connection (DNS servers: ${dns.getServers().join(', ')})`);
    cached.promise = mongoose.connect(mongodbUri, opts).then((mongoose) => {
      console.log('[dbConnect] Mongoose connected successfully.');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('[dbConnect] Connection failed error details:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
