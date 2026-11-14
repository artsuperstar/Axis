/** Verify this migration's exact one-line runtime delta and preservation of all initial files. */
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const folder='docs/design-system/task-edit-v2-migration',scratch='dist/task-edit-v2-migration';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const initial=JSON.parse(fs.readFileSync(folder+'/initial-state.json','utf8'));
const changed=initial.files.filter(row=>!fs.existsSync(row.file)||hash(fs.readFileSync(row.file))!==row.sha256).map(row=>row.file);
assert.deepEqual(changed,['src/features/tasks/tasks-screen.tsx']);
const source=fs.readFileSync(changed[0],'utf8');
const restored=source.replace('<TaskEditor task={shownEditor.task} appearance="v2"','<TaskEditor task={shownEditor.task} appearance={repeating ? \'v2\' : undefined}');
assert.equal(hash(restored),initial.files.find(f=>f.file===changed[0]).sha256,'No other screen source change');
const comparisons=JSON.parse(fs.readFileSync(folder+'/comparison.json','utf8'));
assert.equal(comparisons.length,26);
assert.deepEqual(comparisons.filter(x=>x.identical).map(x=>x.file).sort(),['actions-dark-390.png','actions-light-390.png','new-dark-390.png','new-light-390.png']);
for(const phase of ['before','after'])for(const theme of ['dark','light'])assert.equal(hash(fs.readFileSync(`${folder}/${phase}/edit-${theme}-390.png`)),hash(fs.readFileSync(`${folder}/${phase}/calendar-${theme}-390.png`)),'Calendar and Tasks same resolved editor fixture');
const diagnostics=name=>JSON.parse(fs.readFileSync(`${scratch}/${name}-eslint.json`,'utf8')).flatMap(r=>r.messages.map(m=>({file:r.filePath,rule:m.ruleId,line:m.line,column:m.column,severity:m.severity,message:m.message})));
assert.deepEqual(diagnostics('after'),diagnostics('baseline'));
const git=args=>{const r=cp.spawnSync('git',args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trimEnd()};
assert.equal(git(['rev-parse','HEAD']),initial.head);assert.equal(git(['diff','--cached','--name-only']),'');git(['diff','--check']);
const all=git(['ls-files','--cached','--others','--exclude-standard']).split(/\r?\n/),prior=new Set(initial.files.map(r=>r.file));
const status=git(['status','--porcelain=v1','--untracked-files=all']).split(/\r?\n/);
const result={initialFiles:initial.files.length,preserved:initial.files.length-changed.length,changedInitialFiles:changed,exactOneLineRuntimeChange:true,unchangedEditorAndDomain:true,unchangedSharedControlsAndNativeOwners:true,
  addedFiles:all.filter(f=>!prior.has(f)),pairedCaptures:26,identicalNewTaskAndLegacyControls:4,calendarParityBothThemes:true,newLintDiagnostics:0,
  counts:{modifiedTracked:status.filter(s=>!s.startsWith('??')).length,untracked:status.filter(s=>s.startsWith('??')).length},staged:false,head:initial.head};
fs.writeFileSync(folder+'/audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
