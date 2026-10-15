#!/usr/bin/env node
// Стоп-кран для вводящих в заблуждение безличных учебных ситуаций.
// Он не доказывает, что весь текст хорош: он запрещает известные формы,
// где ученик не может понять, кто говорит, кому и о чём именно речь.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const onlyScope = process.argv.includes("--scope") ? process.argv[process.argv.indexOf("--scope") + 1] : null;
const onlyLesson = process.argv.includes("--lesson") ? process.argv[process.argv.indexOf("--lesson") + 1] : null;
const onlySession = process.argv.includes("--session") ? process.argv[process.argv.indexOf("--session") + 1] : null;
const sessionsRootArg = process.argv.includes("--sessions-root") ? process.argv[process.argv.indexOf("--sessions-root") + 1] : null;
const sessionsRoot = sessionsRootArg ? fs.realpathSync(path.resolve(sessionsRootArg)) : path.join(ROOT, "sessions");
const relativeRoot = path.dirname(sessionsRoot);
// Сборщик читает исключительно final.<locale>.md.  Черновики сохраняются как
// исторические свидетельства, но не являются кандидатами на показ ученику и
// не должны блокировать пересборку проверенного final.  Для отдельной чистки
// всего архива предусмотрен явный --include-archive: тогда старые варианты
// тоже проходят через тот же запрет и остаются видимыми в отчёте.
const includeArchive = process.argv.includes("--include-archive");
const files = [];
const checkedFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    // Единственный путь в макет и релиз — final.<locale>.md (см.
    // build_release.mjs). Архивные draft_* не могут попасть к ученику сами
    // по себе; их проверяют отдельно через --include-archive.
    else if (
      /^final\.(ru|uk)\.md$/u.test(entry.name) ||
      // locales_batch.md is a live localization hand-off.  It is not rendered
      // directly today, but it can regenerate final.uk.md, so letting a
      // rejected scenario survive there makes the defect recur later.
      entry.name === "locales_batch.md" ||
      (includeArchive && /^draft_[A-Z](?:\.[a-z_]+)*\.(ru|uk)\.md$/u.test(entry.name))
    ) files.push(full);
  }
}
walk(sessionsRoot);

// Формы запрещены только в инструкциях/сценах, а не внутри объяснения грамматики
// или прямой цитаты. Каждая находка требует переписать строку с названным актором.
const forbidden = [
  // Ученик должен видеть ситуацию и действие, а не внутреннюю разметку
  // автора: «обманка», «финал» и «шаг 2 из 4» не объясняют, что делать.
  // «Финальная подпись» и «финальный звук» называют свойства предмета,
  // а «финал сцены» — внутренний этап. Исключаем только прилагательное.
  { id: "ru_internal_task_label", re: /(?:обманка|ловушка|финал(?!ьн)|шаг\s+\d+\s+из\s+\d+)/giu },
  { id: "uk_internal_task_label", re: /(?:пастка|фінал(?!ьн)|крок\s+\d+\s+із\s+\d+)/giu },
  // Редакторские итоги и связи — не часть урока. Если они остаются после
  // разделителя, ученик всё равно получает служебный отчёт вместо занятия.
  { id: "ru_internal_editorial_note", re: /(?:стоит\s+улучшить|скрытые\s+связи|замечани[ея]\s+судьи)/giu },
  { id: "uk_internal_editorial_note", re: /(?:варто\s+покращити|приховані\s+зв['’]язки|зауважен(?:ня|ь)\s+судді)/giu },
  // Название рабочего процесса не объясняет ученику язык. В пользовательском
  // тексте остаётся только «занятие» и обычное описание ситуации; «сессия»,
  // «сцена сессии» и «операция» — авторские ярлыки и не должны попасть в UI.
  // Не используем \b: JavaScript не считает кириллицу word-символом.
  { id: "ru_internal_course_label", re: /(?:сесси\p{L}*|сцена\s+сессии|операция)/giu },
  { id: "uk_internal_course_label", re: /(?:сесі\p{L}*|сцена\s+сесії|операція)/giu },
  { id: "ru_unnamed_questioner", re: /\*\*[^\n]*(?:вас\s+)?спрашивают/giu },
  // Слово «говорят» само по себе не ошибка, если перед ним уже назван
  // участник. Иначе гейт отвергал бы ясные фразы вроде «Лина и её коллега
  // говорят…» и поощрял бы неестественные обходные формулировки.
  { id: "ru_unnamed_speaker", re: /\*\*(?:(?!мира|мина|лина|друг|коллега|сосед|мама|брат|официант|продавец|сотрудник)[^\n])*?(?:вам\s+)?говорят(?!ь)/giu },
  { id: "ru_unnamed_claimant", re: /\*\*[^\n]*(?:они\s+)?уверяют/giu },
  { id: "ru_actorless_question", re: /(?:^|[^\p{L}])(?:у|за)\s+(?!(?:ним|ней|вами|мной|столом)(?=$|[^\p{L}]))[^.\n]{1,50}\s+спрашивают(?=$|[^\p{L}])/giu },
  // Место не может быть собеседником. Этот вариант обходил правило выше,
  // потому что вместо «спрашивают» использовал оборот «задают вопрос».
  // Сценарий обязан назвать человека, который обращается к ученику, а не
  // подменять его кулером, стойкой или другим предметом/местом.
  { id: "ru_place_as_questioner", re: /(?:у|за)\s+[^.\n]{0,50}\s+задают\s+(?:вам\s+)?вопрос/giu },
  // Кольцо не доказывает семейное положение. В учебной ситуации нужен
  // проверяемый источник факта (анкета, подпись человека, явное сообщение),
  // иначе ученик получает ложный критерий вместо смысла слова.
  { id: "ru_ring_as_marital_proof", re: /(?:кольц|обручк)[^.\n]{0,120}(?:женат|замужем|состоит\s+в\s+браке|married|single)/giu },
  // \b в JavaScript не считает кириллицу буквами. Поэтому границы здесь
  // намеренно не используются: иначе «кто-то спрашивает» ускользает от контроля.
  { id: "ru_unspecified_actor", re: /кто-то/giu },
  { id: "ru_passive_question", re: /\bспрашивают\b(?!\s+[^.\n]{0,80}\b(?:коллега|друг|сосед|продавец|сотрудник|линия|лина|мама|брат)\b)/giu },
  { id: "uk_actorless_question", re: /(?:біля|за)\s+[^.\n]{0,50}\s+(?:питають|запитують)\b/giu },
  { id: "uk_place_as_questioner", re: /(?:біля|за)\s+[^.\n]{0,50}\s+ставлять\s+(?:вам\s+)?запитання/giu },
  { id: "uk_ring_as_marital_proof", re: /(?:каблучк|обручк)[^.\n]{0,120}(?:одружен|заміжн|перебуває\s+у\s+шлюбі|married|single)/giu },
  { id: "uk_unnamed_questioner", re: /\*\*[^\n]*(?:вас\s+)?(?:питають|запитують)/giu },
  { id: "uk_unnamed_speaker", re: /\*\*(?:(?!міра|ліна|друг|колега|сусід|мама|брат|офіціант|продавець|працівник)[^\n])*?(?:вам\s+)?говорять/giu },
  { id: "uk_unspecified_actor", re: /хтось/giu },
];
const internalTaskLabels = forbidden.filter(({ id }) => /_internal_(?:task|course)_label$|_internal_editorial_note$/u.test(id));
// Редакторские заметки после служебного раздела не видны в текущем плеере,
// но остаются в исходнике, из которого может быть собран следующий вариант.
// Поэтому они запрещены во всём файле; служебные поля автора этим не являются.
const editorialNoteRules = internalTaskLabels.filter(({ id }) => id.endsWith("_internal_editorial_note"));
const learnerInternalLabels = internalTaskLabels.filter(({ id }) => !id.endsWith("_internal_editorial_note"));
const actorRules = forbidden.filter(({ id }) => !/_internal_(?:task|course)_label$|_internal_editorial_note$/u.test(id));
// Место/неопределённый персонаж остаются недопустимыми и в обычном тексте
// объяснения. Остальные правила ниже ограничены явной сценой или инструкцией,
// чтобы не запрещать лингвистическое объяснение самой формы слова.
const actorRulesEverywhere = new Set([
  "ru_actorless_question", "ru_place_as_questioner",
  "uk_actorless_question", "uk_place_as_questioner",
]);
// Это не определитель языка вообще: он ловит лишь однозначно русские
// указательные формы, которые не могут быть украинским вариантом ответа.
// Полную естественность перевода по-прежнему проверяет отдельная вычитка.
const ukRussianLearnerText = /(?:^|[^\p{L}])(?:Это|Этот|Эта|Эти|Эту|Пожалуйста|Вон|Вот|Где)(?=$|[^\p{L}])/u;
// \b в JavaScript не считает кириллицу буквами, поэтому заголовок
// «Для сборщика» нужно ограничивать пробелом или концом строки.
const authorOnlySection = /^##\s+(?:Для сборщика|Для збирача|Самопроверка|Самоперевірка|Вердикт владельца)(?:\s|$)/ui;
// «Скрепка» была внутренней авторской метафорой для am/is/are. Ученик не
// обязан её разгадывать: показываем саму форму и её место во фразе. Запрет
// действует во всех видимых источниках, в том числе в JSON плеера.
const internalGrammarMetaphors = {
  ru: /скрепк\p{L}*/giu,
  // Ukrainian has both the base `скріпка` and the locative `скріпці`.
  // Matching only `скріпк` let the visible locative form evade the gate.
  uk: /скріп(?:к|ц)\p{L}*/giu,
};

// В задании нельзя скрывать референт за «парнем», «женщиной» или «кем-то».
// Это не запрет словаря вообще: проверяются только видимые инструкции задания,
// где ученик должен однозначно понять, о ком строится фраза.
const genericUnnamedActor = {
  ru: /(?:парень|мужчина|женщина|девушка)(?=$|[^\p{L}])/iu,
  uk: /(?:хлопець|чоловік|жінка|дівчина)(?=$|[^\p{L}])/iu,
};

const findings = [];

function allStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) allStrings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) allStrings(item, out);
  return out;
}

function atomicMaritalRingFindings(atomic, relative) {
  const answerByInteraction = new Map((atomic?.answers ?? []).map((answer) => [answer.interactionId, String(answer.correctText ?? "").toLowerCase()]));
  const out = [];
  for (const [locale, interactions] of Object.entries(atomic?.interactionsByLocale ?? {})) {
    if (!Array.isArray(interactions)) continue;
    for (const interaction of interactions) {
      const text = allStrings(interaction).join("\n");
      const hasRingCue = /(?:кольц|обручк|каблучк)/iu.test(text);
      const firstOption = interaction?.modePayload?.gapOptions?.[0]?.text
        ?? interaction?.responseOptions?.[0]?.text
        ?? "";
      const expected = answerByInteraction.get(interaction?.interactionId) ?? String(firstOption).toLowerCase();
      if (hasRingCue && /^(?:he is )?married\.?$/iu.test(String(expected).trim())) {
        out.push({
          file: relative,
          line: null,
          rule: "atomic_ring_as_marital_proof",
          excerpt: `${locale}:${interaction?.interactionId ?? "unknown"}`,
        });
      }
    }
  }
  return out;
}

function atomicActorFindings(atomic, relative) {
  const out = [];
  for (const [locale, interactions] of Object.entries(atomic?.interactionsByLocale ?? {})) {
    if (!Array.isArray(interactions)) continue;
    for (const interaction of interactions) {
      const learnerPrompts = [
        interaction?.prompt,
        interaction?.accessibilityLabel,
        ...Object.values(interaction?.modePayload?.localizedScene ?? {}),
        ...Object.values(interaction?.modePayload?.localizedMeaning ?? {}),
      ].filter((value) => typeof value === "string");
      const unnamedActor = genericUnnamedActor[locale];
      // Один и тот же текст обычно повторяется как prompt, accessibilityLabel
      // и localizedScene. В отчёте это один дефект задания, а не три.
      const hasUnnamedActor = learnerPrompts.some((text) => {
        unnamedActor.lastIndex = 0;
        return unnamedActor.test(text);
      });
      if (hasUnnamedActor) out.push({
        file: relative,
        line: null,
        rule: `atomic_${locale}_generic_unnamed_actor`,
        excerpt: `${locale}:${interaction?.interactionId ?? "unknown"}`,
      });
      for (const text of allStrings(interaction)) {
        const metaphor = internalGrammarMetaphors[locale];
        if (metaphor) {
          metaphor.lastIndex = 0;
          if (metaphor.test(text)) out.push({
            file: relative,
            line: null,
            rule: `atomic_${locale}_internal_grammar_metaphor`,
            excerpt: `${locale}:${interaction?.interactionId ?? "unknown"}`,
          });
        }
        for (const rule of actorRules) {
          // В JSON нет Markdown-жирного оформления, поэтому правила,
          // привязанные к строке сценария, применяются в final.md. Здесь
          // нужны только безусловно недопустимые формы: место/предмет
          // «спрашивает» вместо человека и неопределённый персонаж.
          if (!rule.id.startsWith(`${locale}_`)) continue;
          if (!actorRulesEverywhere.has(rule.id) && !rule.id.endsWith("_unspecified_actor")) continue;
          rule.re.lastIndex = 0;
          if (rule.re.test(text)) out.push({
            file: relative,
            line: null,
            rule: `atomic_${rule.id}`,
            excerpt: `${locale}:${interaction?.interactionId ?? "unknown"}`,
          });
        }
      }
    }
  }
  return out;
}

// `You are ...` is a direct address.  If the cue asks the learner to say
// something *about* "him/her", it silently changes the intended meaning to
// `He/She is ...`.  This is not a style preference: the learner cannot know
// which grammatical person the exercise actually tests.
function directAddressCueFindings(text, relative, locale, lineOffset = 0) {
  const patterns = locale === "uk"
    ? [{ rule: "uk_third_person_cue_for_you_are", re: /\*\*[^\n]*?скажіть,?\s+що\s+він[^\n]*\*\*[\s\S]{0,300}?✅\s*\*\*You are\b/giu }]
    : [{ rule: "ru_third_person_cue_for_you_are", re: /\*\*[^\n]*?скажите,?\s+что\s+он[^\n]*\*\*[\s\S]{0,300}?✅\s*\*\*You are\b/giu }];
  const out = [];
  for (const { rule, re } of patterns) {
    for (const match of text.matchAll(re)) {
      const line = lineOffset + text.slice(0, match.index).split(/\r?\n/).length;
      out.push({ file: relative, line, rule, excerpt: match[0].split(/\r?\n/)[0].trim() });
    }
  }
  return out;
}

for (const file of files) {
  const relative = path.relative(relativeRoot, file).replaceAll("\\", "/");
  // `--scope en` and `--scope en/l03` select a tree of sessions, not a
  // directory containing the Markdown file directly.  The previous equality
  // check silently selected zero files for a language-wide audit.
  if (onlyScope && !relative.startsWith(`sessions/${onlyScope}/`)) continue;
  // Аудит курса по номеру урока предназначен для английского Learning V2.
  // Без этого ограничения `--lesson l01` смешивал результаты en/l01 и
  // fr/l01: французский дефект ошибочно выглядел как HOLD английского курса.
  // Для другого языка вызывающая сторона обязана передать точный --scope.
  if (onlyLesson && !relative.includes(`/en/${onlyLesson}/`)) continue;
  checkedFiles.push(file);
  if (onlySession && !relative.includes(`/${onlySession}/`)) continue;
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  const authorOnlyIndex = lines.findIndex((line) => authorOnlySection.test(line));
  const learnerSource = authorOnlyIndex === -1 ? source : lines.slice(0, authorOnlyIndex).join("\n");
  const locale = /\/final\.uk\.md$/u.test(relative) ? "uk" : "ru";
  findings.push(...directAddressCueFindings(learnerSource, relative, locale));
  let learnerFacing = true;
  lines.forEach((line, index) => {
    if (authorOnlySection.test(line)) learnerFacing = false;
    for (const rule of editorialNoteRules) {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (match) findings.push({ file: relative, line: index + 1, rule: rule.id, excerpt: line.trim() });
    }
    if (learnerFacing) for (const rule of learnerInternalLabels) {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (match) findings.push({ file: relative, line: index + 1, rule: rule.id, excerpt: line.trim() });
    }
    if (learnerFacing) {
      const metaphor = internalGrammarMetaphors[locale];
      metaphor.lastIndex = 0;
      if (metaphor.test(line)) findings.push({ file: relative, line: index + 1, rule: `${locale}_internal_grammar_metaphor`, excerpt: line.trim() });
    }
    if (learnerFacing && /\/final\.uk\.md$/u.test(relative) && ukRussianLearnerText.test(line)) {
      findings.push({ file: relative, line: index + 1, rule: "uk_russian_learner_text", excerpt: line.trim() });
    }
    const isExplicitSceneOrInstruction = /^\*\*|^\*\*Сцена|^\*\*Сцена сес/.test(line);
    for (const rule of actorRules) {
      if (!isExplicitSceneOrInstruction && !actorRulesEverywhere.has(rule.id)) continue;
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (match) findings.push({ file: relative, line: index + 1, rule: rule.id, excerpt: line.trim() });
    }
  });
  // The player reads practice.atomic.json, not Markdown.  Check its actual
  // learner-facing interaction strings once per session so a stale JSON value
  // cannot restore a rejected false cue after the Markdown has been repaired.
  if (/\/final\.ru\.md$/u.test(relative)) {
    const atomicPath = path.join(path.dirname(file), "practice.atomic.json");
    if (fs.existsSync(atomicPath)) {
      try {
        const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
        findings.push(...atomicMaritalRingFindings(atomic, relative));
        findings.push(...atomicActorFindings(atomic, relative));
      } catch (error) {
        findings.push({ file: relative, line: null, rule: "atomic_unreadable", excerpt: String(error?.message ?? error) });
      }
    }
  }
}

if (findings.length) {
  console.error(`[ACTOR-CLARITY][HOLD] ${findings.length} безличных или неуточнённых учебных ситуаций`);
  for (const finding of findings) console.error(JSON.stringify(finding));
  process.exit(1);
}
console.log(`[ACTOR-CLARITY][PASS] ${checkedFiles.length} файлов проверено; запрещённых безличных форм нет`);
