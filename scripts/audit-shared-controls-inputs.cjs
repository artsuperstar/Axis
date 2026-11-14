/** Phase-local integrity, contrast, geometry and baseline evidence. No runtime mutations. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const assert = require('node:assert/strict'), ts = require('typescript'), Module = require('node:module');
const dir = 'docs/design-system/shared-controls-inputs', scratch = 'dist/shared-controls-inputs';
const read = file => fs.readFileSync(file, 'utf8');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const initial = JSON.parse(read(`${dir}/initial-state.json`));
const changed = initial.files.filter(row => !fs.existsSync(row.file) || hash(row.file) !== row.sha256).map(row => row.file);
assert.deepEqual([...changed].sort(), ['control-appearance.ts','design-system.tsx','form-controls.tsx','internal-navigation.tsx'].map(n => 'src/components/' + n).sort());
const source = read('src/constants/design-system-v2.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const paletteFile = path.resolve('src/constants/design-system-v2.ts');
const mod = new Module(paletteFile); mod._compile(compiled, paletteFile); const { DesignColors } = mod.exports;
const lum = hex => { const c = hex.slice(1).match(/../g).slice(0,3).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return c[0]*.2126+c[1]*.7152+c[2]*.0722; };
const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const composite = (fg,bg,alpha) => '#' + [0,1,2].map(i => Math.round(parseInt(fg.slice(1+i*2,3+i*2),16)*alpha + parseInt(bg.slice(1+i*2,3+i*2),16)*(1-alpha)).toString(16).padStart(2,'0')).join('');
const contrasts = [];
for (const mode of ['dark','light']) {
  const c=DesignColors[mode];
  for(const background of ['surface','group','groupStrong','canvas','control','surfaceRaised','inset']) for(const foreground of ['controlBorder','brandFocus','danger','textPrimary','textMuted']) {
    const ratio=contrast(c[foreground],c[background]), threshold=['textPrimary','textMuted'].includes(foreground)?4.5:3;
    const required = !(background === 'inset' && foreground === 'controlBorder');
    contrasts.push({ mode, foreground, background, foregroundHex:c[foreground], backgroundHex:c[background], ratio, threshold, required,
      ...(!required ? { scope: 'Read-only labelled value, not an editable-field boundary. Disabled boundaries also exempt. Canonical inset retained.' } : {}) });
    if (required) assert.ok(ratio >= threshold, `${mode}/${foreground}/${background}`);
  }
  for(const [foreground,background] of [['onBrand','brand'],['onBrand','brandStrong'],['brand','selected'],['danger','dangerSoft'],['textDisabled','inset']]) contrasts.push({ mode,foreground,background,ratio:contrast(c[foreground],c[background]) });
  for(const background of ['surface','group','groupStrong','canvas','control','surfaceRaised']) {
    const ink=composite(c.onBrand,c[background],.92), fill=composite(c.brandStrong,c[background],.92);
    const ratio=contrast(ink,fill); assert.ok(ratio>=4.5); contrasts.push({mode,foreground:'onBrand at press opacity .92',background:'brandStrong at press opacity .92 over '+background,ratio});
  }
  contrasts.push({ mode,foreground:'old border',background:'surface',ratio:contrast(c.border,c.surface),threshold:3,expectedFailure:true });
}
const before=JSON.parse(read(`${dir}/before.json`)), after=JSON.parse(read(`${dir}/after.json`));
const geometry=[];
for(const a of after){const b=before.find(row=>row.file===a.file);assert.ok(b);if(b.fixtureHash)assert.equal(b.fixtureHash,a.fixtureHash);
  for(const control of a.controls){const old=b.controls.find(row=>row.role===control.role&&row.label===control.label);if(old)geometry.push({capture:a.file,label:control.label,role:control.role,before:{width:old.width,height:old.height,border:old.border,radius:old.radius},after:{width:control.width,height:control.height,border:control.border,radius:control.radius}});}
}
function functionText(file,name){const s=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true);return s.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText(s);}
for(const name of ['fieldAppearance','buttonAppearance'])assert.equal(functionText(`${scratch}/control-appearance.ts.before`,name),functionText('src/components/control-appearance.ts',name));
for(const name of ['autocomplete-field.tsx','form-selection-host.tsx'])assert.equal(hash(`${scratch}/${name}.before`),hash('src/components/'+name));
const diagnostics = name => JSON.parse(read(`${scratch}/${name}-eslint.json`)).flatMap(row=>row.messages.map(m=>({file:path.relative(process.cwd(),row.filePath).replaceAll('\\','/'),rule:m.ruleId,severity:m.severity,line:m.line,message:m.message})));
const lintBefore=diagnostics('baseline'), lintAfter=diagnostics('after'); assert.deepEqual(lintAfter,lintBefore);
const current=cp.spawnSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/);
const initialNames=new Set(initial.files.map(row=>row.file));const added=current.filter(file=>!initialNames.has(file));
const callers=current.filter(file=>/^src\/.*\.tsx$/.test(file)).flatMap(file=>read(file).split('\n').flatMap((line,index)=>/<(?:FormField|FormSelect|SelectField|AutocompleteField|FormChoice|FormWeekday|SegmentedControl|InlineNameForm)\b/.test(line)?[{file,line:index+1,source:line.trim()}]:[]));
const result={initialFiles:initial.files.length,unchangedInitialFiles:initial.files.length-changed.length,changedInitialFiles:changed,addedFiles:added,legacyHelpersUnchanged:true,selectorAndHostUnchanged:true,contrasts,geometry,callers,eslint:{baseline:lintBefore,final:lintAfter,newDiagnostics:0},gitStatus:cp.spawnSync('git',['status','--short'],{encoding:'utf8'}).stdout,staged:cp.spawnSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).stdout.trim()};
assert.equal(result.staged,'');fs.writeFileSync(`${dir}/audit.json`,JSON.stringify(result,null,2));
const diff=cp.spawnSync('git',['diff','--check'],{encoding:'utf8'});assert.equal(diff.status,0,diff.stdout+diff.stderr);fs.writeFileSync(`${scratch}/diff-check.log`,diff.stdout+diff.stderr);
console.log(JSON.stringify({initial:result.initialFiles,preserved:result.unchangedInitialFiles,changed,added:added.length,contrastChecks:contrasts.length,callSites:callers.length,eslintNew:0,diffCheck:0,staged:false}));
