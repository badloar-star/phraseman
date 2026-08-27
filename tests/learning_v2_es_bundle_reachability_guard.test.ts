/**
 * Сторож доступности испанских сессий из бандла (владелец, 2026-08-27:
 * «накорню реши эту проблему чтобы никогда больше такого не было»).
 *
 * ИСТОРИЯ КЛАССА БАГА. Испанская сессия 2 была написана, лежала в бандле и
 * проходила все гейты, но ручная константа потолка осталась равна 1. Клиент
 * не брал её из бандла, уходил в сеть за контентом, которого на сервере нет,
 * и человек видел «Подготавливаем занятие и локальное аудио…», а затем
 * «Сессия недоступна / stable_identity_unavailable». Симптом выглядел как
 * поломка аккаунта — чинили не то место трижды.
 *
 * Вторая мина того же класса: сессия со звуковыми заданиями без своей
 * bundled-озвучки не собирается вовсе (схема audio child бросает fail() на
 * несовпадении количества) — то есть «написал сессию, забыл озвучку» тоже
 * приводило к недоступному занятию.
 *
 * Этот сторож ловит оба случая ДО устройства.
 */
import {
  authoredEsLearningV2SessionShard,
  esAuthoredEpisode01ContiguousCeilingV1,
  allAuthoredEsEpisode01Sessions,
} from '../modules/learning-v2/content/source/es_authored_sessions_v1';

const AUDIO_FAMILIES = new Set([
  'listen_choose',
  'listen_build_dictation',
  'scripted_repeat_compare',
]);

describe('es bundle reachability', () => {
  it('каждая сессия внутри потолка реально собирается из бандла', () => {
    const ceiling = esAuthoredEpisode01ContiguousCeilingV1();
    expect(ceiling).toBeGreaterThan(0);
    for (let ordinal = 1; ordinal <= ceiling; ordinal += 1) {
      // null здесь означает «человек упрётся в сеть» — ровно тот баг.
      expect(authoredEsLearningV2SessionShard(ordinal)).not.toBeNull();
    }
  });

  it('потолок не открывает сессию без mode-native формата', () => {
    const ceiling = esAuthoredEpisode01ContiguousCeilingV1();
    const sources = allAuthoredEsEpisode01Sessions();
    for (let ordinal = 1; ordinal <= ceiling; ordinal += 1) {
      const source = sources.find(
        (entry) => entry.requiredSessionOrdinal === ordinal,
      );
      expect(source).toBeDefined();
      // Старые (pre-mode-native) сессии забракованы владельцем и не должны
      // становиться доступными человеку через автопотолок.
      expect(source?.modeNativePlanId).toBeTruthy();
      expect(source?.modeNativePractice).toBeTruthy();
    }
  });

  it('первая сессия ВНЕ потолка честно закрыта, а не отдаётся наполовину', () => {
    const ceiling = esAuthoredEpisode01ContiguousCeilingV1();
    // зачем: именно «наполовину доступная» сессия и давала чёрный экран —
    // потолок пускал, а материал не собирался. Следующая за потолком обязана
    // быть закрыта полностью.
    expect(authoredEsLearningV2SessionShard(ceiling + 1)).toBeNull();
  });

  it('у каждой звуковой сессии внутри потолка озвучка учтена в списке', () => {
    const ceiling = esAuthoredEpisode01ContiguousCeilingV1();
    const sources = allAuthoredEsEpisode01Sessions();
    for (let ordinal = 1; ordinal <= ceiling; ordinal += 1) {
      const source = sources.find(
        (entry) => entry.requiredSessionOrdinal === ordinal,
      );
      const needsAudio = (source?.modeNativePractice ?? []).some((step) =>
        AUDIO_FAMILIES.has(step.family),
      );
      if (!needsAudio) continue;
      // Прямой require('*.mp3') в jest не работает (нативный ассет), поэтому
      // доказательством служит успешная сборка шарда: без своей озвучки
      // материал бы не собрался и сессия вернула бы null.
      expect(authoredEsLearningV2SessionShard(ordinal)).not.toBeNull();
    }
  });
});
