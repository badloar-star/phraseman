// зачем: макет открывали и видели пустой экран без единой ошибки в консоли.
// Любой сбой запуска обязан быть виден НА СТРАНИЦЕ, а не только в консоли.
window.addEventListener("error", (e) => {
  const box = document.getElementById("boot-msg");
  if (box) box.textContent = "Ошибка: " + (e.message || e.error?.message || "неизвестная") + " · " + (e.filename || "") + ":" + (e.lineno || "?");
  console.error("[mockup] ошибка запуска:", e.message, e.error);
});
const DATA = window.__DATA__;
const SOURCE_QUALITY = JSON.parse(document.getElementById("source-quality-findings")?.textContent || "{}");
const SOURCE_RELEASE = JSON.parse(document.getElementById("source-release-findings")?.textContent || "{}");
const REVIEWED_CARDS = JSON.parse(document.getElementById("reviewed-cards")?.textContent || "{}");
const PREVIEW_STATE = JSON.parse(document.getElementById("preview-state")?.textContent || "{}");
const REVIEWED_SOURCE_MARKER = "";
const REVIEWED_CARD_CLASS = "candidate-review-disabled";
const REVIEWED_LABEL = "";
const HOME_DESCRIPTION = "Откройте занятие и проверьте его глазами ученика. Это черновой просмотр: канонический выпуск не изменён.";
const LOCALES = ["ru","uk"];
const LOC_NAME = {ru:"Русский",uk:"Українська",es:"Español","pt-BR":"Português",vi:"Tiếng Việt",id:"Bahasa",tr:"Türkçe",pl:"Polski"};
const BUILT_AT = "13.10, 05:38";
// зачем: показать свежесть макета с одного взгляда — владелец час смотрел на старую сборку
document.getElementById("buildStamp").textContent = DATA.length + " занятий · " + BUILT_AT;

const S = { locale: localStorage.getItem("mockup.locale") || "ru", session: null, step: 0, answered: false, ok: null, picked: null, assembled: [], tileFeedback: null, pairSel: null, pairFeedback: null, pairsDone: [], right: 0, wrong: 0 };
const learnerForSession = (s, locale = S.locale) => s.learnerByLocale?.[locale] ?? s.learner;

const app = document.getElementById("app");
const sel = document.getElementById("locale");
const homeBtn = document.getElementById("home");
LOCALES.forEach(l => { const o = document.createElement("option"); o.value = l; o.textContent = LOC_NAME[l] || l; sel.append(o); });
sel.value = S.locale;
sel.onchange = () => { S.locale = sel.value; localStorage.setItem("mockup.locale", S.locale); render(); };
homeBtn.onclick = () => { S.session = null; render(); };

const h = (tag, attrs, kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e[k.toLowerCase()] = v;
    else if (v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of [].concat(kids || [])) if (kid) e.append(kid);
  return e;
};
const loc = (byLocale) => !byLocale ? "" : (byLocale[S.locale] ?? byLocale.ru ?? Object.values(byLocale)[0] ?? "");
// Служебное слово «сессия» не должно попадать в интерфейс ученика даже если
// оно осталось в заголовке исходного файла. Номер занятия сохраняется.
const displayTitle = (value) => String(value ?? "").replace(/(^|[^p{L}])сессия(?=$|[^p{L}])/giu, "$1Занятие");
const esc = (s) => String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
// зачем: целевой язык размечен в тексте обратными кавычками — красим его
// акцентом, чтобы английское сразу отличалось от объяснения на своём языке
const MARK = String.fromCharCode(1); // служебный символ-заглушка, в текстах не встречается
const tl = (s) => {
  let out = esc(s);
  // 1) явная разметка автора
  const BT = String.fromCharCode(96); // обратная кавычка: в шаблоне генератора её нельзя писать буквально
  // зачем: размеченные куски прячем в плейсхолдеры, чтобы второй проход
  // (латиница без разметки) не покрасил их повторно и не дал вложенные теги
  const kept = [];
  out = out.replace(new RegExp(BT + "([^" + BT + "]+)" + BT, "g"), (m, inner) => {
    kept.push(inner);
    return MARK + (kept.length - 1) + MARK;
  });
  // 2) латиница без разметки внутри кириллического текста (разборы ошибок
  //    пишут «Am выпало», «Not не заменяет») — красим, если рядом кириллица
  //    и фрагмент ещё не покрашен
  if (/[А-Яа-яЁё]/.test(out)) {
    const Q = String.fromCharCode(34), AP = String.fromCharCode(39);
    // дефис только последним символом класса — иначе «—–-"» читается как диапазон
    const BOUND = "\\s(«„>—–" + Q + AP + "-";
    const AFTER = "\\s.,!?:;)»<—–" + Q + AP + "-";
    const W = "[A-Za-z][A-Za-z" + AP + "]*";
    const LAT = new RegExp("(^|[" + BOUND + "])(" + W + "(?:\\s+" + W + "){0,4})(?=[" + AFTER + "]|$)", "g");
    out = out.replace(LAT, (m, pre, word) => /^(span|class|tl|amp|lt|gt)$/i.test(word) ? m : pre + '<span class="tl">' + word + '</span>');
  }
  return out.replace(new RegExp(MARK + "(\\d+)" + MARK, "g"), (m, i) => '<span class="tl">' + kept[+i] + '</span>');
};
const speak = (text) => {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = .85;
    speechSynthesis.speak(u);
  } catch (e) { console.warn("[mockup] речь недоступна:", e.message); }
};
const shuffle = (arr, seed) => {
  let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const shuffleChoices = (arr, seed) => {
  const a = shuffle(arr, seed);
  // Автор хранит правильный вариант первым для ревью. Даже редкая identity-
  // перестановка не должна превращать это в подсказку ученику.
  if (a.length > 1 && a[0] === arr[0]) a.push(a.shift());
  return a;
};
const sanitizeLearnerPrompt = (value) => String(value || "")
  .trim()
  .replace(/s*(?:[,;]|—|-)s*(?:среди|серед)s+(?:плиток|слів)(?=s|$)[^.!?]*$/iu, "")
  .replace(/s*(?:[,;]|—|-)s*(?:(?:одна|две|дві)s+)?(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
  .replace(/s*(?:[,;]|—|-)s*(?:с|із|зі)s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
  .replace(/s*(?:[,;]|—|-)s*(?:есть|є)s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|слов|вопрос|питан)[^.!?]*$/iu, "")
  .replace(/s*([^)]*(?:лишн|чуж|зайв)[^)]*(?:плитк|скрепк|скріпк|слов|форм)[^)]*)s*$/iu, "")
  .replace(/s*(?:[,;]|—|-)s*(?:among the tiles|with (?:an?|one|two) extra tiles?|there (?:is|are) extra tiles?)[^.!?]*$/iu, "")
  .replace(/^(?:проверьтеs+себя|проверьs+себя|перевіртеs+себе|перевірs+себе|checks+yourself|comprueba|compruébalo|verifique|confira|sprawdźs+się)s*[:—-]?s*/iu, "")
  .replace(/(^|[s(])(соберите|собери|складіть|склади)s+безs+(?:подсказк[иу]|підказк[иу]|опоры|опори)(?=s|$)/giu, "$1$2 фразу")
  .replace(/s+(?:безs+(?:подсказк[иу]|підказк[иу]|опоры|опори)|самостоятельно|самостійно|withouts+(?:as+)?hints?|ons+yours+own|sins+(?:pistas?|ayuda)|sems+(?:dicas?|ajuda)|bezs+podpowiedzi|samodzielnie)(?=s*(?:[—,:;-]|$))/giu, "")
  .replace(/^[а-яіїє]/u, (letter) => letter.toLocaleUpperCase())
  .replace(/[,:;]s*$/u, "")
  .trim();
const avoidAlignedPairs = (left, right) => {
  if (left.length < 2 || left.length !== right.length) return right;
  const candidate = right.slice();
  for (let shift = 0; shift < candidate.length; shift++) {
    if (candidate.every((item, row) => item.id !== left[row].id)) return candidate;
    candidate.push(candidate.shift());
  }
  const rightById = new Map(right.map(item => [item.id, item]));
  if (rightById.size === right.length && left.every(item => rightById.has(item.id))) {
    return left.map((_, row) => rightById.get(left[(row + 1) % left.length].id));
  }
  return right;
};

function resetStep() { S.answered = false; S.ok = null; S.picked = null; S.assembled = []; S.tileFeedback = null; S.pairSel = null; S.pairFeedback = null; S.pairsDone = []; }

// ---------- экраны ----------
function renderHome() {
  homeBtn.hidden = true;
  app.replaceChildren(
    h("div", {class:"hero"}, [
      h("h1", {text:"Пройдите любой подготовленный урок"}),
      h("p", {text:HOME_DESCRIPTION}),
    ]),
    ...groupByLesson(),
  );
}
function groupByLesson() {
  const out = [];
  const byLesson = {};
  for (const s of DATA) (byLesson[s.lesson] ??= []).push(s);
  for (const [lesson, list] of Object.entries(byLesson)) {
    const lessonTitle = list[0].lessonTitle;
    out.push(h("div", {class:"lesson-title", text:"Урок " + lesson.replace(/^l0?/, "") + (lessonTitle ? " · " + lessonTitle : "")}));
    out.push(h("div", {class:"cards"}, list.map(s => {
      const findings = SOURCE_QUALITY[s.key] || [];
      const releaseFindings = SOURCE_RELEASE[s.key] || [];
      const isCandidate = Boolean(PREVIEW_STATE.candidate) || s.viewSource === "candidate";
      const sourceFixed = !isCandidate && Boolean(REVIEWED_CARDS[s.key]) && !findings.length;
      // A reviewed projection is useful evidence, but it cannot turn the whole
      // card green while the version that would be released still differs.
      const needsRepair = findings.length || releaseFindings.length;
      const numbers = findings.map(item => item.taskNumber).filter(Number.isInteger);
      const hasUnnumberedFinding = findings.some(item => !Number.isInteger(item.taskNumber));
      const findingTarget = hasUnnumberedFinding
        ? (numbers.length ? "вводный текст и задания " + numbers.join(", ") : "вводный текст")
        : "задания " + (numbers.length ? numbers.join(", ") : "без номера");
      const summary = isCandidate
        ? "Канонический выпуск не изменён. Это черновой просмотр текущего исходника; его нельзя считать проверенным или выпущенным."
        : sourceFixed && releaseFindings.length
        ? "Выпуск ещё содержит старый текст; здесь открывается проверенная правка. Нажмите «Показать изменения», чтобы увидеть точную замену."
        : findings.length
        ? "Нужно исправить " + findingTarget + ": " + [...new Set(findings.map(item => item.reason))].join("; ")
        : releaseFindings[0] || "";
      return h("button", {class:"card" + (isCandidate ? " needs-repair candidate" : needsRepair ? " needs-repair" : sourceFixed ? " " + REVIEWED_CARD_CLASS : ""), onClick:() => { S.session = s; S.step = 0; S.right = 0; S.wrong = 0; resetStep(); render(); }}, [
        h("h3", {text:displayTitle(s.title)}),
        h("p", {class:"scene", text:s.scene}),
        h("div", {class:"meta"}, [
          h("span", {class:"chip k", text:"Занятие " + s.session.replace(/^s0?/, "")}),
          h("span", {class:"chip", text:learnerForSession(s).interactions.length + " заданий"}),
           isCandidate ? h("span", {class:"chip pending", text:"ЧЕРНОВИК · НЕ ПРОВЕРЕНО · НЕ ВЫПУСК"}) : null,
           sourceFixed ? h("span", {class:"chip fixed", text:s.viewSource === REVIEWED_SOURCE_MARKER ? REVIEWED_LABEL : "Исходник исправлен"}) : null,
           releaseFindings.length ? h("span", {class:"chip pending", text:"Выпуск надо синхронизировать"}) : null,
        ]),
        isCandidate || findings.length || releaseFindings.length ? h("p", {class:"fix-summary", text:summary}) : null,
      ]);
    })));
  }
  return out;
}

function renderSession() {
  homeBtn.hidden = false;
  const s = S.session;
  const learner = learnerForSession(s);
  const total = 3 + learner.interactions.length;
  if (S.step >= total) return renderDone();

  const bar = h("div", {class:"progress"}, Array.from({length:total}, (_, i) =>
    h("i", {class: i < S.step ? "done" : i === S.step ? "now" : ""})));

  const panel = S.step < 3 ? renderIntro(s.intro.pages[S.step], s.auxiliary) : renderTask(learner.interactions[S.step - 3]);
  app.replaceChildren(bar, panel);
}

function renderIntro(page, auxiliary) {
  // зачем (владелец, 03.09): правильный ответ шёл первым на каждой странице —
  // можно было угадывать, не читая. Тасуем устойчиво (порядок один и тот же
  // при перерисовке), верный ответ помним по исходному индексу 0.
  const raw = loc(page.question.choicesByLocale) || [];
  const choices = shuffleChoices(raw.map((c, i) => ({...c, correct: i === 0})), page.pageId + S.locale);
  const body = loc(page.bodyByLocale).split(/\n\n+/).filter(Boolean);
  const panel = h("div", {class:"panel"}, [
    h("h2", {text:loc(page.titleByLocale)}),
    h("div", {class:"body"}, body.map(p => h("p", {html:tl(p)}))),
    h("div", {class:"question", html:tl(loc(page.question.promptByLocale))}),
    h("div", {class:"opts"}, choices.map((c, i) => h("button", {
      class:"opt" + (S.answered ? (c.correct ? " right" : (S.picked === c.responseId ? " wrong" : " dim")) : ""),
      disabled: S.answered,
      onClick: () => { S.answered = true; S.picked = c.responseId; S.ok = c.correct; render(); },
    }, [document.createTextNode(c.text)]))),
  ]);
  if (S.answered) {
    const auxiliaryEntry = (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId);
    const selectedFeedback = loc(auxiliaryEntry?.responseFeedbackById?.[S.picked]);
    const selectedAnalysis = auxiliaryEntry?.responseAnalysisById?.[S.picked];
    const selectedDiagnostic = auxiliaryEntry?.responseDiagnosticsById?.[S.picked];
    const analysisRequired = Boolean(auxiliaryEntry?.responseAnalysisById);
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(selectedAnalysis);
    const diagnosticRequired = Boolean(auxiliaryEntry?.responseDiagnosticsById);
    const diagnosticComplete = !diagnosticRequired || Boolean(
      selectedDiagnostic?.errorType &&
      loc(selectedDiagnostic.whyTemptingByLocale) &&
      loc(selectedDiagnostic.whyWrongHereByLocale) &&
      loc(selectedDiagnostic.minimalContrastByLocale) &&
      loc(selectedDiagnostic.acceptabilityBoundaryByLocale),
    );
    panel.append(h("div", {
      class:"fb " + (selectedFeedback && analysisComplete && diagnosticComplete ? (S.ok ? "ok" : "no") : "no"),
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      text:selectedFeedback && analysisComplete && diagnosticComplete
        ? selectedFeedback
        : "Проверенный разбор для этого ответа отсутствует.",
    }));
    if (selectedFeedback && analysisComplete && diagnosticComplete && selectedAnalysis) {
      panel.append(renderTextAnalysisV1(selectedAnalysis));
      if (selectedDiagnostic) panel.append(h("div", {
        class:"explanation",
        html:tl(loc(selectedDiagnostic.minimalContrastByLocale)),
      }));
    }
  }
  const selectedAuxiliaryEntry = S.answered
    ? (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId)
    : null;
  const selectedFeedback = loc(selectedAuxiliaryEntry?.responseFeedbackById?.[S.picked]);
  const selectedAnalysisComplete = !selectedAuxiliaryEntry?.responseAnalysisById ||
    completeTextAnalysisV1(selectedAuxiliaryEntry.responseAnalysisById[S.picked]);
  const selectedDiagnostic = selectedAuxiliaryEntry?.responseDiagnosticsById?.[S.picked];
  const selectedDiagnosticComplete = !selectedAuxiliaryEntry?.responseDiagnosticsById || Boolean(
    selectedDiagnostic?.errorType &&
    loc(selectedDiagnostic.whyTemptingByLocale) &&
    loc(selectedDiagnostic.whyWrongHereByLocale) &&
    loc(selectedDiagnostic.minimalContrastByLocale) &&
    loc(selectedDiagnostic.acceptabilityBoundaryByLocale),
  );
  panel.append(nextRow(S.answered && Boolean(selectedFeedback) && selectedAnalysisComplete && selectedDiagnosticComplete));
  return panel;
}

function nextRow(canNext = S.answered, label = "Дальше") {
  return h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:"Назад"}),
    h("button", {class:"btn primary spacer", disabled:!canNext, onClick:() => { S.step++; resetStep(); render(); }, text:label}),
  ]);
}

function renderTask(it) {
  const p = it.modePayload || {};
  const taskNumber = Math.max(1, S.step - 2);
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:"Задание " + taskNumber + " · " + familyName(it.family, p)}),
    h("div", {class:"task-prompt", html:tl(sanitizeLearnerPrompt(it.prompt))}),
  ]);
  if (p.isWordCard) { renderCard(panel, it, p); return panel; }
  const R = {
    listen_choose: renderChoice, context_gap_grammar: renderChoice, sound_contrast: renderChoice,
    phrase_builder: renderBuilder, listen_build_dictation: renderBuilder,
    speed_match: renderPairs, scripted_repeat_compare: renderSpeak,
  }[it.family];
  if (R) R(panel, it, p);
  else { WARNBOX(panel, "Неизвестная механика: " + it.family); }
  return panel;
}
function WARNBOX(panel, msg) { panel.append(h("div", {class:"fb no", text:msg})); panel.append(nextRow(true)); }
const familyName = (f, p) => p?.isWordCard ? "Новое слово" : ({listen_choose:"Послушайте и выберите", context_gap_grammar:"Вставьте слово", sound_contrast:"Различите звуки", phrase_builder:"Соберите фразу", listen_build_dictation:"Послушайте и соберите", speed_match:"Соедините пары", scripted_repeat_compare:"Скажите вслух"})[f] || f;

function completeTextAnalysisV1(analysis) {
  return Boolean(
    analysis && typeof analysis.text === "string" && analysis.text &&
    loc(analysis.meaningByLocale) && loc(analysis.explanationByLocale) &&
    Array.isArray(analysis.units) && analysis.units.length &&
    analysis.units.every((unit) =>
      Number.isInteger(unit?.start) && Number.isInteger(unit?.end) && unit.start >= 0 && unit.end > unit.start &&
      analysis.text.slice(unit.start, unit.end) === unit.text &&
      typeof unit.lemma === "string" && unit.lemma &&
      loc(unit.partOfSpeechLabelByLocale) && loc(unit.meaningByLocale) && loc(unit.functionByLocale)),
  );
}

function renderTextAnalysisV1(analysis) {
  return h("div", {class:"explanation"}, [
    h("div", {class:"target-phrase", text:analysis.text}),
    h("div", {class:"scene-line", html:tl(loc(analysis.meaningByLocale))}),
    h("div", {class:"scene-line", html:tl(loc(analysis.explanationByLocale))}),
    h("div", {class:"explanation-units"}, analysis.units.map((unit) => h("div", {
      class:"scene-line",
      html:tl(unit.text + " — " + loc(unit.partOfSpeechLabelByLocale) + ": " + loc(unit.meaningByLocale) + ". " + loc(unit.functionByLocale)),
    }))),
  ]);
}

function renderCard(panel, it, p) {
  const w = p.wordCard || {};
  panel.append(h("div", {class:"card-word", text:w.word || ""}));
  panel.append(h("button", {class:"play", onClick:() => speak(w.word || "")}, [document.createTextNode("▶  Послушать")]));
  panel.append(h("div", {class:"card-def", style:"margin-top:16px", html:tl(loc(w.definitionByLocale))}));
  S.answered = true;
  panel.append(nextRow(true, "Понятно"));
}

function renderChoice(panel, it, p) {
  if (it.family === "sound_contrast") {
    const contrastAudio = [p.audioA?.transcript, p.audioB?.transcript];
    if (contrastAudio.some(audio => !audio)) return WARNBOX(panel, "У задания на различение звуков нет двух аудиообразцов.");
    panel.append(h("div", {class:"actions sound-contrast-audio"}, contrastAudio.map((audio, index) => h("button", {
      class:"play",
      onClick:() => speak(audio),
      "aria-label":"Прослушать вариант " + (index ? "B" : "A"),
    }, [document.createTextNode("▶  Прослушать " + (index ? "B" : "A"))]))));
  } else {
    const audio = p.referenceAudio?.transcript;
    if (audio) panel.append(h("button", {class:"play", onClick:() => speak(audio)}, [document.createTextNode("▶  Прослушать")]));
  }
  if (p.gappedTargetPhrase) panel.append(h("div", {class:"target-phrase", text:p.gappedTargetPhrase}));
  if (p.localizedScene && loc(p.localizedScene)) panel.append(h("div", {class:"scene-line", html:tl(sanitizeLearnerPrompt(loc(p.localizedScene)))}));
  const opts = shuffleChoices(it.responseOptions, it.interactionId + S.locale);
  if (!opts.length) return WARNBOX(panel, "У задания нет вариантов ответа — сборщик не нашёл их в тексте.");
  const correctId = correctIdOf(it);
  const visibleChoiceText = (option) => {
    if (it.family !== "listen_choose") return option.text;
    const authored = (p.localizedMeaningChoices || []).find(choice => choice.responseId === option.responseId);
    return authored?.meaningByLocale ? (loc(authored.meaningByLocale) || option.text) : option.text;
  };
  panel.append(h("div", {class:"opts", style:"margin-top:16px"}, opts.map(o => h("button", {
    class:"opt" + (S.answered ? (o.responseId === correctId ? " right" : (S.picked === o.responseId ? " wrong" : " dim")) : ""),
    disabled:S.answered,
    onClick:() => { S.answered = true; S.picked = o.responseId; S.ok = o.responseId === correctId; S.ok ? S.right++ : S.wrong++; render(); },
  }, [document.createTextNode(visibleChoiceText(o))]))));
  if (S.answered) {
    const fb = (p.choiceFeedback || []).find(f => f.responseId === S.picked);
    const feedback = loc(fb?.feedbackByLocale);
    const analysisRequired = Boolean(fb && Object.prototype.hasOwnProperty.call(fb, "analysisV1"));
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(fb.analysisV1);
    const feedbackIsComplete = Boolean(
      fb && typeof fb.correct === "boolean" && fb.correct === S.ok && feedback && analysisComplete,
    );
    panel.append(h("div", {
      class:"fb " + (feedbackIsComplete && S.ok ? "ok" : "no"),
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      html: feedbackIsComplete
        ? tl(feedback)
        : "Для выбранного ответа нет проверенного объяснения. Нельзя перейти дальше, пока задание не исправлено.",
    }));
    if (feedbackIsComplete && fb.analysisV1) panel.append(renderTextAnalysisV1(fb.analysisV1));
    panel.append(nextRow(feedbackIsComplete));
    return;
  }
  panel.append(nextRow());
}
function correctIdOf(it) {
  const a = S.session.answers.find(x => x.interactionId === it.interactionId);
  if (a?.correctResponseId) return a.correctResponseId;
  return it.responseOptions[0]?.responseId;
}

function renderBuilder(panel, it, p) {
  const target = p.targetPhrase || p.hiddenTargetPhrase || "";
  const ordered = p.orderedTokens || [];
  const explanationPresent = Object.prototype.hasOwnProperty.call(p, "explanationV1");
  const explanation = p.explanationV1;
  const localized = (value) => Boolean(loc(value));
  const completeExplanation = Boolean(
    explanation && localized(explanation.completionFeedbackByLocale) && completeTextAnalysisV1(explanation.phrase),
  );
  const failClosed = (message) => {
    panel.append(h("div", {class:"fb no", text:message}));
    panel.append(nextRow(false));
  };
  if (explanationPresent && !completeExplanation) {
    failClosed("У задания нет полного авторского объяснения. Нельзя продолжить, пока задание не исправлено.");
    return;
  }
  if (p.referenceAudio?.transcript) panel.append(h("button", {class:"play", onClick:() => speak(p.referenceAudio.transcript)}, [document.createTextNode("▶  Прослушать")]));
  else if (p.localizedMeaning && loc(p.localizedMeaning)) panel.append(h("div", {class:"scene-line", text:loc(p.localizedMeaning)}));
  if (!ordered.length) return WARNBOX(panel, "У задания нет плиток — сборщик не нашёл целевую фразу.");

  const slot = h("div", {class:"slot", "data-hint":"Нажимайте плитки, чтобы собрать фразу"},
    S.assembled.map((tile, i) => h("button", {class:"tile", disabled:S.answered, onClick:() => { S.assembled.splice(i, 1); S.tileFeedback = null; render(); }, text:tile.text})));
  panel.append(h("div", {style:"margin-top:16px"}, [slot]));

  // Tile identity is independent from its visible text: two physical extra
  // tiles may display the same word but require different explanations.
  const feedbackByTileId = new Map((p.slotFeedback || []).map((row) => [row.responseId, row]));
  const all = shuffle([
    ...ordered.map((text, index) => ({ tileId:it.interactionId + ":tile:t" + (index + 1), text, kind:"target" })),
    ...(p.authoredDistractorTokens || []).map((text, index) => ({ tileId:it.interactionId + ":tile:d" + (index + 1), text, kind:"distractor" })),
  ], it.interactionId);
  const used = new Set(S.assembled.map((tile) => tile.tileId));
  panel.append(h("div", {class:"tiles"}, all.map((tile) => {
    const isUsed = used.has(tile.tileId);
    return h("button", {class:"tile" + (isUsed ? " used" : ""), disabled:S.answered || isUsed,
      onClick:() => { S.assembled.push(tile); S.tileFeedback = tile.kind === "distractor" ? feedbackByTileId.get(tile.tileId) || {missing:true} : null; render(); }, text:tile.text});
  })));
  if (S.tileFeedback) {
    const slotFeedback = loc(S.tileFeedback.feedbackByLocale);
    const analysisRequired = Object.prototype.hasOwnProperty.call(S.tileFeedback, "analysisV1");
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(S.tileFeedback.analysisV1);
    panel.append(h("div", {class:"fb no", text:slotFeedback && analysisComplete ? slotFeedback : "Для этой лишней плитки нет полного объяснения."}));
    if (slotFeedback && analysisComplete && S.tileFeedback.analysisV1) panel.append(renderTextAnalysisV1(S.tileFeedback.analysisV1));
  }

  const ready = S.assembled.length === ordered.length;
  if (S.answered) {
    if (completeExplanation) {
      const phrase = explanation.phrase;
      panel.append(h("div", {class:"explanation"}, [
        h("div", {class:"fb " + (S.ok ? "ok" : "no"), html:tl(loc(explanation.completionFeedbackByLocale))}),
        renderTextAnalysisV1(phrase),
      ]));
    } else {
      panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), text: S.ok ? "Верно." : "Правильно: " + target}));
    }
  }
  panel.append(h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:"Назад"}),
    S.answered
      ? h("button", {class:"btn primary spacer", onClick:() => { S.step++; resetStep(); render(); }, text:"Дальше"})
      : h("button", {class:"btn primary spacer", disabled:!ready, onClick:() => {
          const got = S.assembled.map((tile) => tile.text).join(" ").replace(/[.?!]$/, "").toLowerCase();
          const want = ordered.join(" ").replace(/[.?!]$/, "").toLowerCase();
          S.answered = true; S.ok = got === want; S.ok ? S.right++ : S.wrong++; render();
        }, text:"Проверить"}),
  ]));
}

function renderPairs(panel, it, p) {
  const grid = p.pairGrid || [];
  if (!grid.length) return WARNBOX(panel, "Нет пар для соединения.");
  const analysisPresent = grid.some((row) => Object.prototype.hasOwnProperty.call(row, "analysisV1"));
  const localized = (value) => Boolean(loc(value));
  const completeAnalysis = (analysis) => Boolean(
    analysis && typeof analysis.lemma === "string" && analysis.lemma &&
    localized(analysis.partOfSpeechLabelByLocale) && localized(analysis.meaningByLocale) &&
    localized(analysis.functionByLocale) && localized(analysis.matchExplanationByLocale) &&
    (!Object.prototype.hasOwnProperty.call(analysis, "phrase") || completeTextAnalysisV1(analysis.phrase)),
  );
  if (analysisPresent && !grid.every((row) => completeAnalysis(row.analysisV1))) {
    panel.append(h("div", {class:"fb no", text:"У задания нет полного авторского разбора пар. Нельзя продолжить, пока задание не исправлено."}));
    panel.append(nextRow(false));
    return;
  }
  const analysisById = new Map(grid.map((row) => [row.pairId, row.analysisV1]));
  const left = shuffle(grid.map(g => ({id:g.pairId, text:g.target})), it.interactionId + "L");
  const right = avoidAlignedPairs(
    left,
    shuffle(grid.map(g => ({id:g.pairId, text:loc(g.meaningByLocale)})), it.interactionId + "R"),
  );
  const cell = (item, side) => h("button", {
    class:"pair" + (S.pairsDone.includes(item.id) ? " gone" : (S.pairSel?.id === item.id && S.pairSel.side === side ? " sel" : "")),
    disabled:S.pairsDone.includes(item.id),
    onClick:() => {
      if (!S.pairSel) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.side === side) { S.pairSel = {...item, side}; return render(); }
      const selected = S.pairSel;
      const leftItem = side === "L" ? item : selected;
      const rightItem = side === "R" ? item : selected;
      const correct = selected.id === item.id;
      S.pairFeedback = {correct, leftId:leftItem.id, rightId:rightItem.id};
      if (correct) { S.pairsDone.push(item.id); S.right++; } else { S.wrong++; }
      S.pairSel = null;
      if (S.pairsDone.length === grid.length) S.answered = true;
      render();
    }, text:item.text});
  panel.append(h("div", {class:"pairs", style:"margin-top:16px"}, [
    h("div", {style:"display:grid;gap:9px"}, left.map(i => cell(i, "L"))),
    h("div", {style:"display:grid;gap:9px"}, right.map(i => cell(i, "R"))),
  ]));
  if (S.pairFeedback && analysisPresent) {
    const pairIds = S.pairFeedback.correct
      ? [S.pairFeedback.leftId]
      : [S.pairFeedback.leftId, S.pairFeedback.rightId];
    panel.append(h("div", {class:"explanation"}, pairIds.map((pairId) => {
      const analysis = analysisById.get(pairId);
      return h("div", {class:"speed-analysis"}, [
        h("div", {class:"scene-line", html:tl(
          analysis.lemma + " — " + loc(analysis.partOfSpeechLabelByLocale) + ": " +
          loc(analysis.meaningByLocale) + ". " + loc(analysis.functionByLocale) +
          (S.pairFeedback.correct ? " " + loc(analysis.matchExplanationByLocale) : ""),
        )}),
        analysis.phrase ? renderTextAnalysisV1(analysis.phrase) : null,
      ]);
    })));
  }
  if (S.answered) panel.append(h("div", {class:"fb ok", text:"Все пары соединены."}));
  panel.append(nextRow());
}

function renderSpeak(panel, it, p) {
  const phrase = p.targetPhrase || p.referenceAudio?.transcript || "";
  if (!phrase) return WARNBOX(panel, "Нет фразы для произнесения.");
  const analysisPresent = Boolean(p.explanationV1 && Object.prototype.hasOwnProperty.call(p.explanationV1, "phrase"));
  const analysisComplete = !analysisPresent || completeTextAnalysisV1(p.explanationV1.phrase);
  if (!analysisComplete) {
    panel.append(h("div", {class:"fb no", text:"У задания нет полного авторского разбора фразы. Нельзя продолжить, пока задание не исправлено."}));
    panel.append(nextRow(false));
    return;
  }
  panel.append(h("div", {class:"target-phrase", text:phrase}));
  panel.append(h("button", {class:"play", onClick:() => speak(phrase)}, [document.createTextNode("▶  Послушать образец")]));
  panel.append(h("div", {class:"scene-line", style:"margin-top:14px", text:"В приложении здесь запись голоса и сравнение с образцом."}));
  if (analysisPresent) panel.append(renderTextAnalysisV1(p.explanationV1.phrase));
  if (!S.answered) { S.answered = true; }
  panel.append(nextRow(true));
}

function renderDone() {
  homeBtn.hidden = false;
  const s = S.session;
  const learner = learnerForSession(s);
  app.replaceChildren(h("div", {class:"panel"}, [
    h("div", {class:"done-wrap"}, [
      h("div", {class:"done-mark", text:"✓"}),
      h("h2", {text:"Урок пройден"}),
      h("p", {text:s.title}),
      h("div", {class:"stats"}, [
        h("div", {class:"stat"}, [h("b", {text:String(S.right)}), h("span", {text:"верно"})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.wrong)}), h("span", {text:"ошибок"})]),
        h("div", {class:"stat"}, [h("b", {text:String(learner.interactions.length)}), h("span", {text:"заданий"})]),
      ]),
      h("button", {class:"btn primary", onClick:() => { S.session = null; render(); }, text:"К списку уроков"}),
    ]),
  ]));
}

function render() {
  try {
    S.session ? renderSession() : renderHome();
    window.scrollTo({top:0, behavior:"instant"});
  } catch (e) {
    console.error("[mockup] сбой отрисовки:", e);
    app.replaceChildren(h("div", {class:"panel"}, [
      h("h2", {text:"Сбой отрисовки"}),
      h("div", {class:"body", text:String(e && e.message || e)}),
      h("div", {class:"actions"}, [h("button", {class:"btn ghost", onClick:() => { S.session = null; render(); }, text:"К списку"})]),
    ]));
  }
}
render();
