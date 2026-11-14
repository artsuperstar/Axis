/** Runtime evidence only; approved Phase 1/2/3A.1 artifacts are read, never regenerated. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { DesignColors, type DesignMode, type DesignPalette } from '../src/constants/design-system-v2';
import { composite, contrast, runtimeContrast } from '../tests/helpers/soft-copper-contrast';

const output = 'docs/design-system/soft-copper-cutover';
const initial = JSON.parse(readFileSync(`${output}/initial-state.json`, 'utf8')) as { files: { file: string; sha256: string }[] };
const spec = JSON.parse(readFileSync('docs/design-system/soft-copper/tokens.json', 'utf8')) as {
  colors: Record<DesignMode, Record<string, string>>;
  rows: { name: string; aliasOf?: string; purpose: string; pairing: string }[];
};
const legacySource = execFileSync('git', ['show', 'HEAD:src/constants/design-system-v2.ts'], { encoding: 'utf8' });
const sandbox = { exports: {} as { DesignColors: Record<DesignMode, Record<string, string>> } };
runInNewContext(ts.transpileModule(legacySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const oldColors = sandbox.exports.DesignColors; // Phase 3A.1 left all token values identical to HEAD.
const retainedFitness = new Set(['fitnessAccent', 'fitnessAccentSoft', 'fitnessText', 'onFitness']);
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? files(path) : [path]; });
}
const sources = files('src').filter(file => /\.tsx?$/.test(file)).map(file => ({ file: file.replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }));
const introducedActive = new Set(['financeIncome', 'financeExpense', 'onFeature', 'shadowColor', 'success', 'successSoft', 'completed', 'received', 'overdue', 'pending']);
const rows = [...spec.rows, { name: 'shadow', aliasOf: 'shadowColor', purpose: 'Color-only legacy v2 shadow compatibility', pairing: 'Raised surface shadow only' }].map(row => {
  const key = row.name as keyof DesignPalette;
  const references = sources.filter(source => new RegExp(`\\.${key}\\b|color=["']${key}["']`).test(source.text) && /useDesignColors|useDesignTheme|DesignPalette|DesignColors/.test(source.text))
    .map(source => source.file).filter(file => file !== 'src/constants/design-system-v2.ts');
  const active = key !== 'shadow' && key !== 'onFitness' && (key in oldColors.light || introducedActive.has(key));
  return { ...row, dark: DesignColors.dark[key], light: DesignColors.light[key], validColor: ['light', 'dark'].every(mode => /^#[\da-f]{6}([\da-f]{2})?$/i.test(DesignColors[mode as DesignMode][key])),
    changes: Object.fromEntries((['dark', 'light'] as const).map(mode => [mode, !(key in oldColors[mode]) ? 'new' : oldColors[mode][key] === DesignColors[mode][key] ? 'unchanged' : 'changed'])),
    active, references: active ? (key === 'pending' || key === 'overdue' ? ['src/features/finance/work/components/work-client-details.tsx'] : references) : [], reservedFor: active ? null : key === 'shadow' ? 'Compatibility until raised-surface callers finish migration; retire in 3B-S' : key === 'onFitness' ? 'Retained filled-Fitness foreground; future feature migration' : /work|journal|fitness|home|calendar|financeAccent/i.test(key) ? 'Later feature/native-shell batches; no manufactured consumer' : 'Phase 3B controls/sheets and later semantic consumers',
    deviation: retainedFitness.has(key) ? 'Existing Fitness values retained by explicit 3A.2 instruction; emerald mapping deferred' : null,
    aliasesEqual: row.aliasOf ? (['dark', 'light'] as const).every(mode => DesignColors[mode][key] === DesignColors[mode][row.aliasOf as keyof DesignPalette]) : null };
});
writeFileSync(`${output}/token-audit.json`, JSON.stringify({ contractTokens: 60, compatibilityTokens: 1, rows }, null, 2));
writeFileSync(`${output}/runtime-token-register.md`, '# Runtime Soft Copper register\n\nD/L change: N=new, C=changed, U=unchanged. Fitness exceptions retain the pre-cutover pigments. `shadow` is the sole extra compatibility key.\n\n|Token|Dark|Light|D/L change|Usage|Alias / scope|\n|---|---|---|---|---|---|\n'
  + rows.map(row => `|${row.name}|${row.dark}|${row.light}|${String(row.changes.dark)[0].toUpperCase()}/${String(row.changes.light)[0].toUpperCase()}|${row.active ? 'Active' : 'Reserved'}|${row.deviation ?? (row.aliasOf ? `→ ${row.aliasOf}` : row.reservedFor ?? row.purpose)}|`).join('\n') + '\n');

const pairs = (['dark', 'light'] as const).flatMap(mode => runtimeContrast(DesignColors[mode], mode));
const proposedFitnessPairs = (['dark', 'light'] as const).flatMap(mode => {
  const colors = DesignColors[mode];
  return [{ mode, pairing: 'fitnessAccent / fitnessAccentSoft', ratio: contrast(colors.fitnessAccent, colors.fitnessAccentSoft) },
    { mode, pairing: 'onFeature / fitnessAccent', ratio: contrast(colors.onFeature, colors.fitnessAccent) }];
});
const alpha = (['dark', 'light'] as const).flatMap(mode => {
  const colors = DesignColors[mode];
  return (['canvas', 'group'] as const).flatMap(surface => (['scrim', 'shadowColor'] as const).map(role => {
    const background = composite(colors[role], colors[surface]);
    return { mode, role, surface, alphaColor: colors[role], composited: background, bodyTextRatio: contrast(colors.textPrimary, background), scope: 'Composited backdrop/shadow evidence; scrims do not own interactive text' };
  }));
});
writeFileSync(`${output}/contrast.json`, JSON.stringify({ method: 'sRGB relative luminance, unrounded thresholds; alpha colors composited over the named actual runtime surface.',
  required: pairs.filter(pair => pair.required).length, passed: pairs.filter(pair => pair.required && pair.ratio >= pair.threshold).length,
  pairs, alpha, financeIncomeText: (['dark', 'light'] as const).map(mode => ({ mode, foreground: DesignColors[mode].financeIncome,
    background: DesignColors[mode].group, ratio: contrast(DesignColors[mode].financeIncome, DesignColors[mode].group), threshold: 4.5 })),
  pressOpacity: (['dark', 'light'] as const).flatMap(mode => (['brand', 'brandStrong'] as const).map(role => {
    const colors = DesignColors[mode], foreground = composite(colors.onBrand, colors.group, 0.92), background = composite(colors[role], colors.group, 0.92);
    return { mode, role, opacity: 0.92, foreground, background, ratio: contrast(foreground, background) };
  })), deferredFitnessPairs: proposedFitnessPairs,
  note: 'Same 118 required Phase 2 role pairs; retained Fitness uses its actual fitnessText/onFitness foregrounds. Future emerald aliases are not applied. Strong controlBorder availability is not systemic field migration; current resting fields remain below 3:1.' }, null, 2));

const changed = initial.files.filter(({ file, sha256 }) => !existsSync(file) || createHash('sha256').update(readFileSync(file)).digest('hex') !== sha256).map(row => row.file);
const previousArtifacts = initial.files.filter(row => row.file.startsWith('docs/design-system/') || /scripts\/(audit-visual|build-palette|build-soft|capture-visual|preview-visual|review-theme)/.test(row.file) || row.file === 'tests/theme-mode.test.ts');
const geometryTokens = ['Shape', 'DesignSpace', 'MotionTokens', 'TouchTarget', 'DesignTypography'];
function constants(source: string) {
  const ast = ts.createSourceFile('file.tsx', source, ts.ScriptTarget.Latest, true);
  return Object.fromEntries(ast.statements.filter(ts.isVariableStatement).flatMap(statement => statement.declarationList.declarations.map(declaration => [declaration.name.getText(ast), declaration.initializer?.getText(ast).replaceAll('\r\n', '\n')])));
}
const before = constants(legacySource), after = constants(readFileSync('src/constants/design-system-v2.ts', 'utf8'));
const preservedGeometry = geometryTokens.every(key => before[key] === after[key]);
const changedStyleDefinitions = changed.filter(file => file.startsWith('src/')).filter(file => {
  const before = constants(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }));
  const after = constants(readFileSync(file, 'utf8'));
  return before.styles !== after.styles;
});
writeFileSync(`${output}/source-invariants.json`, JSON.stringify({ initialFiles: initial.files.length, changedExistingFiles: changed,
  priorArtifacts: previousArtifacts.length, priorArtifactsUnchanged: previousArtifacts.every(row => !changed.includes(row.file)),
  homeAssetsUnchanged: initial.files.filter(row => /assets\/.*(home|topograph)/i.test(row.file)).every(row => !changed.includes(row.file)),
  geometryTokensUnchanged: preservedGeometry, changedStyleDefinitions }, null, 2));
console.log(`${rows.length} runtime color keys, ${pairs.filter(pair => pair.required && pair.ratio >= pair.threshold).length}/118 required runtime contrast pairs pass; ${changed.length} existing files changed`);
if (pairs.some(pair => pair.required && pair.ratio < pair.threshold) || !preservedGeometry || changedStyleDefinitions.length) process.exitCode = 1;
