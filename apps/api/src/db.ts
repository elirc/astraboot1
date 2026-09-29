import 'dotenv/config';import {PrismaClient,Prisma} from '@prisma/client';import {createHash} from 'node:crypto';import {canonical} from '../../../packages/learning-core/src/index';
export const db=new PrismaClient();export type Tx=Prisma.TransactionClient;
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export class AppError extends Error {constructor(public status:number,public code:string,message:string,public details?:unknown){super(message);}}
export async function mutate(userId:string,eventId:string,operation:string,body:unknown,fn:(tx:Tx)=>Promise<unknown>,timeout=30000) {
 const requestHash=hash(canonical({operation,body}));
 return db.$transaction(async tx=>{
  // All owner mutations serialize; this is small private-app traffic. Database constraints remain the final safeguard.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
  const prior=await tx.mutationReceipt.findUnique({where:{userId_clientEventId:{userId,clientEventId:eventId}}});
  if(prior){if(prior.requestHash!==requestHash)throw new AppError(409,'IDEMPOTENCY_CONFLICT','This event ID was already used with different data.');return prior.response;}
  const result=await fn(tx);const response=json(result);
  await tx.mutationReceipt.create({data:{userId,clientEventId:eventId,operation,requestHash,response}});return response;
 },{timeout});
}
export async function award(tx:Tx,userId:string,awardKey:string,amount:number,reason:string){await tx.xpAward.upsert({where:{userId_awardKey:{userId,awardKey}},create:{userId,awardKey,amount,reason},update:{}});}
export async function activity(tx:Tx,userId:string,kind:string,contentItemId:string,relatedRecordId?:string){await tx.activityEvent.create({data:{userId,kind,contentItemId,relatedRecordId}});}
