// зачем: макет открывали и видели пустой экран без единой ошибки в консоли.
// Любой сбой запуска обязан быть виден НА СТРАНИЦЕ, а не только в консоли.
window.addEventListener("error", (e) => {
  const box = document.getElementById("boot-msg");
  if (box) box.textContent = "Ошибка: " + (e.message || e.error?.message || "неизвестная") + " · " + (e.filename || "") + ":" + (e.lineno || "?");
  console.error("[mockup] ошибка запуска:", e.message, e.error);
});
const DATA = window.__DATA__;
const LOCALES = ["ru","uk"];
const LOC_NAME = {ru:"Русский",uk:"Українська",es:"Español","pt-BR":"Português",vi:"Tiếng Việt",id:"Bahasa",tr:"Türkçe",pl:"Polski"};
const BUILT_AT = "07.09, 18:58";
// зачем: показать свежесть макета с одного взгляда — владелец час смотрел на старую сборку
document.getElementById("buildStamp").textContent = DATA.length + " сессий · " + BUILT_AT;

const S = { locale: localStorage.getItem("mockup.locale") || "ru", session: null, step: 0, answered: false, ok: null, picked: null, assembled: [], pairSel: null, pairsDone: [], right: 0, wrong: 0 };

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

function resetStep() { S.answered = false; S.ok = null; S.picked = null; S.assembled = []; S.pairSel = null; S.pairsDone = []; }

// ---------- экраны ----------
function renderHome() {
  homeBtn.hidden = true;
  app.replaceChildren(
    h("div", {class:"hero"}, [
      h("h1", {text:"Пройдите любую написанную сессию"}),
      h("p", {text:"Это то, что увидит ученик. Данные взяты из собранного релиза — что здесь работает, то откроется и в приложении."}),
    ]),
    ...groupByLesson(),
  );
}
function groupByLesson() {
  const out = [];
  const byLesson = {};
  for (const s of DATA) (byLesson[s.lesson] ??= []).push(s);
  for (const [lesson, list] of Object.entries(byLesson)) {
    out.push(h("div", {class:"lesson-title", text:"Урок " + lesson.replace(/^l0?/, "")}));
    out.push(h("div", {class:"cards"}, list.map(s => h("button", {class:"card", onClick:() => { S.session = s; S.step = 0; S.right = 0; S.wrong = 0; resetStep(); render(); }}, [
      h("h3", {text:s.title}),
      h("p", {class:"scene", text:s.scene}),
      h("div", {class:"meta"}, [
        h("span", {class:"chip k", text:"Сессия " + s.session.replace(/^s0?/, "")}),
        h("span", {class:"chip", text:s.learner.interactions.length + " заданий"}),
      ]),
    ]))));
  }
  return out;
}

function renderSession() {
  homeBtn.hidden = false;
  const s = S.session;
  const total = 3 + s.learner.interactions.length;
  if (S.step >= total) return renderDone();

  const bar = h("div", {class:"progress"}, Array.from({length:total}, (_, i) =>
    h("i", {class: i < S.step ? "done" : i === S.step ? "now" : ""})));

  const panel = S.step < 3 ? renderIntro(s.intro.pages[S.step]) : renderTask(s.learner.interactions[S.step - 3]);
  app.replaceChildren(bar, panel);
}

function renderIntro(page) {
  const KIND = {concept:"Понятие", formula:"Формула", trap:"Ловушка", tip:"Подсказка", example:"Пример"};
  // зачем (владелец, 03.09): правильный ответ шёл первым на каждой странице —
  // можно было угадывать, не читая. Тасуем устойчиво (порядок один и тот же
  // при перерисовке), верный ответ помним по исходному индексу 0.
  const raw = loc(page.question.choicesByLocale) || [];
  const choices = shuffle(raw.map((c, i) => ({...c, correct: i === 0})), page.pageId + S.locale);
  const body = loc(page.bodyByLocale).split(/\n\n+/).filter(Boolean);
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:KIND[page.kind] || page.kind}),
    h("h2", {text:loc(page.titleByLocale)}),
    h("div", {class:"body"}, body.map(p => h("p", {html:tl(p)}))),
    h("div", {class:"question", html:tl(loc(page.question.promptByLocale))}),
    h("div", {class:"opts"}, choices.map((c, i) => h("button", {
      class:"opt" + (S.answered ? (c.correct ? " right" : (S.picked === i ? " wrong" : " dim")) : ""),
      disabled: S.answered,
      onClick: () => { S.answered = true; S.picked = i; S.ok = c.correct; render(); },
    }, [document.createTextNode(c.text)]))),
  ]);
  if (S.answered) panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), text: S.ok ? "Верно." : "Верный ответ: " + (choices.find(c => c.correct)?.text ?? "")}));
  panel.append(nextRow());
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
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:familyName(it.family, p)}),
    h("div", {class:"task-prompt", html:tl(it.prompt)}),
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

function renderCard(panel, it, p) {
  const w = p.wordCard || {};
  panel.append(h("div", {class:"card-word", text:w.word || ""}));
  panel.append(h("button", {class:"play", onClick:() => speak(w.word || "")}, [document.createTextNode("▶  Послушать")]));
  panel.append(h("div", {class:"card-def", style:"margin-top:16px", html:tl(loc(w.definitionByLocale))}));
  S.answered = true;
  panel.append(nextRow(true, "Понятно"));
}

function renderChoice(panel, it, p) {
  const audio = p.referenceAudio?.transcript;
  if (audio) panel.append(h("button", {class:"play", onClick:() => speak(audio)}, [document.createTextNode("▶  Прослушать")]));
  if (p.gappedTargetPhrase) panel.append(h("div", {class:"target-phrase", text:p.gappedTargetPhrase}));
  if (p.localizedScene && loc(p.localizedScene)) panel.append(h("div", {class:"scene-line", html:tl(loc(p.localizedScene))}));
  const opts = it.responseOptions;
  if (!opts.length) return WARNBOX(panel, "У задания нет вариантов ответа — сборщик не нашёл их в тексте.");
  const correctId = correctIdOf(it);
  panel.append(h("div", {class:"opts", style:"margin-top:16px"}, opts.map(o => h("button", {
    class:"opt" + (S.answered ? (o.responseId === correctId ? " right" : (S.picked === o.responseId ? " wrong" : " dim")) : ""),
    disabled:S.answered,
    onClick:() => { S.answered = true; S.picked = o.responseId; S.ok = o.responseId === correctId; S.ok ? S.right++ : S.wrong++; render(); },
  }, [document.createTextNode(o.text)]))));
  if (S.answered) {
    const fb = (p.choiceFeedback || []).find(f => f.responseId === S.picked);
    panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), html: S.ok ? "Верно." : tl(loc(fb?.feedbackByLocale) || "Неверно.")}));
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
  if (p.referenceAudio?.transcript) panel.append(h("button", {class:"play", onClick:() => speak(p.referenceAudio.transcript)}, [document.createTextNode("▶  Прослушать")]));
  else if (p.localizedMeaning && loc(p.localizedMeaning)) panel.append(h("div", {class:"scene-line", text:loc(p.localizedMeaning)}));
  if (!ordered.length) return WARNBOX(panel, "У задания нет плиток — сборщик не нашёл целевую фразу.");

  const slot = h("div", {class:"slot", "data-hint":"Нажимайте плитки, чтобы собрать фразу"},
    S.assembled.map((t, i) => h("button", {class:"tile", disabled:S.answered, onClick:() => { S.assembled.splice(i, 1); render(); }, text:t})));
  panel.append(h("div", {style:"margin-top:16px"}, [slot]));

  const all = shuffle(ordered.concat(p.authoredDistractorTokens || []), it.interactionId);
  const used = S.assembled.slice();
  panel.append(h("div", {class:"tiles"}, all.map((t, i) => {
    const idx = used.indexOf(t);
    const isUsed = idx >= 0 && (used[idx] = null, true);
    return h("button", {class:"tile" + (isUsed ? " used" : ""), disabled:S.answered || isUsed,
      onClick:() => { S.assembled.push(t); render(); }, text:t});
  })));

  const ready = S.assembled.length === ordered.length;
  if (S.answered) panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), text: S.ok ? "Верно." : "Правильно: " + target}));
  panel.append(h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:"Назад"}),
    S.answered
      ? h("button", {class:"btn primary spacer", onClick:() => { S.step++; resetStep(); render(); }, text:"Дальше"})
      : h("button", {class:"btn primary spacer", disabled:!ready, onClick:() => {
          const got = S.assembled.join(" ").replace(/[.?!]$/, "").toLowerCase();
          const want = ordered.join(" ").replace(/[.?!]$/, "").toLowerCase();
          S.answered = true; S.ok = got === want; S.ok ? S.right++ : S.wrong++; render();
        }, text:"Проверить"}),
  ]));
}

function renderPairs(panel, it, p) {
  const grid = p.pairGrid || [];
  if (!grid.length) return WARNBOX(panel, "Нет пар для соединения.");
  const left = shuffle(grid.map(g => ({id:g.pairId, text:g.target})), it.interactionId + "L");
  const right = shuffle(grid.map(g => ({id:g.pairId, text:loc(g.meaningByLocale)})), it.interactionId + "R");
  const cell = (item, side) => h("button", {
    class:"pair" + (S.pairsDone.includes(item.id) ? " gone" : (S.pairSel?.id === item.id && S.pairSel.side === side ? " sel" : "")),
    disabled:S.pairsDone.includes(item.id),
    onClick:() => {
      if (!S.pairSel) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.side === side) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.id === item.id) { S.pairsDone.push(item.id); S.right++; } else { S.wrong++; }
      S.pairSel = null;
      if (S.pairsDone.length === grid.length) S.answered = true;
      render();
    }, text:item.text});
  panel.append(h("div", {class:"pairs", style:"margin-top:16px"}, [
    h("div", {style:"display:grid;gap:9px"}, left.map(i => cell(i, "L"))),
    h("div", {style:"display:grid;gap:9px"}, right.map(i => cell(i, "R"))),
  ]));
  if (S.answered) panel.append(h("div", {class:"fb ok", text:"Все пары соединены."}));
  panel.append(nextRow());
}

function renderSpeak(panel, it, p) {
  const phrase = p.targetPhrase || p.referenceAudio?.transcript || "";
  if (!phrase) return WARNBOX(panel, "Нет фразы для произнесения.");
  panel.append(h("div", {class:"target-phrase", text:phrase}));
  panel.append(h("button", {class:"play", onClick:() => speak(phrase)}, [document.createTextNode("▶  Послушать образец")]));
  panel.append(h("div", {class:"scene-line", style:"margin-top:14px", text:"В приложении здесь запись голоса и сравнение с образцом."}));
  if (!S.answered) { S.answered = true; }
  panel.append(nextRow(true));
}

function renderDone() {
  homeBtn.hidden = false;
  const s = S.session;
  app.replaceChildren(h("div", {class:"panel"}, [
    h("div", {class:"done-wrap"}, [
      h("div", {class:"done-mark", text:"✓"}),
      h("h2", {text:"Сессия пройдена"}),
      h("p", {text:s.title}),
      h("div", {class:"stats"}, [
        h("div", {class:"stat"}, [h("b", {text:String(S.right)}), h("span", {text:"верно"})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.wrong)}), h("span", {text:"ошибок"})]),
        h("div", {class:"stat"}, [h("b", {text:String(s.learner.interactions.length)}), h("span", {text:"заданий"})]),
      ]),
      h("button", {class:"btn primary", onClick:() => { S.session = null; render(); }, text:"К списку сессий"}),
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
