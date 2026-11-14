/** Phase 2 review artifacts only. Never imported by Axis and never writes runtime/Phase 1 files. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const output = path.resolve('docs/design-system/soft-copper');
fs.mkdirSync(output, { recursive: true });
const phase1 = JSON.parse(fs.readFileSync('docs/design-system/palette-candidates.json', 'utf8'));
const copper = phase1.candidates.find(row => row.id === 'copper');
const rows = [];
function token(name, light, dark, purpose, origin, replaces, consumers, pairing) {
  rows.push({ name, light, dark, purpose, origin, replaces, consumers, pairing });
}
function alias(name, target, purpose, replaces, consumers) {
  const value = rows.find(row => row.name === target); assert.ok(value, target);
  rows.push({ ...value, name, aliasOf: target, purpose, origin: 'Proposed alias; no new pigment', replaces, consumers });
}
const shared = (name, source, purpose, consumers, pairing, replaces = name) => token(name, phase1.common.light[source], phase1.common.dark[source], purpose, 'Inherited Phase 1 common foundation', replaces, consumers, pairing);
token('brand', copper.light.brand, copper.dark.brand, 'Axis primary interaction accent', 'Approved Soft Copper primary', 'DesignColors.brand; legacy interaction accent only', 'UiButton, navigation, focus, selectors', 'onBrand on brand; brand on brandSoft');
token('brandStrong', copper.light.pressed, copper.dark.pressed, 'Primary hover/pressed fill, not default fill', 'Inherited selected C pressed values', 'Current brandStrong default-button use', 'UiButton state resolver', 'onBrand on brandStrong');
token('brandSoft', copper.light.soft, copper.dark.soft, 'Subtle copper selection/tone', 'Inherited selected C subtle values', 'rose brandSoft / selected fills', 'Selectors, tabs, toned actions', 'brand on brandSoft');
token('onBrand', copper.light.onBrand, copper.dark.onBrand, 'Text/icon on filled copper', 'Inherited selected C foreground values', 'Current onBrand', 'Filled primary actions', 'onBrand on brand / brandStrong');
shared('canvas', 'canvas', 'Screen canvas', 'Screens, native theme adapter', 'textPrimary / textSecondary');
shared('surface', 'surface', 'Input and regular lightest surface', 'Fields, regular surface groups', 'textPrimary; controlBorder');
shared('group', 'group', 'Contained content group', 'GroupSurface, cards, summaries', 'textPrimary / textSecondary');
token('groupStrong', '#F7EDE8', '#2B2429', 'Stronger flat group', 'Inherited runtime v2', 'Current groupStrong', 'Groups, pressed neutral controls', 'textPrimary / textSecondary');
token('inset', '#F0E9E5', '#191619', 'Inset/read-only/disabled region', 'Inherited runtime v2', 'Current inset', 'Readonly and disabled fields', 'textPrimary for read-only; textDisabled when unavailable');
shared('control', 'control', 'Neutral interactive fill', 'Secondary/tertiary controls, neutral chips', 'textPrimary; controlBorder where outline defines control');
token('surfaceRaised', '#FFFCF8', '#2B2429', 'Menu/popover actual raised surface', 'Proposed role using existing v2 pigments', 'Legacy surfaceRaised in v2 consumers', 'Selection host, ContextMenu', 'textPrimary / textSecondary; controlBorder');
alias('overlay', 'canvas', 'Sheet/dialog base, not the backdrop scrim', 'Legacy overlay surface / v2 canvas literals', 'AdaptiveSheet, shared dialogs');
shared('textPrimary', 'text', 'Body, labels and exact values', 'UiText, fields, summaries', 'canvas/surface/group/control');
shared('textSecondary', 'secondary', 'Supporting readable text', 'Metadata, neutral statuses', 'canvas/surface/group/control');
shared('textMuted', 'muted', 'Placeholder and tertiary supporting text', 'Fields, captions, axes', 'surface/control/group');
alias('textDisabled', 'textMuted', 'Unavailable controls only; no opacity reduction', 'Local disabled text/opacity', 'All disabled controls');
shared('border', 'divider', 'Decorative divider/card border', 'Groups, separators, charts', 'No identification duty; never default editable outline');
shared('controlBorder', 'border', 'Neutral resting outline required to identify controls', 'FormField, FormSelect, secondary buttons', 'Against surface/group/control/raised', 'Current DesignColors.border on fields');
alias('borderStrong', 'controlBorder', 'One strong-neutral outline role', 'Current borderStrong', 'Read-only boundary and necessary outlines');
alias('selected', 'brandSoft', 'Interaction selection fill, never completion', 'Current rose selected', 'SegmentedControl, navigation, selection host');
alias('controlPressed', 'groupStrong', 'Pressed/hovered neutral fill', 'Ad hoc selected fill for non-selected press', 'Secondary/quiet buttons and rows');
shared('success', 'success', 'Successful/completed/received state text', 'Status chips and notices', 'successSoft or neutral group', 'Legacy success / paid tint');
token('successSoft', '#E4F0E8', '#20382D', 'Subtle positive status fill', 'Inherited legacy light; proposed dark addition', 'Local alpha success fills', 'Completed and received chips', 'success text/icon');
shared('attention', 'warning', 'Warning and source-derived overdue', 'Warnings and overdue labels', 'attentionSoft or group', 'Legacy warning + v2 attention');
token('attentionSoft', '#FBEACF', '#4C3928', 'Warning/overdue chip fill', 'Inherited runtime v2', 'Current attentionSoft', 'Warning chips/notices', 'attention');
shared('danger', 'danger', 'Error/destructive text and invalid outline', 'Error text, destructive actions, invalid fields', 'dangerSoft / neutral surfaces', 'Current danger');
token('dangerSoft', '#F6E2E5', '#432A30', 'Quiet error/destructive fill', 'Proposed addition', 'Local destructive tinted backgrounds', 'Invalid help groups, destructive tonal buttons', 'danger text/icon');
shared('info', 'info', 'Informational text/icon', 'Information notices', 'infoSoft / neutral surfaces', 'Current info');
token('infoSoft', '#E6EDF5', '#243345', 'Quiet informational fill', 'Proposed addition', 'Local informational fills', 'Information notices', 'info');
alias('financeIncome', 'success', 'Income data series; separate semantic alias', 'overviewColors income literals', 'Overview, transaction amount colors');
token('financeExpense', '#94455C', '#F1A9B4', 'Expense data, not error', 'Inherited active Overview', 'overviewColors expenses literals', 'Charts and signed transaction values', 'neutral surfaces; do not use as button foreground');
token('taskAccent', '#505A8A', '#AEB7E8', 'Task identity, not task selection/status', 'Inherited Phase 1 feature proposal', 'taskAccent / taskText local pairing', 'Task identity tiles and sections', 'taskAccentSoft; onFeature on filled accent');
token('taskAccentSoft', '#E6E7F3', '#303247', 'Task identity tile fill', 'Inherited runtime v2', 'Current taskAccentSoft', 'Task icons and section markers', 'taskAccent');
token('workAccent', '#245C49', '#BCEAD5', 'Work identity, distinct from received state', 'Inherited Phase 1 feature proposal', 'Legacy green main / rose detail identity', 'Work/job/client identity tiles', 'workAccentSoft; onFeature on filled accent');
token('workAccentSoft', '#E9F1E9', '#11291F', 'Work identity tile fill', 'Proposed mapping from approved Home pigments', 'Legacy accentMuted / rose identity fill', 'Work identity tiles', 'workAccent');
token('fitnessAccent', '#2D6651', '#BCEAD5', 'Emerald Fitness identity, not completion', 'Inherited Phase 1 feature proposal; migration decision pending', 'Current copper fitnessAccent', 'Workout identity/progress and library tiles', 'fitnessAccentSoft; onFeature on filled accent');
alias('fitnessAccentSoft', 'workAccentSoft', 'Emerald Fitness tile fill', 'Current copper fitnessAccentSoft', 'Fitness identity');
token('journalAccent', '#28634F', '#9DCAB6', 'Quiet reflection/mood identity', 'Inherited actual Journal/legacy accent mapping', 'useJournalColors legacy bridge', 'Journal mood/reflection tiles', 'journalAccentSoft; onFeature on filled accent');
token('journalAccentSoft', '#E4F0E8', '#263F33', 'Quiet reflection tile fill', 'Inherited actual Journal/legacy mapping', 'useJournalColors accentSoft', 'Journal mood/reflection identity', 'journalAccent');
token('onFeature', '#FFFCF8', '#151315', 'Foreground only on filled feature accents', 'Proposed alias pair using existing neutral pigments', 'Local onFitness / ad hoc foregrounds', 'Filled feature tiles; not status text', 'task/work/fitness/journal accent');
token('calendarTask', '#2563EB', '#93C5FD', 'Task categorical calendar marker', 'Inherited legacy source-marker palette', 'Legacy calendarTask', 'Calendar dots and legend', 'Existing legend/source accessibility labels remain');
token('calendarCommitment', '#B45309', '#FBBF24', 'Commitment categorical calendar marker', 'Inherited legacy source-marker palette', 'Legacy calendarCommitment', 'Calendar dots and legend', 'Source category, not overdue inference');
token('calendarWorkPayment', '#0F766E', '#5EEAD4', 'Expected Work payment categorical marker', 'Inherited legacy source-marker palette', 'Legacy calendarWorkPayment', 'Calendar dots and legend', 'Does not mean received Income');
token('scrim', '#10181447', '#0000007A', 'Native modal backdrop overlay', 'Inherited legacy RGBA, rounded to 8-bit alpha HEX', 'Legacy rgba scrim', 'AdaptiveModal backdrop', 'Composite over underlying canvas, never text background by itself');
token('shadowColor', '#2D1C2C24', '#00000000', 'Restrained raised-menu shadow tint', 'Inherited v2 shadow, rounded alpha; transparent dark', 'Current rgba shadow / none', 'Raised menu only', 'Not used as text or control boundary');
for (const [name, target, purpose] of [
  ['brandFocus', 'brand', 'Focus outline/caret'], ['brandBorder', 'brand', 'Selected/focused interaction outline'], ['brandSelection', 'selected', 'Selected interaction background'],
  ['brandDecorative', 'brand', 'Optional small brand detail; no extra copper pigment'], ['taskText', 'taskAccent', 'Compatibility task foreground'], ['fitnessText', 'fitnessAccent', 'Compatibility Fitness foreground'], ['onFitness', 'onFeature', 'Compatibility feature foreground'],
  ['completed', 'success', 'Source-completed status'], ['received', 'success', 'Actual money received status'], ['overdue', 'attention', 'Source-derived overdue status'], ['pending', 'textSecondary', 'Neutral pending state'], ['outstanding', 'textPrimary', 'Neutral outstanding balance'],
  ['homeAccent', 'brand', 'Home shared controls only; approved photo palettes untouched'], ['calendarAccent', 'brand', 'Calendar interactions; source marker colors separate'], ['financeAccent', 'brand', 'Finance actions; financial series separate'],
]) alias(name, target, purpose, 'Existing local role / proposed explicit semantic alias', 'Role-specific consumers; resolved in current palette');
const resolve = theme => Object.fromEntries(rows.map(row => [row.name, row[theme]]));
const colors = { light: resolve('light'), dark: resolve('dark') };
const binding = {
  primary: { background: 'brand', foreground: 'onBrand', border: 'brand', pressed: 'brandStrong' },
  secondary: { background: 'control', foreground: 'textPrimary', border: 'controlBorder', pressed: 'controlPressed' },
  tertiary: { background: 'canvas', foreground: 'brand', border: null, pressed: 'controlPressed', note: 'Actual resting fill transparent; canvas is the pairing context.' },
  destructive: { background: 'dangerSoft', foreground: 'danger', border: 'danger', pressed: 'dangerSoft' },
  selected: { background: 'selected', foreground: 'brand', border: 'brand', check: true },
  unselected: { background: 'control', foreground: 'textSecondary', border: 'controlBorder' },
  focused: { border: 'brandFocus', ring: 'brandFocus', note: '2-unit ring, 2-unit neutral separation. Filled primary needs onBrand inner keyline plus outside neutral gap.' },
  disabled: { background: 'inset', foreground: 'textDisabled', border: 'border', opacity: 1 },
  input: { background: 'surface', foreground: 'textPrimary', border: 'controlBorder', placeholder: 'textMuted', label: 'textPrimary', caret: 'brand' },
  inputFocused: { background: 'surface', foreground: 'textPrimary', border: 'brandFocus' },
  inputInvalid: { background: 'surface', foreground: 'textPrimary', border: 'danger', helper: 'danger' },
  inputDisabled: { background: 'inset', foreground: 'textDisabled', border: 'border' },
  inputReadOnly: { background: 'inset', foreground: 'textPrimary', border: 'controlBorder', note: 'Read-only remains readable and is not disabled.' },
  positiveChip: { background: 'successSoft', foreground: 'success', border: null },
  warningChip: { background: 'attentionSoft', foreground: 'attention', border: null },
  neutralChip: { background: 'control', foreground: 'textSecondary', border: null },
  card: { background: 'group', foreground: 'textPrimary', border: 'border' },
  sheet: { background: 'overlay', foreground: 'textPrimary', border: 'border' },
  menu: { background: 'surfaceRaised', foreground: 'textPrimary', border: 'controlBorder' },
  nativeTabs: { background: 'canvas', foreground: 'textSecondary', selectedForeground: 'brand', indicator: 'brandSoft', note: 'NativeTabs mapping only; OS owns material, shape and layout.' },
};
function lum(hex) { assert.match(hex, /^#[\dA-F]{6}$/i); const c = hex.slice(1).match(/../g).map(s => parseInt(s, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const contrast = [];
function check(theme, label, foreground, background, threshold = 4.5, required = true) {
  const p = colors[theme], a = p[foreground] ?? foreground, b = p[background] ?? background, value = ratio(a, b);
  contrast.push({ theme, label, foreground: a, background: b, ratio: value, threshold, required, passes: value >= threshold });
}
for (const theme of ['light', 'dark']) {
  for (const background of ['canvas', 'surface', 'group', 'groupStrong', 'control', 'surfaceRaised']) {
    check(theme, `body / ${background}`, 'textPrimary', background);
    check(theme, `secondary / ${background}`, 'textSecondary', background);
    check(theme, `placeholder-supporting / ${background}`, 'textMuted', background);
    check(theme, `control boundary / ${background}`, 'controlBorder', background, 3);
    check(theme, `focus / ${background}`, 'brandFocus', background, 3);
    check(theme, `invalid boundary / ${background}`, 'danger', background, 3);
  }
  for (const [label, foreground, background] of [['primary', 'onBrand', 'brand'], ['primary pressed', 'onBrand', 'brandStrong'], ['secondary button', 'textPrimary', 'control'], ['form label', 'textPrimary', 'group'], ['placeholder', 'textMuted', 'surface'], ['selected label', 'brand', 'selected'], ['success chip', 'success', 'successSoft'], ['overdue chip', 'attention', 'attentionSoft'], ['error chip', 'danger', 'dangerSoft'], ['info chip', 'info', 'infoSoft'], ['pending chip', 'textSecondary', 'control'], ['expense amount', 'financeExpense', 'group']]) check(theme, label, foreground, background);
  check(theme, 'disabled text (informational; inactive exempt)', 'textDisabled', 'inset', 4.5, false);
  for (const feature of ['task', 'work', 'fitness', 'journal']) {
    check(theme, `${feature} identity text/icon on soft`, `${feature}Accent`, `${feature}AccentSoft`);
    check(theme, `${feature} filled tile foreground`, 'onFeature', `${feature}Accent`);
  }
  check(theme, 'current resting field boundary', theme === 'light' ? '#E4DAD4' : '#3A3337', 'surface', 3, false);
  check(theme, 'current input fill / group', 'surface', 'group', 3, false);
  check(theme, 'proposed selected fill alone / control', 'selected', 'control', 3, false);
  for (const feature of ['calendarTask', 'calendarCommitment', 'calendarWorkPayment']) check(theme, `${feature} meaningful marker`, feature, 'group', 3);
}
const data = { scope: 'Phase 2 specification only, no runtime import. Only Soft Copper primary direction is approved; additions/mappings explicitly marked.', rows, colors, binding,
  categoricalCharts: { light: ['#94455C', '#667260', '#92703A', '#4D729A', '#40765D', '#797371'], dark: ['#F1A9B4', '#B6C1B5', '#E4C28E', '#A9C9EA', '#9BCBB5', '#9A9999'], status: 'Inherited active Overview; preserve category identity/order and text legend, no action/semantic meaning.' } };
function generate() {
  fs.writeFileSync(path.join(output, 'tokens.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(path.join(output, 'contrast.json'), JSON.stringify({ method: 'sRGB relative luminance, unrounded threshold comparison. Opaque pairs only; alpha scrim/shadow not treated as text surfaces.', contrast }, null, 2));
  const table = '# Exact Soft Copper token register\n\n[Specification](../soft-copper-specification.md). Approved = explicit selected primary; inherited does not imply every mapping was separately approved. All aliases resolve to exact HEX values below.\n\n| Token | Dark HEX | Light HEX | Purpose / pairing | Provenance | Replaces | Consumers |\n|---|---|---|---|---|---|---|\n' + rows.map(r => `| ${r.name}${r.aliasOf ? ` → ${r.aliasOf}` : ''} | \`${r.dark}\` | \`${r.light}\` | ${r.purpose}; ${r.pairing} | ${r.origin} | ${r.replaces} | ${r.consumers} |`).join('\n') + '\n';
  fs.writeFileSync(path.join(output, 'token-register.md'), table);
  writeTraceability();
  writeSpecimen();
  console.log(JSON.stringify({ tokens: rows.length, contrastPairs: contrast.length, requiredFailures: contrast.filter(r => r.required && !r.passes) }, null, 2));
}
function writeSpecimen() {
  const fonts = [['manrope', 'Manrope-Regular', 'Body'], ['manrope', 'Manrope-SemiBold', 'Strong'], ['lora', 'Lora-SemiBold', 'Editorial']].map(([folder, name, alias]) => `@font-face{font-family:${alias};src:url(data:font/ttf;base64,${fs.readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')})}`).join('');
  function panel(theme) {
    const p = colors[theme], vars = Object.entries(p).map(([key, value]) => `--${key}:${value}`).join(';');
    return `<article class="theme" data-theme="${theme}" style="${vars}"><header><span class="meta">${theme} · specification, not running app</span><h2>Soft Copper</h2><p>Warm editorial surfaces. Copper identifies interaction; status stays semantic.</p></header>
      <section><h3>Actions</h3><div class="actions"><button class="primary">Record payment</button><button class="secondary">Add work</button><button class="destructive">Delete payment</button><button class="tertiary">Cancel</button><button disabled>Confirm</button><button class="primary pressed">Record payment · pressed</button></div></section>
      <section><h3>Fields and selection</h3><label>Amount<input value="125,00" aria-label="Amount"></label><label>Description · focused<input value="Client handover" class="focus-demo" aria-label="Description focused example"></label><label>Amount · invalid<input value="0,00" class="invalid" aria-invalid="true" aria-describedby="error-${theme}" aria-label="Invalid amount"></label><p id="error-${theme}" class="error">Enter an amount greater than zero.</p><label>Note<textarea aria-label="Optional note" placeholder="Add a note (optional)"></textarea></label><label>Category<select aria-label="Category"><option>No category</option><option>Freelance</option></select></label><p class="meta">Select styling is illustrative; Axis uses its existing selection host.</p><fieldset><legend>Transaction type</legend><div class="segments"><button aria-pressed="true">Expense</button><button aria-pressed="false">Income</button></div></fieldset><label>Search<input type="search" placeholder="Search transactions…" aria-label="Search transactions"></label><label>Disabled<input value="Unavailable" disabled aria-label="Disabled input"></label></section>
      <section><h3>Financial hierarchy</h3><div class="summary"><span class="meta">Outstanding</span><strong class="money">R$ 1.479,58</strong><div class="metrics"><div><span>Earned</span><b>R$ 1.659,58</b></div><div><span>Received</span><b class="positive">R$ 180,00</b></div></div><p class="meta">Illustrative amounts. Earned work is not received Income.</p></div><div class="chips"><span class="positive-chip">✓ Completed</span><span class="warning-chip">! Overdue</span><span class="neutral-chip">Pending</span><span class="error-chip">Error</span><span class="info-chip">Information</span></div><div class="list-row"><div><strong>Client handover</strong><p class="meta">Work 5 Nov 2026</p></div><div><b>R$ 300,00</b><span class="meta">outstanding</span></div><button class="secondary icon" aria-label="Options for Client handover">⋯</button></div></section>
      <section><h3>Feature identity</h3><div class="feature-grid">${['task', 'work', 'fitness', 'journal'].map(f => `<div style="color:var(--${f}Accent);background:var(--${f}AccentSoft);border-radius:8px;padding:12px">${f}</div>`).join('')}</div><p class="meta">Home photographs/textures unchanged. Finance/Calendar use copper interactions and their separate data colors.</p></section>
      <section class="sheet"><span class="meta">Proposed default sheet · surface/controls only</span><div class="sheet-header"><button class="tertiary">Cancel</button><h3>Pay commitment</h3><button class="primary">Confirm</button></div><p>Saved expectations and payment semantics remain source-owned.</p><label>Actual amount paid<input value="43,50" aria-label="Actual amount paid"></label></section>
      <section><h3>Current versus proposed</h3><p class="meta">Same labels, size and content. Current v2 and active legacy defaults are represented from source tokens, not screenshot replacements.</p><div class="compare"><div class="current-v2"><h4>Current v2</h4><label>Description<input value="Client handover" aria-label="Current v2 Description"></label><button>Record payment</button><div class="segments"><button aria-pressed="true">Expense</button><button aria-pressed="false">Income</button></div></div><div><h4>Proposed</h4><label>Description<input value="Client handover" aria-label="Proposed Description"></label><button class="primary">Record payment</button><div class="segments"><button aria-pressed="true">Expense</button><button aria-pressed="false">Income</button></div></div></div><div class="compare"><div class="legacy"><h4>Current legacy default</h4><div class="sheet-header"><button>Cancel</button><strong>Pay commitment</strong><button>Confirm</button></div><p>Actual amount paid</p><input value="43,50" aria-label="Legacy paid amount"></div><div class="sheet"><h4>Proposed default</h4><div class="sheet-header"><button class="tertiary">Cancel</button><h3>Pay commitment</h3><button class="primary">Confirm</button></div><p>Actual amount paid</p><input value="43,50" aria-label="Proposed paid amount"></div></div></section>
      <section><h3>Native tab color mapping</h3><p class="meta">Color keys only; not a replica of iOS/Android chrome. Keep NativeTabs and OS layout/material.</p><div class="tab-keys"><span>Default label/icon</span><span class="tab-selected">Selected label/icon ✓</span></div><p class="meta">canvas / textSecondary / brand / brandSoft</p></section>
    </article>`;
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Axis Soft Copper — Phase 2 specimen</title><style>${fonts}
*{box-sizing:border-box}body{margin:0;background:#f5f0ea;color:#241e1c;font:16px/1.5 Body,system-ui}main{max-width:1440px;margin:auto;padding:24px}h1,h2,h3{font-family:Editorial,Georgia;margin:0}h1{font-size:36px}h2{font-size:30px}h3{font-size:20px}h4{font:16px Strong;margin:0 0 12px}p{margin:8px 0}a{color:#874833}nav{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}.themes{display:grid;grid-template-columns:1fr 1fr;gap:24px}.theme{padding:20px;background:var(--canvas);color:var(--textPrimary);border:1px solid var(--controlBorder);border-radius:16px;min-width:0}.theme section{margin-top:24px}.theme section>h3{margin-bottom:12px}.theme header p,.meta{color:var(--textSecondary)}.meta{font:14px/20px Body}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}button,input,select,textarea{font:16px/24px Body,system-ui;min-width:0;min-height:48px;border-radius:10px}button{font:15px/22px Strong;padding:10px 12px;cursor:pointer;border:1px solid var(--controlBorder);background:var(--control);color:var(--textPrimary)}button.primary{background:var(--brand);color:var(--onBrand);border-color:var(--brand)}button.primary:active,button.primary.pressed{background:var(--brandStrong);border-color:var(--brandStrong)}button.destructive{background:var(--dangerSoft);color:var(--danger);border-color:var(--danger)}button.tertiary{background:transparent;color:var(--brand);border-color:transparent}button.secondary:active,button.tertiary:active{background:var(--controlPressed)}button:disabled,input:disabled{background:var(--inset);color:var(--textDisabled);border-color:var(--border);opacity:1;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.focus-demo{outline:2px solid var(--brandFocus);outline-offset:2px}label{display:grid;gap:8px;margin:16px 0 8px;font:14px/20px Strong}input,select,textarea{width:100%;padding:10px 16px;background:var(--surface);color:var(--textPrimary);border:1px solid var(--controlBorder)}input::placeholder,textarea::placeholder{color:var(--textMuted);opacity:1}textarea{min-height:96px;resize:vertical}input.invalid{border:2px solid var(--danger)}.error{color:var(--danger);font-size:14px}.segments{display:flex;gap:4px;background:var(--control);padding:4px;border-radius:10px;border:1px solid var(--controlBorder)}.segments button{flex:1;min-width:0}.segments button[aria-pressed=true]{background:var(--selected);color:var(--brand);border-color:var(--brand)}.segments button[aria-pressed=true]::after{content:' ✓'}fieldset{border:0;padding:0;margin:16px 0}legend{font:14px Strong;margin-bottom:8px}.summary{padding:16px;background:var(--group);border:1px solid var(--border);border-radius:16px}.money{font:30px/38px Editorial;display:block;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.metrics{display:flex;gap:16px;border-top:1px solid var(--border);margin-top:16px;padding-top:12px}.metrics>div{flex:1;min-width:0}.metrics b,.metrics span{display:block;overflow-wrap:anywhere}.positive{color:var(--success)}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.chips span{padding:4px 8px;border-radius:8px;font:12px/18px Strong}.positive-chip{background:var(--successSoft);color:var(--success)}.warning-chip{background:var(--attentionSoft);color:var(--attention)}.error-chip{background:var(--dangerSoft);color:var(--danger)}.info-chip{background:var(--infoSoft);color:var(--info)}.neutral-chip{background:var(--control);color:var(--textSecondary)}.list-row{display:flex;gap:12px;align-items:center;padding:12px;background:var(--group);border:1px solid var(--border);border-radius:16px}.list-row>div{flex:1;min-width:0}.list-row span{display:block}.icon{width:48px;flex-shrink:0}.feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.sheet{background:var(--overlay);border:1px solid var(--border);border-radius:20px;padding:16px}.sheet-header{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sheet-header h3,.sheet-header strong{flex:1;min-width:90px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.compare>div{min-width:0}.compare button{width:100%;margin:8px 0}.compare .segments button{margin:0}.current-v2{--brand:#7B425E;--brandStrong:#68344E;--selected:#F1E1E8;--controlBorder:#E4DAD4;--onBrand:#FFF9FB}.current-v2>button{background:var(--brandStrong);color:var(--onBrand);border-color:var(--brandStrong)}[data-theme=dark] .current-v2{--brand:#DFA6BF;--brandStrong:#EDBAD0;--selected:#3C2B35;--controlBorder:#3A3337;--onBrand:#2A1720}.legacy{padding:16px;background:#FFFFFF;color:#17211D;border-radius:12px}.legacy input,.legacy button{font-family:system-ui;background:#F1F3F1;color:#17211D;border-color:#CBD3CE}.legacy button:last-child{background:#28634F;color:#FFFFFF}[data-theme=dark] .legacy{background:#28312D;color:#EDF3EF}[data-theme=dark] .legacy input,[data-theme=dark] .legacy button{background:#1D2421;color:#EDF3EF;border-color:#48594F}[data-theme=dark] .legacy button:last-child{background:#9DCAB6;color:#12231B}.tab-keys{display:flex;gap:16px;flex-wrap:wrap;color:var(--textSecondary)}.tab-selected{color:var(--brand);background:var(--brandSoft);padding:4px 8px;border-radius:8px}.hidden{display:none!important}@media(max-width:1050px){.themes{grid-template-columns:1fr}}@media(max-width:450px){main{padding:12px}.theme{padding:16px}.compare{grid-template-columns:1fr}.feature-grid{grid-template-columns:1fr 1fr}.actions{grid-template-columns:1fr}.list-row{flex-wrap:wrap}.list-row>div{flex-basis:40%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}</style></head><body><main><h1>Axis · Soft Copper</h1><p>Phase 2 specification. Primary direction approved; additional roles/mappings are explicitly proposed. Runtime app unchanged.</p><nav><a href="index.html">Review index</a><a href="../soft-copper-specification.md">Specification</a><a href="../soft-copper-migration-plan.md">Migration plan</a><a href="token-register.md">Exact token register</a></nav><div class="themes">${panel('dark')}${panel('light')}</div><p>Browser-only component specimens. Native tabs, system alerts, focus, keyboard and OS text scaling require native evidence.</p></main><script>document.querySelectorAll('.segments').forEach(s=>s.querySelectorAll('button').forEach(b=>b.onclick=()=>s.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))));const t=new URLSearchParams(location.search).get('theme');if(t)document.querySelectorAll('.theme').forEach(e=>e.classList.toggle('hidden',e.dataset.theme!==t));</script></body></html>`;
  fs.writeFileSync(path.join(output, 'specimen.html'), html);
}
async function review() {
  const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
  const { pathToFileURL } = require('node:url');
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const checks = [];
  try {
    for (const theme of ['dark', 'light']) for (const width of [320, 390, 430, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: 'reduce' }); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(output, 'specimen.html')).href + `?theme=${theme}`); await page.evaluate(() => document.fonts.ready);
      const plate = page.locator('.theme:not(.hidden)'); assert.equal(await plate.count(), 1);
      const selected = plate.locator('.segments').first().locator('button').last(); await selected.click(); assert.equal(await selected.getAttribute('aria-pressed'), 'true');
      await plate.locator('.segments').first().locator('button').first().click();
      const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, minimumButton: Math.min(...[...document.querySelectorAll('.theme:not(.hidden) button')].map(e => e.getBoundingClientRect().height)) }));
      assert.equal(geometry.overflow, false); assert.ok(geometry.minimumButton >= 48); assert.equal(errors.length, 0);
      await page.evaluate(() => window.scrollTo(0, 0)); const file = `specimen-${theme}-${width}.png`; await page.screenshot({ path: path.join(output, file), fullPage: true });
      if (width === 1440) {
        const comparison = plate.locator('section').filter({ has: page.getByRole('heading', { name: 'Current versus proposed', exact: true }) });
        await comparison.screenshot({ path: path.join(output, `comparison-${theme}.png`) });
        const fields = plate.locator('section').filter({ has: page.getByRole('heading', { name: 'Fields and selection', exact: true }) });
        await fields.screenshot({ path: path.join(output, `fields-${theme}.png`) });
      }
      checks.push({ theme, width, file, geometry, errors, scope: 'Static HTML proposal; no native chrome, OS scaling or app runtime.' }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'specimen-validation.json'), JSON.stringify({ checks }, null, 2));
  console.log(`${checks.length} specimen render/interaction/target/reflow checks passed`);
}
function writeTraceability() {
  // Each row augments its exact original register entry. No IDs, titles, evidence or priorities replaced.
  const plan = [
    ['01', '3D-T', 'VU-04,VU-05,VU-08,VU-10,VU-13', 'TaskEditor, TasksScreen, TaskButton/TaskField wrappers', 'Explicitly opt ordinary existing Task Edit into complete v2 presentation after primitives; use copper actions and neutral form boundaries.', 'High', 'Create/edit drafts, dates, recurrence picker/back, save/cancel, and unsaved state unchanged; dark/light/narrow/large edit matches New Task grammar.', 'No additional design decision; implementation authorization still needed'],
    ['02', '3D-F', 'VU-04,VU-05,VU-08,VU-11,VU-13', 'fitness-forms.tsx, FitnessScreen, AutocompleteField, DurationFields, DistanceFields', 'Migrate set/note/active-workout Add Exercise and inline create to v2; propagate appearance through every measurement input. Keep RoutineExercisePicker separate.', 'High', 'All strength/bodyweight/duration/distance inputs remain optional as before; set completion, create/select return focus, delete and notes preserve behavior.', 'Emerald identity mapping recommended; approve with VU-11'],
    ['03', '3D-M', 'VU-04,VU-05,VU-08', 'TransactionDetail, FinanceScreen linked dialog', 'Neutral editorial sheet, copper Open source/Edit details; semantic signed amount and constrained linked-source actions unchanged.', 'High', 'Work and Commitment receipts open their real source; no unrestricted manual payment edit; linked deletion/undo semantics retained.', 'No additional design decision; implementation authorization still needed'],
    ['04', '3B-I', 'VU-08,VU-09', 'FormField, FormSelect, AutocompleteField, selection triggers, amount/search fields', 'Use controlBorder for resting boundary, brandFocus for focus, danger for invalid; keep border for decoration. No blanket bright outlines.', 'Medium', '>=3:1 required boundary against both adjacent surfaces; >=4.5 text/placeholder; focus + error simultaneously visible; read-only/disabled distinct.', 'Specification approval for stronger neutral boundaries'],
    ['05', '3B-S', 'VU-08,VU-10,VU-13', 'AdaptiveSheet, BackButton, SheetRefreshNotice, WorkSheet, MonthChooser', 'Complete appearance propagation to default title/Cancel/Back/Save and sheet radius; custom headers and existing measurement/focus owner retained.', 'High', 'V2 defaults have Lora title and v2 controls; legacy appearance unchanged until explicit migration; keyboard, max-height, header measurement and dismissal unchanged.', 'No new routing or sheet interaction approval needed'],
    ['06', '3D-M', 'VU-05,VU-08,VU-10,VU-13', 'CommitmentsView manage header/seriesRow/ContextMenu', 'Targeted contained management rows using shared identity/status roles; keep all series state/actions and ordering.', 'Medium', 'Active/paused/ended/completed distinctions and history entry/action availability preserved; no list/domain rewrite.', 'No additional design decision'],
    ['07', '3B-S + 3D-T + 3C', 'VU-05,VU-08,VU-10', 'TaskActions, OccurrenceHistory, SheetRefreshNotice, screen errors, SourceScreen fallback', 'Shared notice receives resolved appearance; explicit v2 task action/history callers and readable fallback shells. Existing v2 archives remain.', 'Medium', 'One refresh notice, retained snapshot, correct retry and alert/focus behavior; global Task/Work History not rebuilt.', 'No additional design decision'],
    ['08', '3A', '', 'design-system-v2.ts, useDesignColors, overviewColors, status/feature adapters', 'Extend the existing palette with semantic and feature roles/aliases; income distinct from expense/error; outstanding and pending neutral.', 'High', 'No literals outside canonical/adapters for approved roles; money/status outputs unchanged; exact token pairs pass; no second provider/system.', 'Approve new soft status fills and explicit mappings as part of this specification'],
    ['09', '3A', '', 'overview-presentation.ts, taskSectionSurface, useDesignColors callers', 'Use explicit light/dark mode or resolved palette field rather than canvas HEX equality.', 'Medium', 'Changing canvas in a test fixture cannot select wrong theme; existing chart grouping and Task surfaces unchanged before mapping.', 'No design decision'],
    ['10', '3A + 3B-S', '', 'DesignTypography, UiText, compact editor/row title overrides', 'Named editorial, operational and compact roles; Lora display, Manrope data; preserve approved dense measurements.', 'Medium', 'Sizes/line heights follow spec with native font scaling; money stays tabular/readable; header growth measured, no global serif conversion.', 'Approve named compact exceptions; no font change'],
    ['11', '3C', 'VU-08,VU-09', 'Home artwork, Calendar appearance, Work/Fitness/Journal adapters, InternalNavigation', 'Copper shared selection/actions; retain Home art, task indigo/source markers, green Work and Journal identity; propose emerald Fitness identity.', 'Medium–high', 'Status meaning never derived from feature hue; card artwork unchanged; Finance/Calendar interaction copper; source markers unchanged.', 'Approve Fitness emerald across destination identity; keep quiet green Journal as recommended default'],
    ['12', '3C-N', 'VU-08,VU-09,VU-05', 'app/_layout.tsx, app-tabs.tsx, DatabaseProvider shell', 'Map native/root backdrop and tint to existing resolved copper palette without changing routes, tab triggers or safe areas.', 'High', 'No native transition seam in both themes; five tabs and original inset ownership/stack presentation preserved; actual device evidence required.', 'No new navigation approval; native acceptance mandatory'],
    ['13', '3B-I + 3B-S', 'VU-08', 'UiButton, BackButton, ContextMenu, FormChoice, AdaptiveSheet styles', '48 minimum targets, 10 control radius/20 sheet radius for v2; full hit areas around small glyphs; min rather than fixed text height.', 'Medium', '>=48 native hit regions without overlap; large text grows naturally; visible density retained; menu estimates use resolved target size.', 'No additional design decision beyond specification approval'],
    ['14', '4 (investigate from each batch)', 'VU-04,VU-05,VU-10,VU-13', 'Home/Finance/Client/Calendar/Routine/Journal responsive presentation only', 'Reproduce suspected browser proxy issues with OS scaling before fixing; preserve intentional wrapping, stacking and horizontal internal navigation.', 'High if guessed', '320/390/430 normal/doubled and real OS large text usable; complete money text and last control reachable; no artificial Home reservation or focus-scroll regression.', 'No speculative layout approval request; fix only evidence-backed defects'],
    ['15', '4 profile gate', '', 'Journal history presentation, per-task OccurrenceHistory', 'Profile representative long archives; only then propose a separate virtualization change if needed.', 'Medium', 'Measured dataset/device/frame/memory evidence; paging/focus/scroll state preserved; no automatic virtualization rewrite in theme migration.', 'Only required if profiling justifies a separate behavior/performance scope'],
    ['16', '3C-N + 3E asset gate', 'VU-12', 'DatabaseProvider startup, app.json splash/adaptive/iOS icon config', 'Align startup UI neutrals first. Separate approved-star icon pipeline once actual selected source exists; do not edit startup lifecycle.', 'Medium', 'No data reset/retry regression; app startup/splash in both themes; app icon reviewed on native platforms, Expo placeholders explicitly replaced only later.', 'Approved artwork/source required; native launch visual review'],
    ['17', '4', 'All implementation batches', 'Native verification matrix and affected paths', 'Collect real iPhone/Android evidence for tabs/back/sheets/pickers/IME/scaling/screen readers/Reduced Motion/performance.', 'High if omitted', 'Functional suites, native screenshots, action/focus acceptance and exports documented; browser evidence never substituted for hardware acceptance.', 'Device testing/access coordination, not a new design decision'],
    ['18', '3B specs + 4 polish', 'VU-13', 'UiIcon consumers, EditorSection tiles, native tab symbols', 'Document inline16/support20/control24 and tile36/48 roles; retain justified type-specific sizes and glyph vocabulary.', 'Low', 'No unrelated glyph replacement; OS tab symbols unchanged; visual glyph size decoupled from48 hit target.', 'No new icon-system approval'],
    ['19', '3B-S + 3C + 4 polish', 'VU-07,VU-10', 'FormError/StatusText, feature inline/contained/blocking feedback', 'Shared feedback role/state/spacing contracts; preserve feature composition, wording and source retry.', 'Low–medium', 'Empty/loading/error distinguishable, live alerts not duplicated, action names clear; no identical generic card wrapper everywhere.', 'No additional design decision'],
    ['20', '3A-doc + final handoff', '', 'PRODUCT.md, future approved design reference, existing design-system docs', 'Update only separately scoped context docs to SDK58 and approved role architecture after spec approval; preserve original audit evidence.', 'Low', 'Current product context accurate; approved/proposed distinction explicit; no historical evidence overwritten.', 'Approval of this specification precedes authoritative context updates'],
  ];
  const original = fs.readFileSync('docs/design-system/inconsistency-register.md', 'utf8').split(/\r?\n/).filter(line => /^\| VU-\d\d /.test(line));
  assert.equal(original.length, 20); assert.equal(plan.length, 20);
  const mappings = original.map((line, i) => {
    const cells = line.split('|').map(c => c.trim()), p = plan[i], id = `VU-${p[0]}`;
    assert.ok(cells[1].startsWith(id));
    return { id, originalTitle: cells[2], originalPriority: cells[1].match(/P\d/)[0], originalRow: line,
      originalCurrent: cells[3], originalConvention: cells[4], originalEvidence: cells[5], originalRecommendation: cells[6], originalScope: cells[7], originalRisk: cells[8],
      batch: p[1], dependencies: p[2] ? p[2].split(',') : [], affectedComponents: p[3], resolution: p[4], risk: p[5], acceptance: p[6], approval: p[7] };
  });
  fs.writeFileSync(path.join(output, 'traceability.json'), JSON.stringify({ source: '../inconsistency-register.md', reclassifications: [], mappings }, null, 2));
  const table = '| ID | Original title | Priority | Components | Resolution | Batch / dependencies | Acceptance / approval |\n|---|---|---|---|---|---|---|\n' + mappings.map(m => `| ${m.id} | ${m.originalTitle} | ${m.originalPriority} | ${m.affectedComponents} | ${m.resolution} | ${m.batch}; ${m.dependencies.join(', ') || 'none'} | ${m.acceptance} Approval: ${m.approval} |`).join('\n');
  const details = mappings.map(m => `\n## ${m.id} — ${m.originalTitle} (${m.originalPriority})\n\n**Original description:** ${m.originalCurrent}\n\n**Original convention:** ${m.originalConvention}\n\n**Original evidence:** ${m.originalEvidence}\n\n**Original affected scope:** ${m.originalScope}. Original risk: ${m.originalRisk}\n\n**Phase 2 resolution:** ${m.resolution}\n\n**Dependencies / batch:** ${m.dependencies.join(', ') || 'none'} / ${m.batch}. **Risk:** ${m.risk}.\n\n**Acceptance:** ${m.acceptance}\n\n**Approval:** ${m.approval}\n`).join('');
  fs.writeFileSync(path.resolve('docs/design-system/soft-copper-traceability.md'), '# Phase 2 traceability — the original 20 findings\n\nNo IDs, titles, priorities or evidence reclassified. Original descriptions/evidence below are preserved from the Phase 1 register. This is its resolution map, not an alternative register. See [migration plan](soft-copper-migration-plan.md) for exact files, tokens, tests and batch gates; [tokens](soft-copper/token-register.md) for bindings.\n\n' + table + '\n' + details);
}
function verify() {
  const baseline = JSON.parse(fs.readFileSync(path.join(output, 'preservation-baseline.json'), 'utf8'));
  const changed = baseline.files.filter(r => !fs.existsSync(r.file) || crypto.createHash('sha256').update(fs.readFileSync(r.file)).digest('hex') !== r.sha256);
  assert.deepEqual(changed, [], 'Pre-existing source/assets/Phase 1 evidence changed');
  const failures = contrast.filter(r => r.required && !r.passes); assert.deepEqual(failures, [], 'Required contrast pair failed');
  assert.equal(rows.find(r => r.name === 'brand').dark, '#E7AA8B'); assert.equal(rows.find(r => r.name === 'brand').light, '#874833');
  assert.equal(new Set(rows.map(r => r.name)).size, rows.length);
  for (const row of rows) {
    assert.match(row.light, /^#[\dA-F]{6}([\dA-F]{2})?$/i); assert.match(row.dark, /^#[\dA-F]{6}([\dA-F]{2})?$/i);
    if (row.aliasOf) for (const theme of ['light', 'dark']) assert.equal(row[theme], rows.find(r => r.name === row.aliasOf)[theme]);
  }
  const mapping = JSON.parse(fs.readFileSync(path.join(output, 'traceability.json'), 'utf8'));
  const original = fs.readFileSync('docs/design-system/inconsistency-register.md', 'utf8');
  assert.equal(mapping.mappings.length, 20); assert.deepEqual(mapping.reclassifications, []);
  for (const issue of mapping.mappings) assert.ok(original.split(/\r?\n/).includes(issue.originalRow), issue.id);
  const linkFailures = [], checkedLinks = [];
  for (const file of ['soft-copper-specification.md', 'soft-copper-migration-plan.md', 'soft-copper-traceability.md'].map(f => path.resolve('docs/design-system', f)).concat(fs.readdirSync(output).filter(f => /\.(md|html)$/.test(f)).map(f => path.join(output, f)))) {
    const text = fs.readFileSync(file, 'utf8'), matches = file.endsWith('.md') ? text.matchAll(/\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g) : text.matchAll(/(?:href|src)="([^"]+)"/g);
    for (const match of matches) {
      const target = match[1].replace(/^<|>$/g, '').split(/[?#]/)[0]; if (!target || /^(data:|https?:)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), decodeURI(target)); const exists = resolved === path.join(output, 'validation.json') || fs.existsSync(resolved);
      checkedLinks.push({ file: path.relative(process.cwd(), file), target, exists }); if (!exists) linkFailures.push({ file, target });
    }
  }
  assert.deepEqual(linkFailures, [], 'Missing review link target');
  const reviews = JSON.parse(fs.readFileSync(path.join(output, 'specimen-validation.json'), 'utf8'));
  assert.equal(reviews.checks.length, 8); for (const r of reviews.checks) { assert.equal(r.errors.length, 0); assert.equal(r.geometry.overflow, false); assert.ok(r.geometry.minimumButton >= 48); assert.ok(fs.existsSync(path.join(output, r.file))); }
  const assetFiles = baseline.files.filter(r => r.file.startsWith('assets/'));
  const evidence = { sourceHead: baseline.head, initialFilesUnchanged: baseline.files.length, assetsUnchanged: assetFiles.length, phase1EvidenceAndSupportPreserved: true,
    requiredContrastPairs: contrast.filter(r => r.required).length, requiredContrastFailures: failures.length, tokens: rows.length, originalIssuesPreserved: mapping.mappings.length, reclassifications: 0,
    checkedLocalLinks: checkedLinks.length, specimenCases: reviews.checks.length, nativeAcceptance: false, scope: 'Specification-only review and preservation; no app migration/export acceptance.' };
  fs.writeFileSync(path.join(output, 'validation.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}
if (process.argv.includes('--generate')) generate();
if (process.argv.includes('--review')) review().catch(error => { console.error(error); process.exitCode = 1; });
if (process.argv.includes('--verify')) verify();
