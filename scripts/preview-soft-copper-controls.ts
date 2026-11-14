/** Actual shared controls; browser substitutes only native font/image/navigation boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('dist/soft-copper-controls-preview');
mkdirSync(output, { recursive: true });
const native = resolve('dist/transactions-v22-preview/native.jsx');
const entry = resolve(output, 'entry.jsx');
writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{View}from'react-native';
import{DesignProvider,UiText,UiButton,useDesignColors}from'../../src/components/design-system';
import{FormButton}from'../../src/components/form-controls';import{FloatingAddButton}from'../../src/components/floating-add-button';
function App(){const c=useDesignColors();return <DesignProvider><View style={{padding:16,gap:12,flex:1,backgroundColor:c.canvas}}>
<UiText type="editorTitle">Shared actions</UiText><UiButton label="Shared primary" variant="primary" onPress={()=>{}}/>
<FormButton appearance="v2" label="V2 form primary" variant="primary" onPress={()=>{}}/>
<UiButton label="Fitness shared primary" variant="primary" feature="fitness" onPress={()=>{}}/>
<UiButton label="Disabled primary" variant="primary" disabled onPress={()=>{}}/>
<UiButton label="Busy primary" variant="primary" busy onPress={()=>{}}/>
<UiButton label="Secondary action" variant="secondary" onPress={()=>{}}/>
<UiButton label="Selected destination" variant="navigation" selected onPress={()=>{}}/>
<View style={{position:'relative',height:88}}><FloatingAddButton label="Create transaction" onPress={()=>{}}/></View>
</View></DesignProvider>}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']]
    .map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')})}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script></html>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
