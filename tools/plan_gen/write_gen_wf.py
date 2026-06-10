# -*- coding: utf-8 -*-
# Bake a batch JSON into a <plan> gen workflow script (writer + 3 critics).
# Usage: python tools/plan_gen/write_gen_wf.py <batch.json> <out_wf.js> [planId] [themeDesc] [arcDesc]
#   planId: defaults 'voyazh'
#   themeDesc: short theme, e.g. 'рабочие созвоны и митинги' (default 'путешествия')
#   arcDesc: arc note, e.g. 'Сюжетная арка рабочей коммуникации (112 дней)'
import json, sys
batch = json.load(open(sys.argv[1], encoding='utf-8'))
OUT = sys.argv[2]
PLAN = sys.argv[3] if len(sys.argv) > 3 else 'voyazh'
THEME = sys.argv[4] if len(sys.argv) > 4 else 'путешествия'
ARC = sys.argv[5] if len(sys.argv) > 5 else 'Длинная сюжетная арка реального путешествия (84 дня)'
inject = 'const BATCH = ' + json.dumps(batch, ensure_ascii=False) + ';\n'

POS_TAGS = 'verb, noun, pronoun, adjective, adverb, modifier, preposition, syntax, determiner, existential, article, to-be, conjunction, modal, phrasal_particle, other'
CBL = ('1:to-be,pronouns | 2:to-be-negation,to-be-questions | 3:present-simple | '
       '4:present-simple-negation | 5:present-simple-questions | 6:wh-questions | 7:to-have | '
       '8:prepositions-time | 9:there-is,there-are | 10:modals | 11:past-simple-regular | '
       '12:past-simple-irregular | 13:future-simple | 14:comparatives,superlatives | '
       '15:possessive-pronouns | 16:phrasal-verbs | 17:present-continuous | 18:imperative | '
       '19:prepositions-place | 20:articles | 21:indefinite-pronouns | 22:gerund | 23:passive-voice | '
       '24:present-perfect | 25:past-continuous | 26:conditionals | 27:reported-speech | '
       '28:reflexive-pronouns | 29:used-to | 30:relative-clauses | 31:complex-object')

js = '''export const meta = {
  name: '__PLAN__-gen-batch',
  description: 'Generate a batch of __PLAN__ days (writer + 3 critics each)',
  phases: [ { title: 'Write' }, { title: 'Critique' } ],
}

__INJECT__

const LOCALIZED = { type: 'object', properties: { ru: { type: 'string' }, uk: { type: 'string' }, es: { type: 'string' } }, required: ['ru','uk','es'] };
const DAY_SCHEMA = { type:'object', properties:{ planId:{type:'string'}, dayIndex:{type:'number'}, level:{type:'string'}, topic:LOCALIZED, outcome:LOCALIZED, prerequisiteLessons:{type:'array',items:{type:'number'}}, intro:{type:'array',items:{type:'object',properties:{kind:{type:'string'},title:LOCALIZED,body:LOCALIZED,examples:{type:'array',items:{type:'object',properties:{en:{type:'string'},gloss:LOCALIZED},required:['en','gloss']}}},required:['kind','title','body']}}, phrases:{type:'array',items:{type:'object',properties:{id:{type:'string'},english:{type:'string'},meaning:LOCALIZED,constructions:{type:'array',items:{type:'string'}},explanation:{type:'object',properties:{title:LOCALIZED,rule:LOCALIZED,why:LOCALIZED,commonMistake:LOCALIZED},required:['title','rule','why','commonMistake']},words:{type:'array',items:{type:'object',properties:{text:{type:'string'},partOfSpeech:{type:'string'},distractors:{type:'array',items:{type:'string'}}},required:['text','partOfSpeech','distractors']}}},required:['id','english','meaning','constructions','explanation','words']}}, vocabulary:{type:'array',items:{type:'object',properties:{word:{type:'string'},partOfSpeech:{type:'string'},translation:LOCALIZED,example:{type:'string'}},required:['word','partOfSpeech','translation','example']}} }, required:['planId','dayIndex','level','topic','outcome','prerequisiteLessons','intro','phrases','vocabulary'] };
const VERDICT_SCHEMA = { type:'object', properties:{ verdict:{type:'string'}, issues:{type:'array',items:{type:'object',properties:{where:{type:'string'},problem:{type:'string'},fix:{type:'string'},severity:{type:'string'}},required:['where','problem','fix']}} }, required:['verdict','issues'] };

const POS_TAGS = '__POS__';
const CBL = '__CBL__';
const STYLE = 'СТИЛЬ (жёстко): дружелюбный тренер на ты; живые разговорные фразы из ситуации дня. АУДИТОРИЯ 50+: спокойный серьёзный тон, медленный темп, БЕЗ сленга/мемов/флирта/хайпа; названия и тексты простые и понятные (НЕ хуки); общий полезный английский, НЕ нишевые скрипты. ЭМОДЗИ ЗАПРЕЩЕНЫ ВЕЗДЕ. НИКАКИХ грам.терминов в видимом тексте (глагол/связка/артикль/отрицание/Present Simple) — простыми словами. НИКАКИХ надуманных образов-действий. Объяснение = чистый смысл + мини-пример слово->со словом. Каждая часть rule/why/commonMistake <= 24 слова по-русски. ИСПАНСКИЙ: обязательны ударения (Podrás, estación, ¿Cuánto, Así, más, rápido) и открывающий ¿ во всех вопросах. ru/uk/es — реальные переводы, НЕ копия ru, согласованы между собой (если rule учит перевод слова, в meaning тот же перевод).';
const RULES = 'КОНТРАКТ: planId __PLAN__. РОВНО 6 фраз; id __PLAN___d<N>_p<K>; фраза 5-7 слов (естественность важнее длины — лимита нет, но не растягивай). У каждого слова РОВНО 5 дистракторов того же класса (POS строго из набора, НЕ выдумывать numeral/wh-word/auxiliary/phrase: число=determiner, where/how=adverb, there в there-is=existential, do-вспом=verb, инфинитив to=other, модал=modal, is/was/be=to-be), БЕЗ дублей, НЕ совпадают со словом, и КРИТИЧНО — ни один дистрактор НЕ должен давать тоже правильную/естественную фразу (синонимы и близкие по смыслу убирать: seat/table, empty/free, those/these, start/open, get/have, want/need, send/text, left/right, freeze/block). 6 vocab (каждое слово реально в english фраз В ТОЙ ЖЕ ФОРМЕ и УНИКАЛЬНО, example = точная фраза дня). 3 intro (how-экран с 2 examples). prerequisiteLessons НЕ содержит сам день и НЕ содержит уроки выше gate. constructions фразы — теги ТОЛЬКО из разрешённого набора для gate дня (не выше).';

phase('Write')
const drafts = await pipeline(
  BATCH,
  (d) => agent(
    'Ты — методист-писатель английского для русскоязычных (uk/es) новичков. Напиши контент дня ' + d.dayIndex + ' плана __PLAN__ (__THEME__), приложение phraseman.\\n' +
    'ТЕМА: "' + d.topic + '". Уровень ' + d.level + '. Заметка: ' + d.note + '\\n' +
    '__ARC__. День ' + d.dayIndex + ' строго из этой темы, продолжает линию.\\n' +
    'GATE: ТОЛЬКО конструкции из уроков 1..' + d.gateLessons + '. Карта: ' + CBL + '. Рекомендованные конструкции: ' + JSON.stringify(d.allowedConstructions) + '. prerequisiteLessons: [' + d.prereq.join(', ') + '].\\n' +
    STYLE + '\\n' + RULES + '\\nВерни PlanContentDay через StructuredOutput. dayIndex=' + d.dayIndex + '.',
    { label: 'write:d' + d.dayIndex, phase: 'Write', schema: DAY_SCHEMA }
  ),
  (draft, d) => {
    if (!draft) return null;
    const j = JSON.stringify(draft);
    return parallel([
      () => agent('Придирчивый педагог-критик. Черновик дня ' + d.dayIndex + ' (' + d.topic + '). Линза: СМЫСЛ/ТОН/ПЕДАГОГИКА/ДИСТРАКТОРЫ. Ищи: грам.термин/эмодзи/надуманный образ (БРАК); ДИСТРАКТОР дающий тоже правильную/естественную фразу (серьёзный БРАК — проверь КАЖДЫЙ дистрактор подстановкой в фразу); дистрактор не того класса; фраза не из ситуации/неестественная; rule/why больше 24 слов. Черновик: ' + j + '. Верни verdict и issues(where,problem,fix). Чисто — issues пустой.', { label: 'crit-sense:d' + d.dayIndex, phase: 'Critique', schema: VERDICT_SCHEMA }),
      () => agent('Билингв-корректор ru/uk/es. Черновик дня ' + d.dayIndex + '. Линза: ПЕРЕВОДЫ. Проверь каждый uk/es: копия ru (БРАК); кривой/неграмматичный (БРАК); es БЕЗ ударений или БЕЗ открывающего ¿ в вопросах (БРАК — укажи исправленный текст); es-перевод слова неверен; рассинхрон rule и meaning. Черновик: ' + j + '. Верни verdict и issues(where,problem,fix). Чисто — пусто.', { label: 'crit-i18n:d' + d.dayIndex, phase: 'Critique', schema: VERDICT_SCHEMA }),
      () => agent('Валидатор gate и структуры. Черновик дня ' + d.dayIndex + '. Разрешены уроки 1..' + d.gateLessons + '. Карта: ' + CBL + '. Валидные POS: ' + POS_TAGS + '. Ищи: грамматика/тег выше gate; POS невалиден (numeral/wh-word/auxiliary/phrase — БРАК); POS неверен для слова; НЕ 6 фраз/НЕ 5 дистракторов/НЕ 6 vocab/НЕ 3 intro; слово english-фразы не покрыто в words[]; vocab дубль; vocab.word не в фразах в той же форме; дубль/совпадение дистрактора; prerequisiteLessons содержит ' + d.dayIndex + ' или урок выше gate. Черновик: ' + j + '. Верни verdict и issues. Чисто — пусто.', { label: 'crit-gate:d' + d.dayIndex, phase: 'Critique', schema: VERDICT_SCHEMA }),
    ]).then(v => ({ dayIndex: d.dayIndex, topic: d.topic, draft, critiques: { sense: v[0], i18n: v[1], gate: v[2] } }));
  }
);
const result = drafts.filter(Boolean);
log('Готово: ' + result.length + '/' + BATCH.length + '. Находок: ' + result.reduce((n,r)=>n+['sense','i18n','gate'].reduce((m,k)=>m+((r.critiques[k] && r.critiques[k].issues ? r.critiques[k].issues.length : 0)),0),0));
return result;
'''
js = (js.replace('__INJECT__', inject).replace('__POS__', POS_TAGS).replace('__CBL__', CBL)
        .replace('__PLAN__', PLAN).replace('__THEME__', THEME).replace('__ARC__', ARC))
open(OUT, 'w', encoding='utf-8').write(js)
print('wrote gen workflow', len(js), 'bytes for plan', PLAN)
