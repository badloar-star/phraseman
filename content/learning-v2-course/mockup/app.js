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
const SESSION_READINESS = JSON.parse(document.getElementById("session-readiness")?.textContent || "{}");
const REVIEWED_CARD_EVIDENCE = JSON.parse(document.getElementById("reviewed-cards")?.textContent || "{}");
const REVIEWED_CARD_EVIDENCE_SCHEMA = "reviewed-card-evidence-v2";
const REVIEWED_CARDS = REVIEWED_CARD_EVIDENCE.schemaVersion === REVIEWED_CARD_EVIDENCE_SCHEMA &&
  REVIEWED_CARD_EVIDENCE.cards && typeof REVIEWED_CARD_EVIDENCE.cards === "object"
  ? REVIEWED_CARD_EVIDENCE.cards
  : {};
const PREVIEW_STATE = JSON.parse(document.getElementById("preview-state")?.textContent || "{}");
const REVIEWED_SOURCE_MARKER = "reviewed_source";
const REVIEWED_CARD_CLASS = "source-fixed";
const REVIEWED_LABEL = "Показана проверенная правка";
const HOME_DESCRIPTION_BY_LOCALE = {"ru":"Открывайте занятия и проверяйте их глазами ученика. Зелёная карточка открывает уже проверенный исправленный текст; если выпуск отстаёт, это прямо отмечено на карточке.","uk":"Відкривайте заняття й перевіряйте їх очима учня. Зелена картка відкриває вже перевірений виправлений текст; якщо випуск відстає, це прямо позначено на картці."};
const LOCALES = ["ru","uk"];
const LOC_NAME = {ru:"Русский",uk:"Українська",es:"Español","pt-BR":"Português",vi:"Tiếng Việt",id:"Bahasa",tr:"Türkçe",pl:"Polski"};
const BUILT_AT = "14.10, 22:38";
// зачем: показать свежесть макета с одного взгляда — владелец час смотрел на старую сборку
const S = { locale: localStorage.getItem("mockup.locale") || "ru", session: null, step: 0, answered: false, ok: null, picked: null, assembled: [], tileFeedback: null, pairSel: null, pairFeedback: null, pairsDone: [], audioAttempt: null, right: 0, wrong: 0, unverified: 0 };
const UI = {
  brandSubtitle:{ru:"Пройти урок",uk:"Пройти урок"}, explanationLanguage:{ru:"Язык объяснений",uk:"Мова пояснень"}, home:{ru:"К списку",uk:"До списку"},
  preparedLessons:{ru:"Пройдите любой подготовленный урок",uk:"Пройдіть будь-який підготовлений урок"}, lesson:{ru:"Урок",uk:"Урок"}, activity:{ru:"Занятие",uk:"Заняття"}, tasks:{ru:"заданий",uk:"завдань"},
  back:{ru:"Назад",uk:"Назад"}, next:{ru:"Дальше",uk:"Далі"}, understood:{ru:"Понятно",uk:"Зрозуміло"}, task:{ru:"Задание",uk:"Завдання"}, check:{ru:"Проверить",uk:"Перевірити"}, retry:{ru:"Попробовать ещё раз",uk:"Спробувати ще раз"},
  newWord:{ru:"Новое слово",uk:"Нове слово"}, listenChoose:{ru:"Послушайте и выберите",uk:"Послухайте й виберіть"}, gap:{ru:"Вставьте слово",uk:"Вставте слово"}, sound:{ru:"Различите звуки",uk:"Розрізніть звуки"}, build:{ru:"Соберите фразу",uk:"Складіть фразу"}, listenBuild:{ru:"Послушайте и соберите",uk:"Послухайте й складіть"}, pairs:{ru:"Соедините пары",uk:"З'єднайте пари"}, speak:{ru:"Скажите вслух",uk:"Скажіть уголос"},
  listen:{ru:"Прослушать",uk:"Прослухати"}, listenSample:{ru:"Прослушать образец",uk:"Прослухати зразок"}, audioSynthetic:{ru:"Звучит синтезированный образец; он не заменяет проверенную запись произношения.",uk:"Звучить синтезований зразок; він не замінює перевірений запис вимови."}, audioFallback:{ru:"Аудио недоступно. Текст для чтения:",uk:"Аудіо недоступне. Текст для читання:"},
  missingExplanation:{ru:"Для выбранного ответа нет проверенного объяснения. Нельзя перейти дальше, пока задание не исправлено.",uk:"Для вибраної відповіді немає перевіреного пояснення. Не можна перейти далі, доки завдання не виправлено."},
  missingTileExplanation:{ru:"Для этой лишней плитки нет полного объяснения.",uk:"Для цієї зайвої плитки немає повного пояснення."}, builderWrong:{ru:"Фраза не совпадает с заданием. Соберите её ещё раз.",uk:"Фраза не збігається із завданням. Складіть її ще раз."}, tileHint:{ru:"Нажимайте плитки, чтобы собрать фразу",uk:"Натискайте плитки, щоб скласти фразу"},
  allPairs:{ru:"Все пары соединены.",uk:"Усі пари з'єднано."}, speakUnavailable:{ru:"Запись голоса и автоматическая проверка сейчас недоступны. Произнесите фразу вслух; результат не будет оценён автоматически.",uk:"Запис голосу й автоматична перевірка зараз недоступні. Вимовте фразу вголос; результат не буде оцінено автоматично."}, markSpoken:{ru:"Я произнёс(ла) фразу",uk:"Я вимовив(ла) фразу"}, unverified:{ru:"Выполнено без автоматической проверки.",uk:"Виконано без автоматичної перевірки."},
  completed:{ru:"Урок пройден",uk:"Урок пройдено"}, correctActions:{ru:"верных действий",uk:"правильних дій"}, errors:{ru:"ошибок",uk:"помилок"}, checkedActions:{ru:"проверено действий",uk:"перевірено дій"}, unverifiedActions:{ru:"без автоматической проверки",uk:"без автоматичної перевірки"}, lessonsList:{ru:"К списку уроков",uk:"До списку уроків"},
  candidateBadge:{ru:"ЧЕРНОВИК · НЕ ПРОВЕРЕНО · НЕ ВЫПУСК",uk:"ЧЕРНЕТКА · НЕ ПЕРЕВІРЕНО · НЕ ВИПУСК"},
  candidateSummary:{ru:"Канонический выпуск не изменён. Это черновой просмотр текущего исходника; его нельзя считать проверенным или выпущенным.",uk:"Канонічний випуск не змінено. Це чернетковий перегляд поточного вихідного тексту; його не можна вважати перевіреним або випущеним."},
  missingIntroExplanation:{ru:"Проверенный разбор для этого ответа отсутствует.",uk:"Перевірений розбір для цієї відповіді відсутній."},
  missingContrastAudio:{ru:"У задания на различение звуков нет двух аудиообразцов.",uk:"У завданні на розрізнення звуків немає двох аудіозразків."},
  missingOptions:{ru:"У задания нет вариантов ответа — сборщик не нашёл их в тексте.",uk:"У завданні немає варіантів відповіді — збирач не знайшов їх у тексті."},
  missingBuilderExplanation:{ru:"У задания нет полного авторского объяснения. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського пояснення. Не можна продовжити, доки завдання не виправлено."},
  missingTiles:{ru:"У задания нет плиток — сборщик не нашёл целевую фразу.",uk:"У завданні немає плиток — збирач не знайшов цільову фразу."},
  missingPairsExplanation:{ru:"У задания нет полного авторского разбора пар. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського розбору пар. Не можна продовжити, доки завдання не виправлено."},
  missingPhraseExplanation:{ru:"У задания нет полного авторского разбора фразы. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського розбору фрази. Не можна продовжити, доки завдання не виправлено."},
  renderFailure:{ru:"Сбой отрисовки",uk:"Помилка відтворення"},
};
const ui = (key) => UI[key]?.[S.locale] ?? UI[key]?.ru ?? key;
function activityCountLabel(count) {
  if (S.locale === "uk") return count + " " + (count === 1 ? "заняття" : count >= 2 && count <= 4 ? "заняття" : "занять");
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? "занятие" :
    mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "занятия" : "занятий";
  return count + " " + noun;
}
function applyUiChrome() {
  document.documentElement.lang = S.locale;
  document.getElementById("brandSubtitle").textContent = ui("brandSubtitle");
  sel.setAttribute("aria-label", ui("explanationLanguage"));
  homeBtn.textContent = ui("home");
  document.getElementById("buildStamp").textContent = activityCountLabel(DATA.length) + " · " + BUILT_AT;
}
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
const activeLocaleValue = (value) => value && typeof value === "object" && !Array.isArray(value) && !("text" in value) && ("ru" in value || "uk" in value)
  ? (value[S.locale] ?? value.ru ?? Object.values(value)[0])
  : value;
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
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = .85;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { console.warn("[mockup] речь недоступна:", e.message); return false; }
};
function audioControl(transcript, labelKey = "listen") {
  const attempted = S.audioAttempt?.transcript === transcript ? S.audioAttempt : null;
  return h("div", {class:"audio-control"}, [
    h("button", {class:"play", onClick:() => { S.audioAttempt = {transcript, available:speak(transcript)}; render(); }}, [document.createTextNode("▶  " + ui(labelKey))]),
    h("div", {class:"scene-line", text:ui("audioSynthetic")}),
    attempted && !attempted.available ? h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("audioFallback") + " " + transcript}) : null,
  ]);
}
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

function resetStep() { S.answered = false; S.ok = null; S.picked = null; S.assembled = []; S.tileFeedback = null; S.pairSel = null; S.pairFeedback = null; S.pairsDone = []; S.audioAttempt = null; }

// ---------- экраны ----------
function renderHome() {
  homeBtn.hidden = true;
  app.replaceChildren(
    h("div", {class:"hero"}, [
      h("h1", {text:ui("preparedLessons")}),
      h("p", {text:loc(HOME_DESCRIPTION_BY_LOCALE)}),
    ]),
    ...groupByLesson(),
  );
}
function freshCardEvidenceText(readiness) {
  return readiness?.ready ? "" : "Пока не собрано подтверждение качества для текущего варианта занятия.";
}
function groupByLesson() {
  const out = [];
  const byLesson = {};
  for (const s of DATA) (byLesson[s.lesson] ??= []).push(s);
  for (const [lesson, list] of Object.entries(byLesson)) {
    const lessonTitle = loc(list[0].lessonTitleByLocale) || list[0].lessonTitle;
    out.push(h("div", {class:"lesson-title", text:ui("lesson") + " " + lesson.replace(/^l0?/, "") + (lessonTitle ? " · " + lessonTitle : "")}));
    out.push(h("div", {class:"cards"}, list.map(s => {
      const findings = SOURCE_QUALITY[s.key] || [];
      const releaseFindings = SOURCE_RELEASE[s.key] || [];
      const readiness = SESSION_READINESS[s.key];
      const isCandidate = s.viewSource === "candidate";
      const sourceFixed = !isCandidate && REVIEWED_CARDS[s.key] === true;
      // A reviewed projection is useful evidence, but it cannot turn the whole
      // card green while the version that would be released still differs.
      const needsRepair = !sourceFixed;
      const numbers = findings.map(item => item.taskNumber).filter(Number.isInteger);
      const hasUnnumberedFinding = findings.some(item => !Number.isInteger(item.taskNumber));
      const findingTarget = hasUnnumberedFinding
        ? (numbers.length ? "вводный текст и задания " + numbers.join(", ") : "вводный текст")
        : "задания " + (numbers.length ? numbers.join(", ") : "без номера");
      const summary = isCandidate
        ? ui("candidateSummary")
        : s.viewSource === REVIEWED_SOURCE_MARKER && s.reviewedProjectionFresh !== true
        ? "Этот вариант пока нельзя отметить зелёным: не подтверждено, что он собран из текущих файлов занятия."
        : findings.length
        ? "Нужно исправить " + findingTarget + ": " + [...new Set(findings.map(item => item.reason))].join("; ")
        : releaseFindings[0]
        || freshCardEvidenceText(readiness);
      return h("button", {class:"card" + (isCandidate ? " needs-repair candidate" : needsRepair ? " needs-repair" : " " + REVIEWED_CARD_CLASS), onClick:() => { S.session = s; S.step = 0; S.right = 0; S.wrong = 0; resetStep(); render(); }}, [
        h("h3", {text:displayTitle(loc(s.titleByLocale) || s.title)}),
        h("p", {class:"scene", text:loc(s.sceneByLocale) || s.scene}),
        h("div", {class:"meta"}, [
          h("span", {class:"chip k", text:ui("activity") + " " + s.session.replace(/^s0?/, "")}),
          h("span", {class:"chip", text:learnerForSession(s).interactions.length + " " + ui("tasks")}),
           isCandidate ? h("span", {class:"chip pending", text:ui("candidateBadge")}) : null,
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
  if (S.answered && !S.ok) {
    const auxiliaryEntry = (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId);
    const selectedFeedback = loc(auxiliaryEntry?.responseFeedbackById?.[S.picked]);
    panel.append(h("div", {
      class:"fb no",
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      text:selectedFeedback || ui("missingIntroExplanation"),
    }));
  }
  const selectedAuxiliaryEntry = S.answered
    ? (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId)
    : null;
  const selectedFeedback = !S.ok
    ? loc(selectedAuxiliaryEntry?.responseFeedbackById?.[S.picked])
    : "";
  panel.append(nextRow(S.answered && (S.ok || Boolean(selectedFeedback))));
  return panel;
}

function nextRow(canNext = S.answered, label = "Дальше") {
  return h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:ui("back")}),
    h("button", {class:"btn primary spacer", disabled:!canNext, onClick:() => { S.step++; resetStep(); render(); }, text:label === "Дальше" ? ui("next") : label}),
  ]);
}

function renderTask(it) {
  const p = it.modePayload || {};
  const taskNumber = Math.max(1, S.step - 2);
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:ui("task") + " " + taskNumber + " · " + familyName(it.family, p)}),
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
const familyName = (f, p) => p?.isWordCard ? ui("newWord") : ({listen_choose:ui("listenChoose"), context_gap_grammar:ui("gap"), sound_contrast:ui("sound"), phrase_builder:ui("build"), listen_build_dictation:ui("listenBuild"), speed_match:ui("pairs"), scripted_repeat_compare:ui("speak")})[f] || f;

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
  panel.append(audioControl(w.word || ""));
  panel.append(h("div", {class:"card-def", style:"margin-top:16px", html:tl(loc(w.definitionByLocale))}));
  S.answered = true;
  panel.append(nextRow(true, ui("understood")));
}

function renderChoice(panel, it, p) {
  if (it.family === "sound_contrast") {
    const contrastAudio = [p.audioA?.transcript, p.audioB?.transcript];
    if (contrastAudio.some(audio => !audio)) return WARNBOX(panel, ui("missingContrastAudio"));
    panel.append(h("div", {class:"actions sound-contrast-audio"}, contrastAudio.map((audio, index) => h("button", {
      class:"play",
      onClick:() => speak(audio),
      "aria-label":"Прослушать вариант " + (index ? "B" : "A"),
    }, [document.createTextNode("▶  " + ui("listen") + " " + (index ? "B" : "A"))]))));
  } else {
    const audio = p.referenceAudio?.transcript;
    if (audio) panel.append(audioControl(audio));
  }
  if (p.gappedTargetPhrase) panel.append(h("div", {class:"target-phrase", text:p.gappedTargetPhrase}));
  if (p.localizedScene && loc(p.localizedScene)) panel.append(h("div", {class:"scene-line", html:tl(sanitizeLearnerPrompt(loc(p.localizedScene)))}));
  const opts = shuffleChoices(it.responseOptions, it.interactionId + S.locale);
  if (!opts.length) return WARNBOX(panel, ui("missingOptions"));
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
    if (S.ok) {
      panel.append(nextRow(true));
      return;
    }
    const fb = (p.choiceFeedback || []).find(f => f.responseId === S.picked);
    const feedback = loc(fb?.feedbackByLocale);
    const feedbackIsComplete = Boolean(
      fb && fb.correct === false && feedback,
    );
    panel.append(h("div", {
      class:"fb " + (feedbackIsComplete && S.ok ? "ok" : "no"),
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      html: feedbackIsComplete
        ? tl(feedback)
        : ui("missingExplanation"),
    }));
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
    failClosed(ui("missingBuilderExplanation"));
    return;
  }
  if (p.referenceAudio?.transcript) panel.append(audioControl(p.referenceAudio.transcript));
  else if (p.localizedMeaning && loc(p.localizedMeaning)) panel.append(h("div", {class:"scene-line", text:loc(p.localizedMeaning)}));
  if (!ordered.length) return WARNBOX(panel, ui("missingTiles"));

  const slot = h("div", {class:"slot", "data-hint":ui("tileHint")},
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
    panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:slotFeedback || ui("missingTileExplanation")}));
  }

  const ready = S.assembled.length === ordered.length;
  if (S.answered) {
    if (!S.ok) {
      panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("builderWrong")}));
    }
  }
  panel.append(h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:ui("back")}),
    S.answered
      ? (S.ok
        ? h("button", {class:"btn primary spacer", onClick:() => { S.step++; resetStep(); render(); }, text:ui("next")})
        : h("button", {class:"btn primary spacer", onClick:() => { S.answered = false; S.ok = null; S.assembled = []; S.tileFeedback = null; render(); }, text:ui("retry")}))
      : h("button", {class:"btn primary spacer", disabled:!ready, onClick:() => {
          const got = S.assembled.map((tile) => tile.text).join(" ").replace(/[.?!]$/, "").toLowerCase();
          const want = ordered.join(" ").replace(/[.?!]$/, "").toLowerCase();
          S.answered = true; S.ok = got === want; S.ok ? S.right++ : S.wrong++; render();
        }, text:ui("check")}),
  ]));
}

function renderPairs(panel, it, p) {
  const grid = p.pairGrid || [];
  if (!grid.length) return WARNBOX(panel, "Нет пар для соединения.");
  const mismatchFeedback = (feedback) => {
    const leftPair = grid.find((row) => row.pairId === feedback.leftId);
    const rightPair = grid.find((row) => row.pairId === feedback.rightId);
    const leftMeaning = loc(leftPair?.meaningByLocale);
    if (!leftPair?.target || !rightPair?.target || !leftMeaning) {
      return loc({
        ru: "Эта пара не подходит. Попробуйте другой вариант.",
        uk: "Ця пара не підходить. Спробуйте інший варіант.",
      });
    }
    return loc({
      ru: "Правильная пара: «" + leftPair.target + "» — «" + leftMeaning + "».",
      uk: "Правильна пара: «" + leftPair.target + "» — «" + leftMeaning + "».",
    });
  };
  const analysisPresent = grid.some((row) => Object.prototype.hasOwnProperty.call(row, "analysisV1"));
  const localized = (value) => Boolean(loc(value));
  const completeAnalysis = (analysis) => Boolean(
    analysis && typeof analysis.lemma === "string" && analysis.lemma &&
    localized(analysis.partOfSpeechLabelByLocale) && localized(analysis.meaningByLocale) &&
    localized(analysis.functionByLocale) && localized(analysis.matchExplanationByLocale) &&
    (!Object.prototype.hasOwnProperty.call(analysis, "phrase") || completeTextAnalysisV1(analysis.phrase)),
  );
  if (analysisPresent && !grid.every((row) => completeAnalysis(row.analysisV1))) {
    panel.append(h("div", {class:"fb no", text:ui("missingPairsExplanation")}));
    panel.append(nextRow(false));
    return;
  }
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
  if (S.pairFeedback && !S.pairFeedback.correct) {
    panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:mismatchFeedback(S.pairFeedback)}));
  }
  panel.append(nextRow());
}

function renderSpeak(panel, it, p) {
  const phrase = p.targetPhrase || p.referenceAudio?.transcript || "";
  if (!phrase) return WARNBOX(panel, "Нет фразы для произнесения.");
  const analysisPresent = Boolean(p.explanationV1 && Object.prototype.hasOwnProperty.call(p.explanationV1, "phrase"));
  const analysisComplete = !analysisPresent || completeTextAnalysisV1(p.explanationV1.phrase);
  if (!analysisComplete) {
    panel.append(h("div", {class:"fb no", text:ui("missingPhraseExplanation")}));
    panel.append(nextRow(false));
    return;
  }
  panel.append(h("div", {class:"target-phrase", text:phrase}));
  panel.append(audioControl(phrase, "listenSample"));
  panel.append(h("div", {class:"scene-line", style:"margin-top:14px", text:ui("speakUnavailable")}));
  if (analysisPresent) panel.append(renderTextAnalysisV1(p.explanationV1.phrase));
  if (S.answered) {
    panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("unverified")}));
  } else {
    panel.append(h("button", {class:"btn primary", onClick:() => { S.answered = true; S.ok = null; S.unverified++; render(); }, text:ui("markSpoken")}));
  }
  panel.append(nextRow(S.answered));
}

function renderDone() {
  homeBtn.hidden = false;
  const s = S.session;
  const checkedActions = S.right + S.wrong;
  app.replaceChildren(h("div", {class:"panel"}, [
    h("div", {class:"done-wrap"}, [
      h("div", {class:"done-mark", text:"✓"}),
      h("h2", {text:ui("completed")}),
      h("p", {text:loc(s.titleByLocale) || s.title}),
      h("div", {class:"stats"}, [
        h("div", {class:"stat"}, [h("b", {text:String(S.right)}), h("span", {text:ui("correctActions")})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.wrong)}), h("span", {text:ui("errors")})]),
        h("div", {class:"stat"}, [h("b", {text:String(checkedActions)}), h("span", {text:ui("checkedActions")})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.unverified)}), h("span", {text:ui("unverifiedActions")})]),
      ]),
      h("button", {class:"btn primary", onClick:() => { S.session = null; render(); }, text:ui("lessonsList")}),
    ]),
  ]));
}

function render() {
  try {
    applyUiChrome();
    S.session ? renderSession() : renderHome();
    window.scrollTo({top:0, behavior:"instant"});
  } catch (e) {
    console.error("[mockup] сбой отрисовки:", e);
    app.replaceChildren(h("div", {class:"panel"}, [
      h("h2", {text:ui("renderFailure")}),
      h("div", {class:"body", text:String(e && e.message || e)}),
      h("div", {class:"actions"}, [h("button", {class:"btn ghost", onClick:() => { S.session = null; render(); }, text:ui("home")})]),
    ]));
  }
}
render();
