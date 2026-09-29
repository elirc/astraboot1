import pg from '../.tools/postgres/node_modules/pg/lib/index.js';
const client=new pg.Client({host:'127.0.0.1',port:5439,user:'devpractice_test',password:'disposable-local-test-only',database:'postgres',connectionTimeoutMillis:5000});
try{await client.connect();console.log((await client.query('SELECT version()')).rows[0]);const exists=await client.query("SELECT 1 FROM pg_database WHERE datname='devpractice_test'");if(!exists.rowCount)await client.query('CREATE DATABASE devpractice_test');console.log('Test database ready.');}finally{await client.end();}
