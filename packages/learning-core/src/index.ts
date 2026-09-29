import type { Grading, Json } from '../../contracts/src/content';
export function canonical(value: unknown): string {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if(value !== null && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value) ?? 'null';
}
export function equal(a: unknown,b:unknown) {return canonical(a)===canonical(b);}
export function gradeAnswer(grading:Grading,answer:Json):boolean {
  if(grading.kind==='choice') return Array.isArray(answer) && answer.every(x=>typeof x==='string') && new Set(answer).size===answer.length && equal([...answer].sort(),[...grading.correctIds].sort());
  if(grading.kind==='text') {const norm=(v:string)=>grading.normalization==='trim'?v.trim():grading.normalization==='trim-lines'?v.split(/\r?\n/).map(l=>l.trim()).join('\n').trim():v;return typeof answer==='string' && norm(answer)===norm(grading.expected);}
  return false;
}
export type Rating = 'Again'|'Hard'|'Good'|'Easy';
export function schedule(step:number,rating:Rating,correctness:boolean|null,now:Date) {
  const applied=correctness===false?'Again':rating;
  const next=applied==='Again'?0:applied==='Hard'?step:Math.min(5,step+(applied==='Easy'?2:1));
  const minutes=applied==='Again'?10:applied==='Hard'?1440:([0,1,3,7,14,30][next]??30)*1440;
  return {step:next,rating:applied,dueAt:new Date(now.getTime()+minutes*60000)};
}
export type Evidence = {itemId:string;masteryRevision:number;passed:boolean;assistance:string;origin:string;level:string;at:Date};
export function conceptStatus(evidence:Evidence[],reviews:{correct:boolean;due:boolean;at:Date}[],overdue:boolean) {
  const independent=evidence.filter(e=>e.passed && e.assistance==='none' && e.origin!=='self_reported');
  const demonstrated=new Set(independent.map(e=>e.itemId)).size>=2 && independent.some(e=>['apply','debug','transfer'].includes(e.level));
  if(!demonstrated) return evidence.length?'practicing':'unseen';
  const good=reviews.filter(r=>r.correct&&r.due).sort((a,b)=>a.at.getTime()-b.at.getTime());
  const retained=good.some((a,i)=>good.slice(i+1).some(b=>b.at.toISOString().slice(0,10)!==a.at.toISOString().slice(0,10) && b.at.getTime()-a.at.getTime()>=7*86400000));
  return retained?(overdue?'review_due':'retained'):'demonstrated';
}
export function placementOutcome(correct:boolean[],critical:boolean[],revealedBefore:boolean) {const score=correct.filter(Boolean).length;return {score,qualified:score>=4 && correct.every((pass,i)=>!critical[i]||pass) && !revealedBefore,practiceOnly:revealedBefore};}
