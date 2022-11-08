import mongoose from 'mongoose';
// import { Sequelize } from 'sequelize';

export * from './Position';
export * from './Transaction';

let cached = global.mongoose;

if (!cached) {
  global.mongoose = { conn: null, promise: null };
  cached = global.mongoose;
}

export async function connect() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI env required');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((mngs) => mngs);
  }

  cached.conn = await cached.promise;

  return cached.conn;
}

// export const db = new Sequelize({
//   dialect: 'sqlite',
//   storage: process.env.SQLITE_PATH
// });
