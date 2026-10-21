import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SEASON_COPY, seasonEpisodeLabel, seasonText } from "../components/learning-v2/season/season_copy";

// зачем (владелец 21.10, «Сезон и карусель карт», фаза 2): контракт экрана — движение на UI-треде, виртуализированное окно карт, без обводок,
// тексты на 9 языках с правильными словами «Эпизод»; ловит возврат к setState на кадр и к спискам «все карты сразу».
const read = (rel: string): string => readFileSync(rel, "utf8").replace(/\r\n/g, "\n");

async function main(): Promise<void> {
  // ── тексты: 9 языков, одинаковые подстановки ──
  const placeholders = (s: string) => [...s.matchAll(/\{[a-z]+\}/g)].map((m) => m[0]).sort().join(",");
  for (const [key, nine] of Object.entries(SEASON_COPY)) {
    assert.equal(nine.length, 9, `${key}: 9 языков`);
    const ru = placeholders(nine[0]);
    for (const text of nine) {
      assert.ok(text.trim().length > 0, `${key}: пустой текст`);
      assert.equal(placeholders(text), ru, `${key}: подстановки одинаковы во всех языках`);
    }
  }
  // «Эпизод» — слова Переводчика, уже внесённые Learning V2
  assert.deepEqual([...SEASON_COPY.episode], ["Эпизод", "Епізод", "Episode", "Episodio", "Episódio", "Tập", "Episode", "Bölüm", "Odcinek"]);
  assert.equal(seasonEpisodeLabel("ru", 12), "Эпизод 12");
  assert.equal(seasonEpisodeLabel("en", 12), "Episode 12");
  assert.equal(seasonText("ru", "continueEpisode", { n: 12 }), "Продолжить эпизод 12");
  assert.equal(seasonText("ru", "chapterOf", { n: 2, m: 7 }), "Глава 2 из 7");
  assert.equal(seasonText("ru", "locked", { n: 13 }), "Откроется после эпизода 13");
  assert.equal(seasonText("tr", "chapterOf", { n: 2, m: 7 }), "Ünite 2/7");

  // ── карусель: UI-тред, окно, без setState на кадр ──
  const carousel = read("components/learning-v2/season/SeasonCarousel.tsx");
  assert.match(carousel, /useSharedValue/);
  assert.match(carousel, /useAnimatedStyle/);
  assert.match(carousel, /seasonCardLayout\(index - position\.value\)/, "положение карты считает worklet по позиции");
  assert.match(carousel, /seasonWindowIndexes\(center, count\)/, "рисуются только карты окна");
  assert.match(carousel, /useAnimatedReaction/);
  assert.match(carousel, /if \(now !== prev\) runOnJS\(setCenter\)\(now\)/, "окно сдвигается только при смене округлённой позиции");
  assert.doesNotMatch(carousel, /\.map\(\(_, i\)|Array\.from\(\{ length: count/, "колода не разворачивается целиком");
  assert.doesNotMatch(carousel, /setInterval|requestAnimationFrame/);
  assert.match(carousel, /reducedMotion/);

  // ── математика помечена worklet ──
  const layout = read("components/learning-v2/season/season_carousel_layout.ts");
  assert.equal((layout.match(/'worklet'/g) ?? []).length >= 3, true, "формулы карусели — worklet-ы");

  // ── ни обводок, ни сжатия шрифта в новых компонентах ──
  for (const f of ["SeasonCarousel.tsx", "SeasonCardFace.tsx", "SeasonCourseView.tsx"]) {
    const src = read(`components/learning-v2/season/${f}`);
    assert.doesNotMatch(src, /borderWidth|borderColor|adjustsFontSizeToFit/, `${f}: без обводок и сжатия шрифта`);
  }

  // ── вид: кегли только 13/16 и заголовки ≥19; экран не читает сеть ──
  const view = read("components/learning-v2/season/SeasonCourseView.tsx");
  const sizes = [...view.matchAll(/fontSize: (\d+)/g)].map((m) => Number(m[1]));
  for (const size of sizes) assert.ok(size === 13 || size === 16 || size >= 19, `кегль ${size} вне шкалы 13/16/≥19`);
  // сеть — только импорты и вызовы (комментарий вправе говорить «без чтений Firebase»)
  assert.doesNotMatch(view, /from ['"][^'"]*(firebase|firestore)[^'"]*['"]|\bfetch\(|getDoc\(|getDocs\(/i, "экран не ходит в сеть");
  // события наружу для следующих фаз
  for (const name of ["onCardOpen", "onWholeChapter", "onChapterPicker", "onLessonPicker", "onNotFromStart"]) assert.ok(view.includes(name), `нет события ${name}`);

  console.log("SEASON VIEW CONTRACT: PASS");
}

if (typeof test === "function") {
  test("season_view_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
