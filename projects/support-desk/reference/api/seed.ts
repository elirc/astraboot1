import {db} from './db';import {fixtures} from '../src/fixtures';
export async function seed(){for(const user of [{id:'alex',name:'Alex Example'},{id:'morgan',name:'Morgan Example'}])await db.user.upsert({where:{id:user.id},create:user,update:{name:user.name}});for(const {comments:_comments,...ticket} of fixtures)await db.ticket.upsert({where:{id:ticket.id},create:{...ticket,createdAt:new Date(ticket.createdAt)},update:{}});}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/seed.ts')){await seed();await db.$disconnect();console.log('Fictional users and tickets seeded idempotently.');}
