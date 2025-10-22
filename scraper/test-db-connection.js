const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('Testing PostgreSQL connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '****' : 'NOT SET');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'discount',
  user: process.env.DB_USER || 'discount_user',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 10000,
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const res = await client.query('SELECT NOW() as time, version() as version');
    console.log('Server time:', res.rows[0].time);
    console.log('Server version:', res.rows[0].version);
    
    await client.end();
    console.log('✅ Connection closed');
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error('Error:', err);
  }
}

test();
