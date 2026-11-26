import 'dotenv/config';
import { db, initDatabase } from './db.js';

const args = process.argv.slice(2);
initDatabase();

if (args.includes('--reset')) {
  db.exec('DELETE FROM coupon_codes; DELETE FROM spins; DELETE FROM customers;');
  console.log('Cleared customer registrations, spins, and coupon codes.');
} else {
  console.log('Database initialized and verified.');
}
