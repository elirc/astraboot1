import ts from 'typescript';
export function compile(source:string,libs:Record<string,string>) {
 const file='/exercise.ts';const options:ts.CompilerOptions={strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None,noEmitOnError:true,lib:['lib.es2020.d.ts'],skipLibCheck:true};
 const files:Record<string,string>={...libs,[file]:source};let output='';
 const host:ts.CompilerHost={getSourceFile:(name,languageVersion)=>files[name]!==undefined?ts.createSourceFile(name,files[name],languageVersion,true):undefined,getDefaultLibFileName:()=>'/lib.es2020.d.ts',writeFile:(_name,text)=>{output=text;},getCurrentDirectory:()=> '/',getDirectories:()=>[],fileExists:name=>files[name]!==undefined,readFile:name=>files[name],getCanonicalFileName:n=>n,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const program=ts.createProgram([file],options,host);const parsed=program.getSourceFile(file);const forbidden:string[]=[];
 function inspect(node:ts.Node){if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)||ts.isImportEqualsDeclaration(node)||(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword))forbidden.push('Imports and exports are unsupported. Use one named function.');ts.forEachChild(node,inspect);}
 if(parsed)inspect(parsed);const diagnostics=ts.getPreEmitDiagnostics(program).map(d=>{const pos=d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start):undefined;return (pos?'Line '+(pos.line+1)+': ':'')+ts.flattenDiagnosticMessageText(d.messageText,'\n');});
 if(!diagnostics.length&&!forbidden.length)program.emit();return {code:output,diagnostics:[...forbidden,...diagnostics]};
}
