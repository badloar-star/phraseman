import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

function runAudit(markdown, { uk = "# Перевірка\n", draft = null, supplemental = null, extraSessions = [], args = [], atomic = null } = {}) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-actor-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline"));
    fs.mkdirSync(path.join(root, "sessions/en/l01/s01"), { recursive: true });
    fs.copyFileSync(path.join(here, "audit_actor_clarity.mjs"), path.join(root, "pipeline/audit_actor_clarity.mjs"));
    fs.writeFileSync(path.join(root, "sessions/en/l01/s01/final.ru.md"), markdown);
    fs.writeFileSync(path.join(root, "sessions/en/l01/s01/final.uk.md"), uk);
    if (draft !== null) fs.writeFileSync(path.join(root, "sessions/en/l01/s01/draft_C.ru.md"), draft);
    if (supplemental !== null) fs.writeFileSync(path.join(root, "sessions/en/l01/s01/locales_batch.md"), supplemental);
    if (atomic) fs.writeFileSync(path.join(root, "sessions/en/l01/s01/practice.atomic.json"), JSON.stringify(atomic));
    for (const session of extraSessions) {
      const dir = path.join(root, "sessions", session.scope);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "final.ru.md"), session.ru);
      fs.writeFileSync(path.join(dir, "final.uk.md"), "# Перевірка\n");
    }
    return spawnSync(process.execPath, [path.join(root, "pipeline/audit_actor_clarity.mjs"), ...args], { encoding: "utf8" });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("checks a localization batch because it can be reused to regenerate learner text", () => {
  const result = runAudit("# Проверка\n", {
    supplemental: "# Перевірка\n\n**Біля кулера запитують, що за каблучка у гостя. Скажіть: «він одружений».**\n",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /uk_unnamed_questioner|uk_actorless_question|uk_ring_as_marital_proof/);
});

test("blocks a place that asks a question instead of a named person", () => {
  const result = runAudit("# Проверка\n\n**У кулера задают вопрос о кольце коллеги. Ответьте: «он женат».**\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_place_as_questioner/);
});

test("blocks a third-person instruction paired with a direct You are answer", () => {
  const result = runAudit("# Проверка\n\n**Турист застегнул куртку. Скажите, что он готов идти.**\n\n- ✅ **You are ready.**\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_third_person_cue_for_you_are/);
});

test("blocks internal lesson-production labels in learner-facing text", () => {
  const result = runAudit("# Английский · Урок 1 · Сессия 1\n\n**Сцена сессии.** Лина показывает фотографию.\n**Операция:** выберите фразу.\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_internal_course_label/);
});

test("reports an unsafe archival draft when archive auditing is explicitly requested", () => {
  const result = runAudit("# Проверка\n", {
    draft: "# Черновик\n\n**У кулера спрашивают, что за кольцо у коллеги. Ответьте: «он женат».**\n",
    args: ["--include-archive"],
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_unnamed_questioner/);
});

test("does not let an archived draft block a safe active lesson, but reports it on archive audit", () => {
  const draft = "# Черновик\n\n**У кулера спрашивают, что за кольцо у коллеги. Ответьте: «он женат».**\n";
  const active = runAudit("# Проверка\n", { draft });
  assert.equal(active.status, 0, active.stderr);

  const archive = runAudit("# Проверка\n", { draft, args: ["--include-archive"] });
  assert.notEqual(archive.status, 0);
  assert.match(archive.stderr, /ru_unnamed_questioner/);
});

test("blocks an unnamed person asking the courier a question", () => {
  const result = runAudit("# Проверка\n\n**У курьера спрашивают, чья это коробка. Ответьте: «Это моя коробка».**\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_unnamed_questioner/);
});

test("blocks an actorless questioner in ordinary visible text too", () => {
  const result = runAudit("# Проверка\n\nУ курьера спрашивают, чья это коробка.\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_actorless_question/);
});

test("blocks an actorless questioner in the JSON that the learner actually opens", () => {
  const result = runAudit("# Проверка\n", {
    atomic: { interactionsByLocale: { ru: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: { localizedScene: { ru: "У курьера спрашивают, чья это коробка." } },
    }] } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /atomic_ru_actorless_question/);
});

test("blocks a generic unnamed person in an opened task prompt", () => {
  const result = runAudit("# Проверка\n", {
    atomic: { interactionsByLocale: { ru: [{
      interactionId: "en:lesson-01:session-01:i01",
      prompt: "Соберите фразу — парень у окна молчит весь день",
    }] } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /atomic_ru_generic_unnamed_actor/);
});

test("blocks an internal grammar metaphor in learner interaction data", () => {
  const result = runAudit("# Проверка\n", {
    atomic: { interactionsByLocale: { ru: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: { localizedScene: { ru: "Вставьте скрепку в сообщение для Лины." } },
    }] } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /atomic_ru_internal_grammar_metaphor/);
});

test("blocks the Ukrainian inflected form of the same internal grammar metaphor", () => {
  const result = runAudit("# Перевірка\n", {
    atomic: { interactionsByLocale: { uk: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: { localizedScene: { uk: "Заперечення при скріпці — тільки not." } },
    }] } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /atomic_uk_internal_grammar_metaphor/);
});

test("blocks a wedding ring as the purported proof of marital status", () => {
  const result = runAudit("# Проверка\n\n**Лина показывает кольцо гостя и просит подтвердить: «он женат».**\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_ring_as_marital_proof/);
});

test("allows a declared profile fact as the reason to state marital status", () => {
  const result = runAudit("# Проверка\n\n**Лина сверяет анкету гостя: в ней сказано, что он состоит в браке. Подтвердите: «он женат».**\n");
  assert.equal(result.status, 0, result.stderr);
});

test("blocks a ring as the evidence for married inside learner interaction data", () => {
  const result = runAudit("# Проверка\n", {
    atomic: { interactionsByLocale: { ru: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: {
        localizedScene: { ru: "Вставьте слово — про парня с кольцом" },
        gappedTargetPhrase: "He is ___.",
        gapOptions: [{ text: "married" }, { text: "single" }],
      },
    }] } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /atomic_ring_as_marital_proof/);
});

test("allows a declared profile fact inside learner interaction data", () => {
  const result = runAudit("# Проверка\n", {
    atomic: { interactionsByLocale: { ru: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: {
        localizedScene: { ru: "В анкете гостя указано, что он состоит в браке. Вставьте слово." },
        gappedTargetPhrase: "He is ___.",
        gapOptions: [{ text: "married" }, { text: "single" }],
      },
    }] } },
  });
  assert.equal(result.status, 0, result.stderr);
});

test("allows a named person, recipient, referent, and purpose", () => {
  const result = runAudit("# Проверка\n\n**Лина готовит подпись к фотографии гостя для программы вечера. Она просит вас подтвердить: «он женат».**\n");
  assert.equal(result.status, 0, result.stderr);
});

test("blocks internal task labels in learner-facing instructions", () => {
  const result = runAudit("# Проверка\n\n**12 · Обманка на внимательность — выберите слово.**\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_internal_task_label/);
});

test("blocks editorial review headings that leaked after learner text", () => {
  const result = runAudit("# Проверка\n\nТекст для ученика.\n\n---\n\n🟡 **Стоит улучшить**\n- Авторская заметка.\n\n🧩 **Скрытые связи**\n- Ещё одна заметка.\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_internal_editorial_note/);
});

test("blocks an editorial note even when it was appended after the author-only ledger", () => {
  const result = runAudit("# Проверка\n\n## Для сборщика\n\nТехнические данные.\n\n---\n\n🟡 **Стоит улучшить**\n- Редакторская заметка.\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_internal_editorial_note/);
});

test("blocks a visible internal heading but ignores the author-only ledger", () => {
  const visible = runAudit("# Проверка\n\n## Интро 3 · Ловушка\n\nТекст для ученика.\n");
  assert.notEqual(visible.status, 0);
  assert.match(visible.stderr, /ru_internal_task_label/);

  const authorOnly = runAudit("# Проверка\n\n## Для сборщика\n\nЛовушка из старой версии удалена.\n");
  assert.equal(authorOnly.status, 0, authorOnly.stderr);
});

test("allows a concrete final adjective but blocks a final-stage label", () => {
  const concrete = runAudit("# Проверка\n\n**Лина ставит финальную подпись на счёте.**\n");
  assert.equal(concrete.status, 0, concrete.stderr);

  const label = runAudit("# Проверка\n\n**12 · Финал сцены — ответьте на вопрос.**\n");
  assert.notEqual(label.status, 0);
  assert.match(label.stderr, /ru_internal_task_label/);
});

test("lesson audit defaults to the English course instead of reporting another language", () => {
  const result = runAudit("# Проверка\n\n**Лина просит вас подтвердить: «он женат».**\n", {
    extraSessions: [{
      scope: "fr/l01/s01",
      ru: "# Проверка\n\n**У кулера задают вопрос.**\n",
    }],
    args: ["--lesson", "l01"],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 файлов проверено/);
});

test("scope audit traverses every nested session in that language", () => {
  const result = runAudit("# Проверка\n\n**Лина просит вас подтвердить: «он женат».**\n", {
    extraSessions: [{
      scope: "en/l02/s01",
      ru: "# Проверка\n\n**У курьера спрашивают, чья коробка.**\n",
    }],
    args: ["--scope", "en"],
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ru_unnamed_questioner/);
});

test("blocks an unambiguously Russian answer option in the Ukrainian learner text", () => {
  const result = runAudit("# Проверка\n", {
    uk: "# Перевірка\n\n**Варіанти: `Это виходи` · `Це виходи`**\n",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /uk_russian_learner_text/);
});

test("allows a Ukrainian demonstrative that shares spelling with a Russian word", () => {
  const result = runAudit("# Проверка\n", {
    uk: "# Перевірка\n\n**Та таця стоїть на столі.**\n",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("container exercise keeps the concrete berries purpose instead of an arbitrary market location", () => {
  const courseRoot = path.resolve(here, "..");
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(courseRoot, "sessions/en/l04/s17", `final.${locale}.md`), "utf8");
    assert.doesNotMatch(source, /There are some containers by the market\./u);
    assert.match(source, /There are some containers for berries\./u);
  }
});
