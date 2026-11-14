/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { DesignColors, Shape } from '../src/constants/design-system-v2';
import { mount } from './helpers/refresh-lifecycle';
const require = createRequire(import.meta.url);
const { AdaptiveSheet, AdaptiveModal } = require('../src/components/adaptive-sheet') as typeof import('../src/components/adaptive-sheet');
const { FormSelectionHost, SelectionOverlay } = require('../src/components/form-selection-host') as typeof import('../src/components/form-selection-host');
const { DesignProvider, UiText } = require('../src/components/design-system') as typeof import('../src/components/design-system');
const { TaskEditor } = require('../src/features/tasks/components/task-editor') as typeof import('../src/features/tasks/components/task-editor');
const native = require('./helpers/lifecycle-native.cjs').native as {
  useColorScheme: () => string | null; useWindowDimensions: () => { width: number; height: number; scale: number; fontScale: number };
  Platform: { OS: string };
};
const flat = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));
type App = Awaited<ReturnType<typeof mount>>;
function title(app: App, value: string) { return app.nodes().find(node => node.kind === 'ThemedText' && node.textContent === value)!; }
function wrap(child: ReactNode) { return createElement(DesignProvider, null, createElement(FormSelectionHost, null, child)); }

for (const mode of ['dark','light'] as const) {
  test(`${mode}: explicit v2 default headers use editorial or operational roles and delegate original actions`, async t => {
    t.mock.method(native,'useColorScheme',()=>mode); let dismissed=0,confirmed=0;
    const app=await mount(wrap(createElement(AdaptiveSheet,{appearance:'v2',title:'New reflection',action:'Save',onDismiss:()=>dismissed++,onConfirm:()=>confirmed++})),null);t.after(app.unmount);
    assert.equal(flat(title(app,'New reflection').props.style).fontFamily,'AxisLora-SemiBold');
    assert.equal(flat(title(app,'New reflection').props.style).fontSize,26);assert.equal(flat(title(app,'New reflection').props.style).lineHeight,34);
    assert.equal(app.find('FormButton','Cancel').props.appearance,'v2');assert.equal(app.find('FormButton','Save').props.appearance,'v2');
    await app.press('Cancel');await app.press('Save');assert.equal(dismissed,1);assert.equal(confirmed,1);
    const sheet=app.nodes().find(node=>node.kind==='View'&&flat(node.props.style).borderTopLeftRadius===Shape.sheet)!;
    assert.equal(flat(sheet.props.style).backgroundColor,DesignColors[mode].canvas);assert.equal(flat(sheet.props.style).borderColor,DesignColors[mode].border);
    const operational=await mount(wrap(createElement(AdaptiveSheet,{appearance:'v2',titleRole:'operational',title:'Client history',onDismiss:()=>dismissed++})),null);t.after(operational.unmount);
    assert.equal(flat(title(operational,'Client history').props.style).fontFamily,'AxisManrope-SemiBold');assert.equal(flat(title(operational,'Client history').props.style).fontSize,18);
    const back=operational.find('FormButton','Back');assert.equal(back.props.appearance,'v2');assert.equal(back.props.icon,'back');await operational.press('Back');assert.equal(dismissed,2);
  });
  test(`${mode}: undefined appearance retains legacy header controls, title and radius`, async t=>{
    t.mock.method(native,'useColorScheme',()=>mode);
    const app=await mount(wrap(createElement(AdaptiveSheet,{title:'Legacy details',titleRole:'editorial',action:'Save',onDismiss(){},onConfirm(){}})),null);t.after(app.unmount);
    assert.equal(flat(title(app,'Legacy details').props.style).fontFamily,undefined);assert.equal(title(app,'Legacy details').props.type,'sheetTitle');
    assert.equal(app.find('FormButton','Cancel').props.appearance,undefined);assert.equal(app.find('FormButton','Save').props.appearance,undefined);
    assert.ok(app.nodes().some(node=>node.kind==='View'&&flat(node.props.style).borderTopLeftRadius===12));
    assert.ok(!app.nodes().some(node=>node.kind==='View'&&flat(node.props.style).borderTopLeftRadius===20));
  });
  test(`${mode}: custom headers retain their own typography and content without default actions`,async t=>{
    t.mock.method(native,'useColorScheme',()=>mode);
    const custom=createElement(UiText,{type:'editorTitle',style:{fontSize:22,lineHeight:30}},'Owned compact header');
    const app=await mount(wrap(createElement(AdaptiveSheet,{appearance:'v2',title:'Ignored default',titleRole:'operational',action:'Save',onConfirm(){},header:custom})),null);t.after(app.unmount);
    const heading=title(app,'Owned compact header');assert.equal(flat(heading.props.style).fontSize,22);assert.equal(flat(heading.props.style).fontFamily,'AxisLora-SemiBold');
    assert.ok(!title(app,'Ignored default'));assert.ok(!app.nodes().some(node=>node.kind==='FormButton'&&node.props.label==='Save'));
  });
  test(`${mode}: selection headings and raised surfaces change without replacing layout, dialog or close callbacks`,async t=>{
    t.mock.method(native,'useColorScheme',()=>mode);let closed=0,height=0;
    const props={appearance:'v2' as const,label:'Category',content:createElement(UiText,null,'Personal'),inline:null,layout:{left:16,top:100,width:320,height:240,placement:'below'},onClose:()=>closed++,onHeadingHeight:(value:number)=>height=value,onOptionsHeight() {}};
    const app=await mount(createElement(DesignProvider,null,createElement(SelectionOverlay,props)),null);t.after(app.unmount);
    const panel=app.nodes().find(node=>node.kind==='View'&&flat(node.props.style).left===16)!;
    assert.equal(flat(panel.props.style).backgroundColor,DesignColors[mode].surfaceRaised);assert.equal(flat(panel.props.style).borderColor,DesignColors[mode].controlBorder);
    assert.equal(flat(panel.props.style).height,240);assert.equal(flat(title(app,'Category').props.style).fontFamily,'AxisManrope-SemiBold');
    const heading=app.nodes().find(node=>node.props?.accessibilityLabel==='Category choices'&&node.props.accessibilityRole==='header')!;
    assert.equal(flat(heading.props.style).borderBottomWidth,1);await act(()=>(heading.props.onLayout as (event:object)=>void)({nativeEvent:{layout:{height:65}}}));assert.equal(height,65);
    assert.equal(app.nodes().filter(node=>node.props?.role==='dialog').length,1);await app.tapSet('Close category choices');assert.equal(closed,1);
    const action=await mount(createElement(SelectionOverlay,{...props,presentation:'actions'}),null);t.after(action.unmount);
    assert.equal(flat(action.nodes().find(node=>node.kind==='View'&&flat(node.props.style).left===16)!.props.style).backgroundColor,DesignColors[mode].surfaceRaised);
    assert.ok(!title(action,'Category'));
  });
  for(const width of [320,390,430])for(const fontScale of [1,2])test(`${mode}: ${width}/${fontScale} default header grows naturally and keeps the action row bounded`,async t=>{
    t.mock.method(native,'useColorScheme',()=>mode);t.mock.method(native,'useWindowDimensions',()=>({width,height:844,scale:1,fontScale}));
    const app=await mount(wrap(createElement(AdaptiveSheet,{appearance:'v2',title:'A long localized editorial title',action:'Confirmar pagamento',onConfirm(){},onDismiss(){}})),null);t.after(app.unmount);
    const stacked=width<360||fontScale>=1.5;
    const header=app.nodes().find(node=>node.kind==='View'&&flat(node.props.style).paddingHorizontal===16&&flat(node.props.style).paddingVertical===12)!;
    assert.ok(header);assert.equal(flat(header.props.style).flexDirection,stacked?'column':'row');if(stacked)assert.equal(flat(header.props.style).flexWrap,'nowrap');
    assert.equal(flat(header.props.style).height,undefined);assert.equal(title(app,'A long localized editorial title').props.numberOfLines,undefined);
    assert.equal(app.find('FormButton','Confirmar pagamento').props.appearance,'v2');
  });
}

test('Task native picker headers inherit only the existing editor appearance; ordinary legacy edit remains legacy',async t=>{
  const original=native.Platform.OS;native.Platform.OS='ios';t.after(()=>{native.Platform.OS=original;});
  for(const appearance of ['v2',undefined] as const){
    const task=appearance?null:{id:'legacy-task',title:'Existing task',description:null,date:'2026-11-13',time:null,priority:'none' as const,categoryId:null,completedAt:null,createdAt:1,updatedAt:1,deletedAt:null};
    const app=await mount(createElement(TaskEditor,{task,recurrence:null,categories:[],appearance,onDismiss(){},onSave(){},onCreateCategory(){throw Error('Not invoked');}}),null);
    try{await act(()=>(app.find('FormSelect','Date').props.onPress as ()=>void)());const back=app.find('FormButton','Back from date picker');assert.equal(back.props.appearance,appearance);await app.press('Back from date picker');assert.ok(!app.nodes().some(n=>n.props?.accessibilityLabel==='Back from date picker'));}finally{await app.unmount();}
  }
});

test('native modal request-close retains existing parent dismissal ownership',async t=>{
  let dismissed=0;const app=await mount(createElement(AdaptiveModal as ComponentType<{onDismiss:()=>void;children?:ReactNode}>,{onDismiss:()=>dismissed++},createElement(UiText,null,'Owned body')),null);t.after(app.unmount);
  const modal=app.find('Modal');assert.equal(modal.props.presentationStyle,'overFullScreen');assert.equal(modal.props.transparent,true);
  await act(()=>(modal.props.onRequestClose as ()=>void)());assert.equal(dismissed,1);
});
