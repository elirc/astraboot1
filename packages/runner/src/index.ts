import { newQuickJSWASMModule, newVariant, RELEASE_SYNC, type QuickJSHandle } from 'quickjs-emscripten';
import type { Grading, Json } from '../../contracts/src/content';
import { equal } from '../../learning-core/src/index';
export type FunctionSpec = Extract<Grading,{kind:'function-cases'}>;
export type RunResult = { protocolVersion:1; runId:string; status:'passed'|'failed'|'compile_error'|'runtime_error'|'timed_out'|'cancelled'|'unsupported'; durationMs:number; diagnostics:string[]; console:string[]; cases:{id:string;passed:boolean;actual?:Json;error?:string}[] };
export const LIMITS = {sourceBytes:65536,caseBytes:65536,outputBytes:65536,consoleBytes:16384,consoleLines:100,memoryBytes:32*1024*1024,stackBytes:512*1024,executionMs:2000};
export async function execute(source:string,spec:FunctionSpec,runId:string,executionMs=LIMITS.executionMs):Promise<RunResult> {
 const start=performance.now(); const result:RunResult={protocolVersion:1,runId,status:'failed',durationMs:0,diagnostics:[],console:[],cases:[]};
 const bytes=(s:string)=>new TextEncoder().encode(s).length;
 if(bytes(source)>LIMITS.sourceBytes || bytes(JSON.stringify(spec.cases))>LIMITS.caseBytes || spec.cases.length>25 || !/^[a-zA-Z_$][\w$]*$/.test(spec.entrypoint)){return {...result,status:'unsupported',diagnostics:['Exercise exceeds the supported function contract.']};}
 // An imported WASM memory has a hard 64 MiB maximum independent of QuickJS allocation accounting.
 const memory=new WebAssembly.Memory({initial:256,maximum:1024});
 const q=await newQuickJSWASMModule(newVariant(RELEASE_SYNC,{wasmMemory:memory}));const runtime=q.newRuntime();runtime.setMemoryLimit(LIMITS.memoryBytes);runtime.setMaxStackSize(LIMITS.stackBytes);
 const deadline=performance.now()+Math.min(2000,Math.max(1,executionMs));runtime.setInterruptHandler(()=>performance.now()>deadline);
 const vm=runtime.newContext();let consoleBytes=0;
 const log=vm.newFunction('log',(...args)=>{if(result.console.length>=LIMITS.consoleLines)return;const line=args.slice(0,16).map(a=>{try{const kind=vm.typeof(a);if(kind==='string')return vm.getString(a).slice(0,512);if(kind==='number')return String(vm.getNumber(a));if(kind==='undefined')return 'undefined';if(kind==='boolean')return vm.dump(a)?'true':'false';return '['+kind+']';}catch{return '[unprintable]';}}).join(' ').slice(0,2048);const size=bytes(line);if(consoleBytes+size<=LIMITS.consoleBytes){result.console.push(line);consoleBytes+=size;}});
 const con=vm.newObject();vm.setProp(con,'log',log);vm.setProp(con,'warn',log);vm.setProp(con,'error',log);vm.setProp(vm.global,'console',con);con.dispose();log.dispose();
 try {
  // Only interpreter evaluation is permitted. No learner code runs in the host runtime.
  const errorText=(handle:QuickJSHandle)=>{try{if(vm.typeof(handle)==='string')return vm.getString(handle);const message=vm.getProp(handle,'message');try{return vm.typeof(message)==='string'?vm.getString(message):'Interpreter execution failed';}finally{message.dispose();}}finally{handle.dispose();}};
  const loaded=vm.evalCode(source,'exercise.js');if(loaded.error){throw new Error(errorText(loaded.error));}loaded.value.dispose();
  for(const test of spec.cases){
   const call=vm.evalCode('(()=>{const args='+JSON.stringify(test.args)+';const value='+spec.entrypoint+'(...args);return JSON.stringify({value,args});})()','case.js');
   if(call.error){throw new Error(errorText(call.error));}
   const serialized=vm.getString(call.value);call.value.dispose();if(bytes(serialized)>LIMITS.outputBytes)throw new Error('Output exceeds 64 KiB');
   const actual:unknown=JSON.parse(serialized);if(!actual || typeof actual!=='object' || !('value' in actual) || !('args' in actual))throw new Error('Return a JSON-serializable value');
   const value=actual.value as Json;const passed=equal(value,test.expected)&&(!spec.assertInputUnchanged||equal(actual.args,test.args));result.cases.push({id:test.id,passed,actual:value});
  }
  result.status=result.cases.every(c=>c.passed)?'passed':'failed';
 }catch(error){const message=error instanceof Error?error.message:'Runner failed';result.status=performance.now()>deadline || /interrupted/i.test(message)?'timed_out':'runtime_error';result.diagnostics.push(message.slice(0,2000));}
 finally {try{vm.dispose();runtime.dispose();}catch{result.status='runtime_error';result.diagnostics.push('Interpreter aborted during resource cleanup. Its dedicated worker is discarded.');}result.durationMs=Math.round(performance.now()-start);}
 return result;
}
