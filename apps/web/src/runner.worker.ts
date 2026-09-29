import {execute,type FunctionSpec,type RunResult} from '../../../packages/runner/src/index';
let compileSource:((source:string)=>{code:string;diagnostics:string[]})|undefined;
self.onmessage=async(event:MessageEvent<{type?:'initialize';protocolVersion:1;runId:string;source:string;spec:FunctionSpec;language?:string}>)=>{
 if(event.data.type==='initialize'){if(event.data.language==='typescript')({compileSource}=await import('./typescript-environment'));self.postMessage({type:'ready'});return;}
 const {runId,source,spec}=event.data;let code=source;
 if(typeof source!=='string'||new TextEncoder().encode(source).length>65536)return;
 if(spec.language==='typescript'){if(!compileSource)({compileSource}=await import('./typescript-environment'));const compiled=compileSource(source);if(compiled.diagnostics.length){self.postMessage({protocolVersion:1,runId,status:'compile_error',durationMs:0,diagnostics:compiled.diagnostics.slice(0,50),console:[],cases:[]} satisfies RunResult);return;}code=compiled.code;}
 self.postMessage(await execute(code,spec,runId));
};
