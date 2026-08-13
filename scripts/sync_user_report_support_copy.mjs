import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT_PATH = path.join(
  ROOT,
  "docs",
  "reports",
  "user_error_reports_audit_2026-07-10.json",
);
const AUDIT_MARKDOWN_PATH = path.join(
  ROOT,
  "docs",
  "reports",
  "user_error_reports_audit_2026-07-10.md",
);
const BATCH_PATH = path.join(ROOT, "replies_batch_2026-07-10.json");
const FINAL_BATCH_PATH = path.join(ROOT, "replies_batch_2026-07-10_final.json");
// зачем: admin/index.html — замороженный редирект-заглушка (AGENTS.md), живая админка
// с PREPARED_REPORT_REPLIES это admin/legacy.html — иначе сгенерированные черновики
// уходят в мёртвый файл и не появляются в реальной админке.
const ADMIN_PATH = path.join(ROOT, "admin", "legacy.html");
const CHECK_ONLY = process.argv.includes("--check");

const FINAL_AUDIT_BY_REPORT_NO = {
  3: {
    verdict: "confirmed_fixed",
    title: "Исправлено открытие клавиатуры в персональном плане",
    evidence:
      "Recall route renders a TextInput for the reported fallback item, but it did not request focus on entry. The input now uses autoFocus, and the focused UI contract confirms the recall renderer keeps it.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary:
      "поле ответа теперь сразу получает фокус и открывает клавиатуру",
  },
  4: {
    verdict: "confirmed_fixed",
    title: "Исправлено зависание после ввода ответа",
    evidence:
      "The current typed-submit path blurs the input and calls Keyboard.dismiss() before answer checking, so the hidden field no longer retains focus on the result screen. Focused lesson input contracts pass.",
    action:
      "Исправление уже находится в текущем JS-коде; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary: "поле ответа больше не удерживает фокус после отправки",
  },
  6: {
    verdict: "confirmed_fixed",
    title: "Исправлена пропадающая озвучка результата",
    evidence:
      "The Android audio lifecycle now tracks live players, disposes every player, waits for real loaded/playing state, detects idle playback and uses watchdog/TTS fallback. Focused lifecycle and replay contracts pass.",
    action:
      "Исправление уже находится в текущем JS-коде; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary:
      "озвучка результата больше не должна пропадать после нескольких фраз",
  },
  7: {
    verdict: "confirmed_fixed",
    title: "Исправлен переход после записи ответа",
    evidence:
      "The fallback recognizer could enter scoring after stop and remain there forever when native emitted no result/end/error event. A bounded settlement now reuses the existing finish timer and completes the attempt deterministically.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary:
      "попытка распознавания завершается даже без финального события устройства",
  },
  15: {
    verdict: "confirmed_fixed",
    title: "Исправлено зависание распознавания ответа",
    evidence:
      "Gavan day 6 uses the same pronunciation renderer and fallback recognizer. The new bounded stop settlement prevents the scoring state from hanging when native recognition stops without a terminal event; focused tests pass.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary:
      "распознавание больше не остаётся бесконечно в состоянии проверки",
  },
  21: {
    verdict: "confirmed_fixed",
    title: "Добавлено предварительное введение слова mural",
    evidence:
      "Before the change, lesson31_phrase_38 trained mural but the lesson intro did not display it. The existing order-2 vocabulary intro now includes the multilingual example that massive mural before phrase order 38; alignment test passes.",
    action:
      "Контентное исправление готово в JS-клиенте; доставка требует разрешённого OTA. Награда 0 по утверждённой таблице.",
    publicSummary:
      "слово mural теперь показывается в обучающей части до упражнения",
  },
  22: {
    verdict: "confirmed_fixed",
    title: "Исправлено объяснение неправильного ответа без сети",
    evidence:
      "Offline and automatic AI failures previously changed AiMistakeCard state to hidden. They now use the error state, where a deterministic local fallback keeps the user answer and correct answer visible; focused contract passes.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary:
      "разбор ошибки остаётся видимым без сети и при недоступном сервисе",
  },
  23: {
    verdict: "confirmed_fixed",
    title: "Исправлен запуск готового аудио в уроке 31",
    evidence:
      "Exact phrase clips were looked up by pronunciation-only spokenText, so an existing clip could be missed. Clip lookup and playback now use normalized visible text; pronunciation override remains only for system TTS. Focused audio contract passes.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.",
    publicSummary: "готовая запись теперь ищется по видимому тексту фразы",
  },
  33: {
    verdict: "not_reproduced",
    title: "Проверен порядок введения слова complex",
    evidence:
      "Current lesson 31 intro order 2 visibly contains that complex flight procedure before lesson31_phrase_2 at phrase order 2. The regression evidence passed before production changes, so the reported sequencing defect is not present in current content.",
    action:
      "Изменение не требуется. Сохранить утверждённую награду 1 shard за внимательный сигнал.",
    publicSummary: "слово complex уже введено в обучающей части до проверки",
  },
  37: {
    verdict: "confirmed_fixed",
    title: "Исправлено отображение длинных ответов на небольших экранах",
    evidence:
      "Answer font size previously ignored screen width and text length. Typed, assembled and result answers now reduce only for long text on screens up to 399 px; accepted variants and submit behavior are unchanged. Focused layout tests pass.",
    action:
      "Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Награда 0 по утверждённой таблице.",
    publicSummary:
      "длинные варианты ответа теперь помещаются на небольших экранах",
  },
};

const SUPPORT_COPY_BY_REPORT_NO = {
  1: [
    "Спасибо за сообщение о повторении речи",
    "Спасибо, что написали нам. Мы уже разбираемся, почему упражнение на повторение речи иногда не переходит дальше после ответа. Ваше сообщение помогло нам точнее проверить этот сценарий.",
  ],
  2: [
    "Спасибо за сообщение о поле ответа",
    "Спасибо, что рассказали о проблеме с полем ответа. Мы проверяем, почему в этом задании клавиатура иногда не открывается. Ваше описание помогло нам уточнить условия, при которых это происходит.",
  ],
  3: [
    "Исправили открытие клавиатуры в плане",
    "Спасибо, что подробно описали проблему. Мы исправили поле ответа в персональном плане: теперь при переходе к заданию оно сразу получает фокус и открывает клавиатуру. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  4: [
    "Исправили зависание после ввода ответа",
    "Спасибо, что сообщили о зависании после ввода ответа. Мы проверили этот сценарий: после отправки ответа поле теперь освобождает фокус и не удерживает экран проверки. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  5: [
    "Исправили состояние кнопки проверки",
    "Спасибо, что обратили наше внимание на кнопку проверки. Теперь она становится доступной только после того, как фраза полностью собрана. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  6: [
    "Исправили пропадающую озвучку результата",
    "Спасибо, что рассказали о пропадающей озвучке. Мы исправили управление аудиоплеером между заданиями, чтобы озвучка результата не прекращалась после нескольких фраз. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  7: [
    "Исправили переход после записи ответа",
    "Спасибо за подробное описание. Мы нашли состояние, в котором распознавание могло не завершиться и оставить упражнение без перехода дальше. Теперь попытка завершается даже тогда, когда устройство не присылает финальное событие. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  8: [
    "Спасибо за сообщение о записи ответа",
    "Спасибо, что написали нам. Мы уже проверяем, почему запись ответа иногда не запускается в этом упражнении. Ваше сообщение помогло нам точнее восстановить последовательность действий.",
  ],
  9: [
    "Исправили фразу о дне рождения",
    "Спасибо, что обратили внимание на формулировку. Мы заменили неестественный вариант фразы о дне рождения на более естественный. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  10: [
    "Добавили понятную инструкцию к заданию",
    "Спасибо, что заметили нехватку пояснения. Мы добавили явную инструкцию перед фразой, чтобы сразу было понятно, что нужно сделать. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  11: [
    "Проверили варианты Can и May",
    "Спасибо за вопрос. В этом задании Can I ask a question? — корректный и естественный вариант. May I ask a question? тоже возможен, но звучит заметно формальнее, поэтому менять упражнение не требуется.",
  ],
  12: [
    "Спасибо за сообщение о формулировке задания",
    "Спасибо, что написали нам о непонятных словах в условии. Мы проверяем формулировку задания и учитываем Ваш комментарий при его доработке.",
  ],
  13: [
    "Спасибо за сообщение о записи ответа",
    "Спасибо, что рассказали о проблеме с записью. Мы проверяем, почему она иногда не запускается в этом упражнении. Ваше описание помогло нам уточнить сценарий.",
  ],
  14: [
    "Проверили английскую озвучку карточек",
    "Спасибо, что написали нам. Мы проверили английскую озвучку карточек в текущей версии и не нашли пропущенных аудиофайлов. Если звук снова исчезнет, пожалуйста, укажите карточку и момент, когда это произошло, — это поможет проверить конкретный случай.",
  ],
  15: [
    "Исправили зависание распознавания ответа",
    "Спасибо, что подробно описали ситуацию. Мы исправили случай, когда распознавание прекращалось без результата и экран оставался в состоянии проверки. Теперь такая попытка корректно завершается, и упражнение можно продолжить. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  16: [
    "Исправили заглавную букву на первой плитке",
    "Спасибо, что обратили внимание на первую плитку. Мы исправили лишнюю заглавную букву, и изменение появится в следующем обновлении приложения.",
  ],
  17: [
    "Исправили перемешивание слов в тренере",
    "Спасибо, что заметили неправильный порядок слов. Теперь плитки перемешиваются перед началом задания и не остаются в готовой последовательности. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  18: [
    "Уточнили вопрос уровня A1",
    "Спасибо, что обратили внимание на двусмысленность. Мы изменили формулировку вопроса, чтобы у него оставался один понятный смысл. Обновление появится в следующей версии приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  19: [
    "Проверили отображение фразы в уроке 16",
    "Спасибо, что написали нам. Мы проверили эту фразу в текущей версии урока 16: сейчас она отображается полностью. Если часть текста снова пропадёт, пожалуйста, пришлите снимок экрана — мы проверим конкретный размер устройства.",
  ],
  20: [
    "Проверили форму work в предложении",
    "Спасибо за вопрос. В этой конструкции используется базовая форма work, поэтому вариант worked здесь не подходит. Текущий ответ в задании оставляем без изменений.",
  ],
  21: [
    "Добавили слово mural в обучающую часть",
    "Спасибо, что обратили внимание на порядок материала. Вы были правы: слово mural появлялось в упражнении без предварительного примера. Мы добавили его в обучающую часть до проверки. Изменение появится в следующем обновлении приложения.",
  ],
  22: [
    "Исправили объяснение неправильного ответа",
    "Спасибо, что сообщили о пропадающем объяснении. Мы исправили этот случай: если сервис объяснений недоступен или устройство находится без интернета, карточка больше не исчезает и показывает понятное сравнение Вашего ответа с правильным. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  23: [
    "Исправили озвучку ответа в уроке 31",
    "Спасибо, что сообщили об отсутствии звука. Аудиофайл у фразы был, но приложение могло искать его по изменённому тексту произношения и пропускать готовую запись. Теперь поиск выполняется по самой фразе. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  24: [
    "Исправили произношение слова read",
    "Спасибо, что заметили неправильное звучание. Мы добавили подходящее произношение слова read для этого контекста. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  25: [
    "Исправили первую плитку в тренере",
    "Спасибо, что обратили внимание на первую плитку. Мы убрали лишнюю заглавную букву, и исправление появится в следующем обновлении приложения.",
  ],
  26: [
    "Исправили первую плитку в тренере",
    "Спасибо, что написали нам о заглавной букве. Первая плитка теперь показывается в правильном регистре. Изменение появится в следующем обновлении приложения.",
  ],
  27: [
    "Исправили регистр первой плитки",
    "Спасибо, что заметили эту неточность. Мы исправили регистр первой плитки, и обновлённый вариант появится в следующей версии приложения.",
  ],
  28: [
    "Исправили заглавную букву на плитке",
    "Спасибо, что сообщили о первой плитке. Мы убрали лишнюю заглавную букву. Исправление появится в следующем обновлении приложения.",
  ],
  29: [
    "Проверили фразу that ancient map",
    "Спасибо за вопрос. В этой фразе that ancient map обозначает конкретную карту, о которой идёт речь, поэтому указательное слово выбрано намеренно. Текущий вариант соответствует смыслу задания.",
  ],
  30: [
    "Проверили the problem и this problem",
    "Спасибо за вопрос. Оба варианта возможны, но используются в разных ситуациях. В текущем задании выбран вариант, который точнее соответствует русской фразе, поэтому менять ответ не требуется.",
  ],
  31: [
    "Исправили замену ежедневного задания",
    "Спасибо, что сообщили о списании осколков. Мы исправили замену ежедневного задания: теперь осколки не списываются, если новое задание нельзя корректно выдать. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 2 осколка.",
  ],
  32: [
    "Исправили перевод фразы",
    "Спасибо, что заметили неточность в переводе. Мы добавили недостающее указательное слово, чтобы русский вариант точно передавал смысл английской фразы. Обновление появится в следующей версии приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  33: [
    "Проверили порядок введения слова complex",
    "Спасибо, что обратили внимание на порядок новых слов. Мы внимательно проверили урок 31: слово complex уже показано в обучающем примере до второго задания, поэтому порядок материала здесь корректный. В благодарность за внимательность мы начислили Вам 1 осколок.",
  ],
  34: [
    "Проверили указательное слово в переводе",
    "Спасибо за вопрос. Мы сверили английскую фразу и перевод: указательное слово в текущем варианте передаёт исходный смысл корректно. Изменения не требуются.",
  ],
  35: [
    "Проверили перевод фразы",
    "Спасибо, что обратили внимание на указательное слово. Мы ещё раз сверили перевод с английским оригиналом и подтвердили, что текущий вариант соответствует контексту.",
  ],
  36: [
    "Нужно немного больше деталей",
    "Спасибо, что написали нам. В сообщении недостаточно деталей, чтобы понять, что именно произошло. Если проблема повторится, пожалуйста, укажите экран и действие перед её появлением — мы обязательно проверим.",
  ],
  37: [
    "Исправили длинные ответы на небольших экранах",
    "Спасибо, что обратили внимание на отображение длинных вариантов. Мы скорректировали размер текста для длинных ответов на небольших экранах, чтобы варианты помещались и оставались читаемыми. Изменение появится в следующем обновлении приложения.",
  ],
  38: [
    "Исправили первую плитку в тренере",
    "Спасибо, что сообщили о лишней заглавной букве. Мы исправили первую плитку, и обновлённый вариант появится в следующей версии приложения.",
  ],
  39: [
    "Исправили регистр первой плитки",
    "Спасибо, что обратили внимание на первую плитку. Теперь она отображается без лишней заглавной буквы. Исправление появится в следующем обновлении приложения.",
  ],
  40: [
    "Исправили искажённый перевод",
    "Спасибо, что заметили повреждённые символы в переводе. Мы исправили распознавание такого текста, чтобы тренер показывал нормальную фразу. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  41: [
    "Исправили первую плитку тренера",
    "Спасибо, что сообщили о лишней заглавной букве. Теперь первая плитка показывается в правильном регистре. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  42: [
    "Проверили форму глагола после would",
    "Спасибо за вопрос. После would используется базовая форма глагола, поэтому check в этом предложении стоит правильно. Текущий ответ в задании оставляем без изменений.",
  ],
  43: [
    "Исправили подсветку слова Were",
    "Спасибо, что заметили расхождение. Мы исправили подсветку слова Were, и теперь она совпадает с текстом предложения. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  44: [
    "Нужно описание проблемы",
    "Спасибо, что написали нам. В сообщении нет описания конкретной проблемы, поэтому мы не можем восстановить ситуацию. Если это повторится, пожалуйста, кратко опишите экран и действие — мы проверим.",
  ],
  45: [
    "Исправили перевод Nothing is right",
    "Спасибо, что обратили внимание на перевод. Мы заменили неестественную формулировку на более естественный русский вариант. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  46: [
    "Исправили варианты в упражнении на предлоги",
    "Спасибо, что сообщили о вариантах ответа. Мы исправили набор в упражнении, и теперь на экране остаются все необходимые варианты для выбора. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.",
  ],
  47: [
    "Проверили complex и difficult",
    "Спасибо за вопрос. Complex и difficult близки по смыслу, но не полностью взаимозаменяемы. В этом задании выбран перевод, который соответствует контексту, поэтому менять его не требуется.",
  ],
  48: [
    "Спасибо за сообщение",
    "Спасибо, всё в порядке. Мы поняли, что сообщение было отправлено случайно.",
  ],
};

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function buildAuditMarkdown(audit, batch) {
  const counts = audit.reduce((acc, row) => {
    acc[row.verdict] = (acc[row.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const rewardTotal = audit.reduce((sum, row) => sum + row.reward, 0);
  const batchById = new Map(batch.map((row) => [row.reportId, row]));
  let markdown = "# Phraseman user error reports audit\n\n";
  markdown +=
    "Final audit of the 48-report export completed on 2026-07-10. No live replies, rewards, OTA, build, or deploy were executed by this generator.\n\n";
  markdown += `Summary: ${audit.length} final decisions, 0 unresolved reports, planned rewards ${rewardTotal} shards.\n\n`;
  markdown += `Verdict counts: ${Object.entries(counts)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")}.\n\n`;
  markdown += "## Per-report audit\n\n";
  for (const row of audit) {
    const reply = batchById.get(row.reportId);
    markdown += `### #${row.reportNo} ${row.reportId}\n`;
    markdown += `- Created: ${row.createdAt}\n`;
    markdown += `- User: ${row.uid}; language: ${row.userLanguage}; screen: ${row.screen}; category: ${row.category}; dataId: ${row.dataId}\n`;
    markdown += `- Report comment: ${markdownCell(row.comment)}\n`;
    markdown += `- Verdict: **${row.verdict}**; group: ${row.group}; planned shards: ${row.reward}\n`;
    markdown += `- Evidence: ${row.evidence}\n`;
    markdown += `- Action: ${row.action}\n`;
    markdown += `- Draft reply: ${reply?.body ?? ""}\n\n`;
  }
  markdown += "## Delivery status\n\n";
  markdown +=
    "- Confirmed client and content fixes are ready in the local JS code and require a separately authorized OTA before reaching devices.\n";
  markdown +=
    "- Prepared support replies remain drafts until an administrator explicitly sends them.\n";
  return markdown;
}

function buildExpectedFiles() {
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
  const batch = JSON.parse(fs.readFileSync(BATCH_PATH, "utf8"));
  if (
    audit.length !== 48 ||
    batch.length !== 48 ||
    Object.keys(SUPPORT_COPY_BY_REPORT_NO).length !== 48
  ) {
    throw new Error("support_copy_expected_48_rows");
  }

  for (const row of audit) {
    const finalAudit = FINAL_AUDIT_BY_REPORT_NO[row.reportNo];
    if (finalAudit) Object.assign(row, finalAudit);
  }

  const auditById = new Map(audit.map((row) => [row.reportId, row]));
  for (const row of batch) {
    const source = auditById.get(row.reportId);
    const copy = source ? SUPPORT_COPY_BY_REPORT_NO[source.reportNo] : null;
    if (!source || !copy)
      throw new Error(`support_copy_missing_${row.reportId}`);
    row.title = copy[0];
    row.body = copy[1];
    row.shards = source.reward;
    row.resolution = source.verdict;
    row.rewardGroup = source.group;
  }

  const auditText = `${JSON.stringify(audit, null, 2)}\n`;
  const batchText = `${JSON.stringify(batch, null, 2)}\n`;
  const finalBatchText = batchText;
  const auditMarkdownText = buildAuditMarkdown(audit, batch);
  const currentAdmin = fs.readFileSync(ADMIN_PATH, "utf8");
  const startNeedle = "  const PREPARED_REPORT_REPLIES = {";
  const start = currentAdmin.indexOf(startNeedle);
  const closingStart = currentAdmin.indexOf("\n  };", start);
  if (start < 0 || closingStart < 0)
    throw new Error("support_copy_admin_markers_missing");
  const end = closingStart + "\n  };".length;
  const rows = batch.map(
    (row) =>
      `    ${JSON.stringify(row.reportId)}: {title:${JSON.stringify(row.title)},body:${JSON.stringify(row.body)},shards:${row.shards},resolution:${JSON.stringify(row.resolution)},rewardGroup:${JSON.stringify(row.rewardGroup)}},`,
  );
  const generatedMap = `${startNeedle}\n${rows.join("\n")}\n  };`;
  const adminText =
    currentAdmin.slice(0, start) + generatedMap + currentAdmin.slice(end);
  return { auditText, auditMarkdownText, batchText, finalBatchText, adminText };
}

const expected = buildExpectedFiles();
if (CHECK_ONLY) {
  const failures = [];
  if (fs.readFileSync(AUDIT_PATH, "utf8") !== expected.auditText)
    failures.push("docs/reports/user_error_reports_audit_2026-07-10.json");
  if (
    fs.readFileSync(AUDIT_MARKDOWN_PATH, "utf8") !== expected.auditMarkdownText
  )
    failures.push("docs/reports/user_error_reports_audit_2026-07-10.md");
  if (fs.readFileSync(BATCH_PATH, "utf8") !== expected.batchText)
    failures.push("replies_batch_2026-07-10.json");
  if (fs.readFileSync(FINAL_BATCH_PATH, "utf8") !== expected.finalBatchText)
    failures.push("replies_batch_2026-07-10_final.json");
  if (fs.readFileSync(ADMIN_PATH, "utf8") !== expected.adminText)
    failures.push("admin/legacy.html");
  if (failures.length) {
    console.error(`Support copy is out of sync: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("Support copy check passed: 48 replies are in sync.");
} else {
  fs.writeFileSync(AUDIT_PATH, expected.auditText, "utf8");
  fs.writeFileSync(AUDIT_MARKDOWN_PATH, expected.auditMarkdownText, "utf8");
  fs.writeFileSync(BATCH_PATH, expected.batchText, "utf8");
  fs.writeFileSync(FINAL_BATCH_PATH, expected.finalBatchText, "utf8");
  fs.writeFileSync(ADMIN_PATH, expected.adminText, "utf8");
  console.log(
    "Updated the 48-report audit, support batches, and embedded admin drafts.",
  );
}
