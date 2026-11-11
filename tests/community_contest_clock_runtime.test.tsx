import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { useEffect, useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { contestMonth } from '../shared/community_month_contest';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'packs', 'CommunityScene.tsx'), 'utf8');
function extractRuntime(): { declarations: string; effect: string } {
  const file = ts.createSourceFile('CommunityScene.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect = '';
  const declarations = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) {
      for (const name of ['isTabPage', 'runtimeOwnerId', 'contestRuntimeActive', 'hasFixedReferenceNow']) {
        if (declaration.name.getText(file).includes(name)) declarations.set(name, node.getText(file));
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.getText(file).includes('const schedule = () =>') && node.getText(file).includes('AppState.addEventListener')) effect = node.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!effect || declarations.size !== 4) throw new Error('contest clock runtime source missing');
  return { declarations: [...declarations.values()].join('\n'), effect };
}
const extractedRuntime = extractRuntime();
const actualEffect = new Function('useEffect', 'setNowMs', 'Date', 'setTimeout', 'clearTimeout', 'AppState', 'useIsTabPage', 'useTabNav', 'useRuntimeActive', 'authors', 'referenceNowMs', ts.transpileModule(`${extractedRuntime.declarations}\n${extractedRuntime.effect}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText) as any;
function clock(initialNow = 60010) { let now=initialNow, id=0; const timers=new Map<number,()=>void>(); const remove=jest.fn(); return { Date:{now:jest.fn(()=>now)}, setNow:(n:number)=>{now=n;}, timers, setTimeout:jest.fn((fn:()=>void, delay:number)=>{ const next=++id; timers.set(next,fn); return next; }), clearTimeout:jest.fn((n:number)=>{timers.delete(n);}), AppState:{addEventListener:jest.fn(()=>({remove}))}, remove }; }
function mount(c: ReturnType<typeof clock>, props={tab:true, owner:'packs', focus:true, app:true, authors:undefined as Record<string, unknown> | undefined, referenceNowMs:undefined as number | undefined}) { return renderHook((p:any)=> { const [now,setNowMs]=useState(0); actualEffect(useEffect,setNowMs,c.Date,c.setTimeout,c.clearTimeout,c.AppState,()=>p.tab,()=>({runtimeOwnerId:p.owner}),(ownerVisible:boolean)=>p.focus&&p.app&&ownerVisible,p.authors,p.referenceNowMs); return now; }, {initialProps:props}); }
describe('community contest display clock lifecycle', () => {
  test('does not schedule hidden retained packs, resumes immediately, preserves minute boundary and cleans up', async () => {
    const c=clock(); const h=await mount(c); expect(c.setTimeout).toHaveBeenCalledWith(expect.any(Function),60040);
    await act(async()=>h.rerender({tab:true,owner:'community',focus:true,app:true})); expect(c.clearTimeout).toHaveBeenCalledTimes(1); expect(c.timers.size).toBe(0);
    c.setNow(120010); await act(async()=>h.rerender({tab:true,owner:'packs',focus:true,app:true})); expect(h.result.current).toBe(120010); expect(c.setTimeout).toHaveBeenLastCalledWith(expect.any(Function),60040);
    const beforeMonthId=contestMonth(h.result.current).id; c.setNow(2_678_400_005); await act(async()=>[...c.timers.values()][0]?.()); expect(h.result.current).toBe(2_678_400_005); expect(contestMonth(h.result.current).id).not.toBe(beforeMonthId); expect(c.setTimeout).toHaveBeenLastCalledWith(expect.any(Function),60045);
    await act(async()=>h.rerender({tab:false,owner:'community',focus:false,app:true})); expect(c.clearTimeout).toHaveBeenCalledTimes(2); await act(async()=>h.unmount()); expect(c.clearTimeout).toHaveBeenCalledTimes(2); expect(c.remove).toHaveBeenCalledTimes(2);
  });
  test('schedules while an active pushed page is outside tabs even when the tab owner is home', async () => {
    const c=clock(); const h=await mount(c,{tab:false,owner:'home',focus:true,app:true,authors:undefined,referenceNowMs:undefined});
    expect(c.setTimeout).toHaveBeenCalledWith(expect.any(Function),60040); await act(async()=>h.unmount()); expect(c.clearTimeout).toHaveBeenCalledTimes(1);
  });
  test('does not schedule fixture authors with a fixed reference time', async () => {
    const c=clock(); const h=await mount(c,{tab:true,owner:'packs',focus:true,app:true,authors:{fixture:{}},referenceNowMs:123});
    expect(c.setTimeout).not.toHaveBeenCalled(); expect(c.AppState.addEventListener).not.toHaveBeenCalled(); await act(async()=>h.unmount()); expect(c.clearTimeout).not.toHaveBeenCalled();
  });
});
