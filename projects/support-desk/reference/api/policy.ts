import type {Prisma} from '../generated/client/index.js';
export function ownedWhere(ownerId:string,id?:string):Prisma.TicketWhereInput{return {ownerId,...(id?{id}:{})};}
