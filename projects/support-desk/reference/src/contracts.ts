export type Status='open'|'pending'|'closed';
export type Ticket={id:string;ownerId:string;title:string;body:string;status:Status;createdAt:string};
export type Comment={id:string;ticketId:string;body:string;createdAt:string};
export type Detail=Ticket&{comments:Comment[]};
export type Page={items:Ticket[];nextCursor:string|null};
export type CreateInput={title:string;body:string};
export interface Adapter{
 list(input:{status?:Status;cursor?:string;limit?:number;signal?:AbortSignal}):Promise<Page>;
 detail(id:string,signal?:AbortSignal):Promise<Detail>;
 create(input:CreateInput):Promise<Ticket>;
 comment(id:string,body:string):Promise<Comment>;
}
export class ApiError extends Error{constructor(message:string,readonly status:number,readonly fields:Record<string,string>={}){super(message);}}
export function validateTitle(value:string){const title=value.trim();return title.length===0?'Enter a nonblank title.':title.length>120?'Use 120 characters or fewer.':null;}
