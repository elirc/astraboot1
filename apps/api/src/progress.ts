import type {FastifyInstance} from 'fastify';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db,AppError} from './db';
import {versionFor,pageInput,decodeCursor,nextCursor} from './content';
import {itemSchema,type Json} from '../../../packages/contracts/src/content';
import {conceptStatus,gradeAnswer,type Evidence} from '../../../packages/learning-core/src/index';
type Contribution={itemId:string;masteryRevision:number;conceptIds:string[];level:string;assistance:string;origin:string;passed:boolean;at:Date};
type ReviewEvidence={conceptIds:string[];correctness:boolean|null;gradingOrigin:string;wasDue:boolean;createdAt:Date};
type PlacementEvidence={createdAt:Date;itemResults:Prisma.JsonValue;submittedAnswers:Prisma.JsonValue;payload:Prisma.JsonValue};
type DueState={conceptIds:string[];dueAt:Date};
async function historyPage(userId:string,query:unknown){
const {limit,cursor}=pageInput(query);const id=cursor?z.string().uuid().parse(decodeCursor(cursor)):undefined;
if(id&&!await db.attempt.findFirst({where:{id,userId},select:{id:true}}))throw new AppError(400,'INVALID_CURSOR','This history cursor is unavailable.');
const rows=await db.attempt.findMany({where:{userId},orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,...(id?{cursor:{id},skip:1}:{}),select:{id:true,outcome:true,assistance:true,gradingOrigin:true,createdAt:true,exerciseVersionIdRef:{select:{itemId:true,masteryRevision:true}}}});
return {data:rows.slice(0,limit).map(({exerciseVersionIdRef,...row})=>({...row,...exerciseVersionIdRef})),meta:{nextCursor:rows.length>limit?nextCursor(rows[limit-1]!.id):null}};
}
async function placementPage(userId:string,query:unknown){const {limit,cursor}=pageInput(query);const id=cursor?z.string().uuid().parse(decodeCursor(cursor)):undefined;if(id&&!await db.placementAttempt.findFirst({where:{id,userId},select:{id:true}}))throw new AppError(400,'INVALID_CURSOR','Placement cursor unavailable.');const rows=await db.placementAttempt.findMany({where:{userId},orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,...(id?{cursor:{id},skip:1}:{}),select:{id:true,score:true,qualified:true,practiceOnly:true,createdAt:true,assessmentVersionIdRef:{select:{itemId:true,masteryRevision:true}}}});return {data:rows.slice(0,limit).map(({assessmentVersionIdRef,...p})=>({...p,assessmentId:assessmentVersionIdRef.itemId,masteryRevision:assessmentVersionIdRef.masteryRevision})),meta:{nextCursor:rows.length>limit?nextCursor(rows[limit-1]!.id):null}};}
export async function progressRoutes(app:FastifyInstance){
app.get('/api/v1/placement-attempts',async req=>placementPage(req.ownerId,req.query));
app.get('/api/v1/attempts',async req=>historyPage(req.ownerId,req.query));
app.get('/api/v1/progress',async req=>{
const userId=req.ownerId,{lessonId}=z.object({lessonId:z.string().optional()}).strict().parse(req.query);
const user=await db.user.findUniqueOrThrow({where:{id:userId}});
const releaseId=user.activeReleaseId??'00000000-0000-0000-0000-000000000000';
let exerciseIds:string[]=[];
if(lessonId){const {item}=await versionFor(db,userId,lessonId);if(item.kind!=='lesson')throw new AppError(400,'WRONG_KIND','Expected lesson.');exerciseIds=item.exerciseIds;}
const [lessons,contributions,reviews,states,xp,placements,placementHistory,missions,history,totalLessonCount,chapterConcepts,currentAssessments]=await Promise.all([
db.lessonProgress.findMany({where:{userId}}),
db.$queryRaw<Contribution[]>(Prisma.sql`SELECT v."itemId",v."masteryRevision",v.payload->'conceptIds' AS "conceptIds",v.payload->>'cognitiveLevel' AS level,a.assistance,a."gradingOrigin" AS origin,bool_or(a.outcome='passed') AS passed,min(a."createdAt") AS at FROM "Attempt" a JOIN "ContentVersion" v ON v.id=a."exerciseVersionId" JOIN "ReleaseItem" r ON r."itemId"=v."itemId" AND r."releaseId"=${releaseId}::uuid JOIN "ContentVersion" cv ON cv.id=r."versionId" AND cv."masteryRevision"=v."masteryRevision" WHERE a."userId"=${userId}::uuid GROUP BY v."itemId",v."masteryRevision",v.payload->'conceptIds',v.payload->>'cognitiveLevel',a.assistance,a."gradingOrigin"`),
db.$queryRaw<ReviewEvidence[]>(Prisma.sql`SELECT v.payload->'conceptIds' AS "conceptIds",e.correctness,e."gradingOrigin",e."wasDue",e."createdAt" FROM "ReviewEvent" e JOIN "ContentVersion" v ON v.id=e."cardVersionId" JOIN "ReleaseItem" r ON r."itemId"=v."itemId" AND r."releaseId"=${releaseId}::uuid JOIN "ContentVersion" cv ON cv.id=r."versionId" AND cv."masteryRevision"=v."masteryRevision" WHERE e."userId"=${userId}::uuid`),
db.$queryRaw<DueState[]>(Prisma.sql`SELECT v.payload->'conceptIds' AS "conceptIds",s."dueAt" FROM "ReviewState" s JOIN "ReleaseItem" r ON r."itemId"=s."cardId" AND r."releaseId"=${releaseId}::uuid JOIN "ContentVersion" v ON v.id=r."versionId" WHERE s."userId"=${userId}::uuid`),
db.xpAward.aggregate({where:{userId},_sum:{amount:true}}),
db.$queryRaw<PlacementEvidence[]>(Prisma.sql`SELECT DISTINCT ON(v."itemId",v."masteryRevision") p."createdAt",p."itemResults",p."submittedAnswers",v.payload FROM "PlacementAttempt" p JOIN "ContentVersion" v ON v.id=p."assessmentVersionId" JOIN "ReleaseItem" r ON r."itemId"=v."itemId" AND r."releaseId"=${releaseId}::uuid JOIN "ContentVersion" cv ON cv.id=r."versionId" AND cv."masteryRevision"=v."masteryRevision" WHERE p."userId"=${userId}::uuid AND NOT p."practiceOnly" ORDER BY v."itemId",v."masteryRevision",p."createdAt",p.id`),
placementPage(userId,{}),
db.missionProgress.findMany({where:{userId}}),
historyPage(userId,{limit:50}),
db.releaseItem.count({where:{releaseId,kind:'lesson'}}),
db.$queryRaw<{conceptIds:string[]}[]>(Prisma.sql`SELECT v.payload->'conceptIds' AS "conceptIds" FROM "ReleaseItem" r JOIN "ContentVersion" v ON v.id=r."versionId" WHERE r."releaseId"=${releaseId}::uuid AND r.kind='chapter'`),
db.releaseItem.findMany({where:{releaseId,kind:'assessment'},select:{itemId:true,versionIdRef:{select:{masteryRevision:true}}}})
]);
const evidence=new Map<string,Evidence[]>();const add=(concept:string,value:Evidence)=>{const list=evidence.get(concept)??[];list.push(value);evidence.set(concept,list);};
for(const row of contributions)for(const concept of row.conceptIds)add(concept,row);
const assessmentRevisions=new Map(currentAssessments.map(a=>[a.itemId,a.versionIdRef.masteryRevision]));
for(const p of placements){const assessment=itemSchema.parse(p.payload);if(assessment.kind!=='assessment'||assessmentRevisions.get(assessment.id)!==assessment.masteryRevision)continue;
const recorded=z.array(z.object({id:z.string(),passed:z.boolean(),gradingOrigin:z.string()})).safeParse(p.itemResults);
for(const item of assessment.items){const result=recorded.success?recorded.data.find(r=>r.id===item.id):undefined;const answer=(p.submittedAnswers as Record<string,unknown>)[item.id];const passed=result?.passed??(item.grading.kind!=='function-cases'&&gradeAnswer(item.grading,(answer??null) as Json));const origin=result?.gradingOrigin??'server_objective';for(const concept of item.objectiveIds)add(concept,{itemId:item.id,masteryRevision:assessment.masteryRevision,passed,assistance:'none',origin,level:item.cognitiveLevel,at:p.createdAt});}}
const now=new Date();const overdue=new Set(states.filter(s=>s.dueAt<now).flatMap(s=>s.conceptIds));const ids=new Set([...chapterConcepts.flatMap(c=>c.conceptIds),...evidence.keys()]);
const concepts=[...ids].map(id=>{const items=evidence.get(id)??[],related=reviews.filter(r=>r.conceptIds.includes(id));return {id,status:conceptStatus(items,related.map(r=>({correct:r.correctness===true&&r.gradingOrigin==='server_objective',due:r.wasDue,at:r.createdAt})),overdue.has(id)),independentItems:new Set(items.filter(e=>e.passed&&e.assistance==='none'&&e.origin!=='self_reported').map(e=>e.itemId)).size};});
const totalXP=xp._sum.amount??0;
return {data:{lessons,concepts,totalXP,level:Math.floor(totalXP/250)+1,totalLessonCount,attempts:history.data,nextAttemptCursor:history.meta.nextCursor,exercisePasses:contributions.filter(e=>e.passed&&exerciseIds.includes(e.itemId)).map(e=>({itemId:e.itemId,masteryRevision:e.masteryRevision})),placements:placementHistory.data,missions,dueReviews:states.filter(s=>s.dueAt<=now).length}};
});
}
