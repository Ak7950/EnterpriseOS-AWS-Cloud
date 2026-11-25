import 'dotenv/config';
import { migrate, pool } from './db.js';
import { seed } from './seed.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo data cannot be seeded in production.');
}

await migrate();
await seed();
await pool.end();
console.log('Demo data seeded.');
