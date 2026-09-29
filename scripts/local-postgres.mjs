import EmbeddedPostgres from '../.tools/postgres/node_modules/embedded-postgres/dist/index.js';
import {existsSync,appendFileSync} from 'node:fs';
const pg=new EmbeddedPostgres({databaseDir:'.data/postgres-test',user:'devpractice_test',password:'disposable-local-test-only',port:5439,persistent:true,createPostgresUser:false,initdbFlags:['--wal-segsize=1','--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','shared_buffers=16MB','-c','max_wal_size=16MB','-c','min_wal_size=2MB'],onLog:message=>appendFileSync('.data/postgres-test.log',String(message)+'\n'),onError:message=>console.error(String(message))});
if(!existsSync('.data/postgres-test/PG_VERSION'))await pg.initialise();
await pg.start();
const client=pg.getPgClient('postgres','127.0.0.1');await client.connect();const present=await client.query("SELECT 1 FROM pg_database WHERE datname = 'devpractice_test'");
if(!present.rowCount)await client.query('CREATE DATABASE devpractice_test');await client.end();
console.log('Disposable PostgreSQL listening on 127.0.0.1:5439; database devpractice_test.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await pg.stop();process.exit(0);});
