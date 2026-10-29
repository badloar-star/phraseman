/**
 * Сторож лесенки C: голова встроенного курса в репозитории обязана быть в серверном списке
 * LADDER_TRUSTED_COURSE_HEADS_V1 (functions/src/referral_ladder_plus.ts).
 *
 * зачем (координатор 29.10): Plus за приглашённого засчитывается только по итогам с головой курса из списка —
 * так сервер отличает новую версию приложения от старых сборок. Пересобрали курс и забыли добавить голову —
 * друзья на свежей версии молча не получат меток дней и Plus. Этот тест ломает сборку в момент пересборки.
 *
 * Сработал — ДОБАВИТЬ новую голову в список (старые не удалять: прошлые обновления остаются «новой версией»)
 * и выложить функции ДО публикации OTA с этой головой. Не ослаблять проверку.
 */
import { LADDER_TRUSTED_COURSE_HEADS_V1 } from '../functions/src/referral_ladder_plus';
import { factoryNativeLearningV2CourseIdentityV1 } from '../modules/learning-v2/content/factory_native/factory_native_catalog_v1';

describe('лесенка C: голова встроенного курса — в серверном списке', () => {
  it.each(['en', 'es'] as const)('%s', (lang) => {
    const { activeHeadFingerprint } = factoryNativeLearningV2CourseIdentityV1(lang);
    if (!LADDER_TRUSTED_COURSE_HEADS_V1[lang].includes(activeHeadFingerprint)) {
      throw new Error(
        `[LADDER-C] голова курса ${lang}=${activeHeadFingerprint} нет в LADDER_TRUSTED_COURSE_HEADS_V1.${lang} ` +
        '(functions/src/referral_ladder_plus.ts). Добавь её в список и выложи функции до публикации OTA.',
      );
    }
  });

  it('список: только 64-значные hex, без повторов', () => {
    for (const heads of Object.values(LADDER_TRUSTED_COURSE_HEADS_V1)) {
      expect(heads.every((h) => /^[0-9a-f]{64}$/.test(h))).toBe(true);
      expect(new Set(heads).size).toBe(heads.length);
    }
  });
});
