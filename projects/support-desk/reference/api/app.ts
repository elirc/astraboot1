import Fastify from 'fastify';import {ZodError} from 'zod';import {db} from './db';import {registerTickets} from './routes';
declare module 'fastify'{interface FastifyRequest{trainingUser:string}}
export class HttpError extends Error{constructor(readonly status:number,readonly code:string,message:string,readonly fields?:Record<string,string>){super(message);}}
export function buildApp({logger=false}:{logger?:boolean}={}){
const app=Fastify({logger:logger?{redact:['req.headers.authorization','req.headers.cookie','password','body']}:false,bodyLimit:16384});
app.decorateRequest('trainingUser','');
app.addHook('onRequest',async(req,reply)=>{reply.header('X-Request-ID',req.id);if(req.url.startsWith('/api/')){const id=req.headers['x-training-user'];if(id!=='alex'&&id!=='morgan')throw new HttpError(401,'TRAINING_ID_REQUIRED','Use the documented fictional identity header.');req.trainingUser=id;}});
app.setErrorHandler((error,req,reply)=>{if(error instanceof ZodError){const fields=Object.fromEntries(error.issues.map(i=>[i.path.join('.'),i.message]));return reply.code(422).send({error:{code:'VALIDATION_FAILED',message:'Check input',fields},requestId:req.id});}if(error instanceof HttpError)return reply.code(error.status).send({error:{code:error.code,message:error.message,fields:error.fields},requestId:req.id});req.log.error({requestId:req.id,code:'INTERNAL_ERROR'},'Training operation failed');return reply.code(500).send({error:{code:'INTERNAL_ERROR',message:'Request failed'},requestId:req.id});});
app.get('/health/live',async()=>({ok:true}));
app.get('/health/ready',async(req,reply)=>{try{await db.$queryRaw`SELECT 1`;return {ok:true};}catch{return reply.code(503).send({ok:false});}});
registerTickets(app);return app;
}
