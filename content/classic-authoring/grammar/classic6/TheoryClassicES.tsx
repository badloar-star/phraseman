/** Integration file: copy to components/classic-es/TheoryClassicES.tsx with the six sibling theory JSONs. No auto-registration. */
import React from 'react';
import {Section, Body, Example, Warn, Tip, Table, type TheoryContent} from '../lesson_help_theory_ui';

type Pair={ru:string;uk:string};
type Sample={es:string;gloss:Pair};
type RefSheet={title:Pair; formula:Pair; contrast:{wrong:string;right:string;why:Pair}; chapters:{heading:Pair;body:Pair;focus:Pair;focusSample:Sample;samples:Sample[]}[]; tables:{title:Pair;rows:{es:string;gloss:Pair;sample:string}[]}[]};
const loaders:Record<number,()=>RefSheet>={
  1:()=>require('./ES-01.theory.json'),2:()=>require('./ES-02.theory.json'),3:()=>require('./ES-03.theory.json'),
  4:()=>require('./ES-04.theory.json'),5:()=>require('./ES-05.theory.json'),6:()=>require('./ES-06.theory.json'),
};
/** Call only for studyTarget=es with learner explanations in RU/UK. No English fallback. */
export function getSpanishClassicTheory(id:number):TheoryContent|undefined {
  if(!Object.prototype.hasOwnProperty.call(loaders,id))return undefined;
  const d=loaders[id]();
  return { titleRU:d.title.ru,titleUK:d.title.uk,render:(t,isUK,f)=>{
    const k=isUK?'uk':'ru';const nodes:React.ReactNode[]=[<Tip key="formula" text={d.formula[k]} t={t} f={f}/>];
    d.chapters.forEach((c,i)=>{nodes.push(<Section key={`h${i}`} title={c.heading[k]} t={t} f={f}/>,<Body key={`b${i}`} text={c.body[k]} t={t} f={f}/>);c.samples.forEach((s,j)=>nodes.push(<Example key={`e${i}-${j}`} eng={s.es} rus={s.gloss[k]} t={t} f={f}/>));nodes.push(<Tip key={`focus${i}`} text={`${c.focusSample.es} — ${c.focus[k]}`} t={t} f={f}/>)});
    nodes.push(<Section key="errh" title={isUK?'Типова помилка':'Типичная ошибка'} t={t} f={f}/>,<Warn key="err" text={`${isUK?'Не так':'Не так'}: ${d.contrast.wrong}`} t={t} f={f}/>,<Tip key="fix" text={`${isUK?'Правильно':'Правильно'}: ${d.contrast.right} ${d.contrast.why[k]}`} t={t} f={f}/>);
    d.tables.forEach((s,i)=>nodes.push(<Section key={`tabh${i}`} title={s.title[k]} t={t} f={f}/>,<Table key={`tab${i}`} t={t} f={f} rows={[[isUK?'Форма':'Форма',isUK?'Пояснення':'Пояснение',isUK?'Приклад':'Пример'],...s.rows.map(r=>[r.es,r.gloss[k],r.sample||'—'])]}/>));
    return nodes;
  }};
}
