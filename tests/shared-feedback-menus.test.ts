/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act, createElement, useState, type ComponentType, type ReactNode } from 'react';
import { DesignColors } from '../src/constants/design-system-v2';
import { mount } from './helpers/refresh-lifecycle';
const require=createRequire(import.meta.url);
const {StatusText}=require('../src/components/status-text') as typeof import('../src/components/status-text');
const {SheetRefreshContext}=require('../src/components/sheet-refresh-notice') as typeof import('../src/components/sheet-refresh-notice');
const {AdaptiveModal,AdaptiveSheet}=require('../src/components/adaptive-sheet') as typeof import('../src/components/adaptive-sheet');
const {ContextMenu,ContextMenuHost}=require('../src/components/context-menu') as typeof import('../src/components/context-menu');
const {DesignProvider,UiButton}=require('../src/components/design-system') as typeof import('../src/components/design-system');
const {FormField}=require('../src/components/form-controls') as typeof import('../src/components/form-controls');
const native=require('./helpers/lifecycle-native.cjs').native as {useColorScheme:()=>string|null};
const flat=(style:unknown):Record<string,unknown>=>Object.assign({},...[style].flat(Infinity));
const settle=async()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
const modal=AdaptiveModal as ComponentType<{children?:ReactNode;onDismiss:()=>void}>;
const tones={neutral:'textSecondary',attention:'attention',success:'success',subdued:'textMuted',danger:'danger',info:'info'} as const;

for(const mode of ['dark','light'] as const){
 for(const tone of Object.keys(tones) as (keyof typeof tones)[])test(`${mode}: v2 ${tone} feedback preserves wording, semantic role and caller announcements`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);
  const app=await mount(createElement(DesignProvider,null,createElement(StatusText,{appearance:'v2',tone,type:'metadata',accessibilityRole:'alert',accessibilityLiveRegion:'polite',nativeID:'source-status'},'Source-owned message')),null);t.after(app.unmount);
  const text=app.nodes().find(n=>n.kind==='ThemedText'&&n.textContent==='Source-owned message')!;
  assert.equal(flat(text.props.style).color,DesignColors[mode][tones[tone]]);assert.equal(flat(text.props.style).fontFamily,'AxisManrope-Regular');assert.equal(flat(text.props.style).fontSize,14);
  assert.equal(text.props.accessibilityRole,'alert');assert.equal(text.props.accessibilityLiveRegion,'polite');assert.equal(text.props.nativeID,'source-status');
 });
 test(`${mode}: legacy status appearance remains explicit even under a design provider`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);const app=await mount(createElement(DesignProvider,null,createElement(StatusText,{tone:'attention',type:'metadata'},'Legacy warning')),null);t.after(app.unmount);
  const text=app.nodes().find(n=>n.kind==='ThemedText'&&n.textContent==='Legacy warning')!;assert.equal(text.props.themeColor,'warning');assert.equal(text.props.type,'metadata');assert.equal(flat(text.props.style).fontFamily,undefined);
 });
 test(`${mode}: one refresh notice inherits sheet appearance, clears with source error and retains a changed draft`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);let retries=0;
  function Probe(){const[error,setError]=useState<string|null>('Original refresh failure'),[draft,setDraft]=useState('Saved draft');return createElement(DesignProvider,null,
   createElement(SheetRefreshContext.Provider,{value:{error,onRetry:()=>{retries++;setError(null);}}},createElement(modal,{onDismiss(){}},
    createElement(AdaptiveSheet,{appearance:'v2',title:'Edit source'},createElement(FormField,{appearance:'v2',label:'Draft',value:draft,onChangeText:setDraft})))));}
  const app=await mount(createElement(Probe),null);t.after(app.unmount);
  const errors=app.nodes().filter(n=>n.kind==='FormError'&&n.props.message==='Original refresh failure');assert.equal(errors.length,1);assert.equal(errors[0].props.appearance,'v2');
  assert.equal(app.nodes().filter(n=>n.kind==='FormButton'&&n.props.label==='Retry refresh').length,1);assert.equal(app.find('FormButton','Retry refresh').props.appearance,'v2');
  await act(()=>(app.find('TextInput','Draft').props.onChangeText as (value:string)=>void)('Unsaved protected draft'));await app.press('Retry refresh');assert.equal(retries,1);assert.equal(app.find('TextInput','Draft').props.value,'Unsaved protected draft');
  assert.ok(!app.nodes().some(n=>n.kind==='FormButton'&&n.props.label==='Retry refresh'));assert.ok(!app.nodes().some(n=>n.kind==='FormError'&&n.props.message==='Original refresh failure'));
 });
 test(`${mode}: v2 context actions preserve order, disabled/destructive semantics and dismiss-before-callback`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);let selected='',open=0;
  const actions=[{label:'Edit',onPress:()=>{selected='Edit';}},{label:'Unavailable',disabled:true,onPress:()=>{selected='Unavailable';}},{label:'Delete',variant:'destructive' as const,onPress:()=>{selected='Delete';}}];
  const app=await mount(createElement(ContextMenuHost,null,createElement(ContextMenu,{appearance:'v2',label:'Record options',actions,onOpen:()=>open++})),null);t.after(app.unmount);
  await app.press('Record options');await settle();assert.equal(open,1);assert.equal(app.nodes().filter(n=>n.props?.role==='dialog').length,1);
  const rows=app.nodes().filter(n=>n.kind==='FormButton'&&['Edit','Unavailable','Delete'].includes(String(n.props.label)));assert.deepEqual(rows.map(n=>n.props.label),['Edit','Unavailable','Delete']);
  for(const row of rows){assert.equal(row.props.appearance,'v2');assert.equal(row.props.tone,'neutral');assert.equal(row.props.selected,undefined);}
  assert.equal(app.find('FormButton','Unavailable').props.disabled,true);assert.equal(app.find('FormButton','Delete').props.variant,'destructive');
  await app.press('Delete');assert.ok(!app.nodes().some(n=>n.props?.role==='dialog'));assert.equal(app.find('FormButton','Record options').props.expanded,false);await settle();assert.equal(selected,'Delete');
 });
 test(`${mode}: legacy context-menu descendants are not opted into v2`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);const app=await mount(createElement(ContextMenuHost,null,createElement(ContextMenu,{label:'Legacy options',actions:[{label:'Legacy action',onPress(){}}]})),null);t.after(app.unmount);
  await app.press('Legacy options');const row=app.find('FormButton','Legacy action');assert.equal(row.props.appearance,undefined);assert.equal(row.props.tone,undefined);assert.equal(row.props.variant,'quiet');
 });
 test(`${mode}: neutral menu text is an opt-in and does not change copper quiet buttons or danger semantics`,async t=>{
  t.mock.method(native,'useColorScheme',()=>mode);const app=await mount(createElement(DesignProvider,null,
   createElement(UiButton,{label:'Menu action',variant:'quiet',tone:'neutral',onPress(){}}),createElement(UiButton,{label:'Cancel',variant:'quiet',onPress(){}}),createElement(UiButton,{label:'Destructive',variant:'destructive',tone:'neutral',onPress(){}})),null);t.after(app.unmount);
  const text=(label:string)=>app.nodes().find(n=>n.kind==='ThemedText'&&n.textContent===label)!;
  assert.equal(flat(text('Menu action').props.style).color,DesignColors[mode].textPrimary);assert.equal(flat(text('Cancel').props.style).color,DesignColors[mode].brand);assert.equal(flat(text('Destructive').props.style).color,DesignColors[mode].danger);
 });
}

test('a modal-owned context menu consumes native request-close before the parent dismissal',async t=>{
 let dismissed=0;
 const app=await mount(createElement(modal,{onDismiss:()=>dismissed++},createElement(ContextMenu,{appearance:'v2',label:'Modal record options',actions:[{label:'Inspect record',onPress(){}}]})),null);t.after(app.unmount);
 await app.press('Modal record options');assert.equal(app.nodes().filter(n=>n.props?.role==='dialog').length,1);
 await act(()=>(app.find('Modal').props.onRequestClose as ()=>void)());assert.equal(dismissed,0);assert.ok(!app.nodes().some(n=>n.props?.role==='dialog'));
 await act(()=>(app.find('Modal').props.onRequestClose as ()=>void)());assert.equal(dismissed,1);
});
