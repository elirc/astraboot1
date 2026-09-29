import {readFile,writeFile,readdir} from 'node:fs/promises';
const pkg=JSON.parse(await readFile('curriculum/fixtures/chapter-01.json','utf8'));
for(const file of (await readdir('curriculum/authoring')).filter(f=>/^chapter-\d+\.mjs$/.test(f)).sort()){
const items=(await import(new URL('../curriculum/authoring/'+file,import.meta.url))).default;
pkg.items.push(...items);pkg.items[0].chapterIds.push(...items.filter(i=>i.kind==='chapter').map(i=>i.id));
}
(await import('../curriculum/authoring/placement-coding.mjs')).default(pkg.items);
const release=JSON.parse(await readFile('projects/support-desk/releases/manifest.json','utf8'));
if(release.version!==1||!/^v[1-9]\d*$/.test(release.assetVersion??''))throw new Error('Mission release manifest requires version 1 and assetVersion vN.');
const assetRevision=Number(release.assetVersion.slice(1));
if(!Array.isArray(release.assets)||release.assets.length!==6||release.assets.some(asset=>!new RegExp('^m0[1-3]-(starter|reference)-'+release.assetVersion+'$').test(asset.id)))throw new Error('Mission release manifest must contain the six current assets for '+release.assetVersion+'.');
pkg.packageVersion=assetRevision+2;pkg.title='DevPractice expanded web curriculum';pkg.items[0].version=assetRevision+1;
pkg.items.push(...(await import('../curriculum/authoring/expansion.mjs')).default());
const missionItems=(await import('../curriculum/authoring/missions.mjs')).default(release.assetVersion);pkg.items.push(...missionItems);pkg.assets=release.assets;
for(const [chapterId,missionId] of [['v1-ch08','m01'],['v1-ch10','m02'],['v1-ch12','m03']])pkg.items.find(i=>i.id===chapterId).missionIds=[missionId];
await writeFile('curriculum/snapshot.json',JSON.stringify(pkg,null,2)+'\n');
console.log('Assembled '+pkg.items.length+' items.');
