import {compile} from '../../../packages/runner/src/compiler';
const libraries=import.meta.glob('../../../node_modules/typescript/lib/lib.*.d.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const declarations=Object.fromEntries(Object.entries(libraries).map(([path,body])=>['/'+path.split('/').pop(),body]));
export const compileSource=(source:string)=>compile(source,declarations);
