import {
  LEARNING_V2_STARS_SOURCE_KIND,
  LEARNING_V2_UNLOCK_SOURCE_KIND,
  LearningV2StarsBridgeError,
  learningV2SessionStarOp,
  learningV2UnlockStarOp,
  starsFromWalletSubunits,
} from "./stars_ledger_bridge";
import { WALLET_SUBUNITS_PER_STAR } from "../../../modules/learning-v2/contracts/wallet";
import { requiredCourseUnlockPriceStars } from "../../../modules/learning-v2/contracts/course_unlock";
import { STAR_OP_CLASS, STAR_OP_MAX_ABS_DELTA } from "../stars_ledger";

/**
 * Мост Learning V2 → журнал звёзд.
 * Дизайн — docs/superpowers/specs/2026-08-23-learning-v2-unified-stars-design.md
 */

/** Тот же регекс, что стережёт opId в журнале. Дублируется намеренно: если
 *  журнал ужесточит формат, этот тест обязан упасть и показать, где именно. */
const LEDGER_OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;

describe("мост Learning V2 → журнал звёзд", () => {
  describe("перевод подъединиц в звёзды", () => {
    it("делит нацело", () => {
      expect(starsFromWalletSubunits(0)).toBe(0);
      expect(starsFromWalletSubunits(12 * WALLET_SUBUNITS_PER_STAR)).toBe(12);
      expect(starsFromWalletSubunits(65 * WALLET_SUBUNITS_PER_STAR)).toBe(65);
    });

    it("падает на остатке, а не округляет молча", () => {
      // Молчаливое округление развело бы баланс кошелька и баланс журнала.
      expect(() => starsFromWalletSubunits(WALLET_SUBUNITS_PER_STAR + 1))
        .toThrow(LearningV2StarsBridgeError);
      expect(() => starsFromWalletSubunits(1)).toThrow(/subunits_not_whole_stars/);
    });

    it("падает на отрицательном и дробном", () => {
      expect(() => starsFromWalletSubunits(-WALLET_SUBUNITS_PER_STAR)).toThrow();
      expect(() => starsFromWalletSubunits(1.5)).toThrow();
      expect(() => starsFromWalletSubunits(Number.NaN)).toThrow();
    });
  });

  describe("начисление за занятие", () => {
    it("оформляет операцию заработка с ключом дедупа по занятию", () => {
      const op = learningV2SessionStarOp({
        courseSessionId: "s-en-a1-004",
        awardedSubunits: 12 * WALLET_SUBUNITS_PER_STAR,
        ruleVersion: 1,
      })!;
      expect(op.delta).toBe(12);
      expect(op.reason).toBe("learning_v2_session");
      expect(op.sourceKind).toBe(LEARNING_V2_STARS_SOURCE_KIND);
      expect(op.sourceId).toBe("s-en-a1-004");
      expect(op.opId).toBe("learning_v2:s-en-a1-004");
      expect(STAR_OP_CLASS[op.reason]).toBe("earn");
    });

    it("ключ проходит валидацию журнала", () => {
      const op = learningV2SessionStarOp({
        courseSessionId: "s-en-a1-004",
        awardedSubunits: WALLET_SUBUNITS_PER_STAR,
        ruleVersion: 1,
      })!;
      expect(LEDGER_OP_ID_RE.test(op.opId)).toBe(true);
    });

    it("одно и то же занятие даёт один и тот же ключ — дедуп сработает", () => {
      const make = () => learningV2SessionStarOp({
        courseSessionId: "s1",
        awardedSubunits: 8 * WALLET_SUBUNITS_PER_STAR,
        ruleVersion: 1,
      })!;
      expect(make().opId).toBe(make().opId);
    });

    it("ключ не зависит от суммы — иначе дедуп перестал бы быть дедупом", () => {
      // Ключ, меняющийся при смене суммы, пропустил бы повторное начисление.
      const a = learningV2SessionStarOp({
        courseSessionId: "s1", awardedSubunits: 8 * WALLET_SUBUNITS_PER_STAR, ruleVersion: 1,
      })!;
      const b = learningV2SessionStarOp({
        courseSessionId: "s1", awardedSubunits: 20 * WALLET_SUBUNITS_PER_STAR, ruleVersion: 2,
      })!;
      expect(a.opId).toBe(b.opId);
    });

    it("нулевая награда операции не создаёт", () => {
      // Журнал отвергает нулевую дельту, а пустая операция стоила бы записи.
      expect(learningV2SessionStarOp({
        courseSessionId: "s1", awardedSubunits: 0, ruleVersion: 1,
      })).toBeNull();
    });

    it("отвергает id с двоеточием и слишком длинный", () => {
      expect(() => learningV2SessionStarOp({
        courseSessionId: "course:1", awardedSubunits: WALLET_SUBUNITS_PER_STAR, ruleVersion: 1,
      })).toThrow(/source_id_unusable/);
      expect(() => learningV2SessionStarOp({
        courseSessionId: "s".repeat(97), awardedSubunits: WALLET_SUBUNITS_PER_STAR, ruleVersion: 1,
      })).toThrow(/source_id_unusable/);
    });

    it("несёт момент завершения для оффлайн-хвоста", () => {
      const at = 1_700_000_000_000;
      const op = learningV2SessionStarOp({
        courseSessionId: "s1", awardedSubunits: WALLET_SUBUNITS_PER_STAR,
        ruleVersion: 1, earnedAtMs: at,
      })!;
      expect(op.earnedAtMs).toBe(at);
    });
  });

  describe("списание за открытие занятия", () => {
    it("оформляет трату по цене лестницы", () => {
      const op = learningV2UnlockStarOp({
        courseId: "course.en.a1", requiredSessionOrdinal: 3,
        priceStars: 55, ruleVersion: 1,
      })!;
      expect(op.delta).toBe(-55);
      expect(op.reason).toBe("learning_v2_unlock");
      expect(op.sourceId).toBe("course.en.a1_3");
      expect(op.opId).toBe("learning_v2_unlock:course.en.a1_3");
      expect(op.sourceKind).toBe(LEARNING_V2_UNLOCK_SOURCE_KIND);
      expect(STAR_OP_CLASS[op.reason]).toBe("spend");
    });

    it("склеивает через подчёркивание, а не двоеточие", () => {
      // С двоеточием ключ стал бы невалидным: списание отвалилось бы молча,
      // а занятие осталось открытым — бесплатная учёба.
      const op = learningV2UnlockStarOp({
        courseId: "c1", requiredSessionOrdinal: 7, priceStars: 65, ruleVersion: 1,
      })!;
      expect(op.sourceId).not.toContain(":");
      expect(LEDGER_OP_ID_RE.test(op.opId)).toBe(true);
    });

    it("первое занятие бесплатно — операции нет", () => {
      expect(learningV2UnlockStarOp({
        courseId: "c1", requiredSessionOrdinal: 0,
        priceStars: requiredCourseUnlockPriceStars(0), ruleVersion: 1,
      })).toBeNull();
    });

    it("вся лестница цен укладывается в потолок одной операции", () => {
      for (const opened of [1, 2, 3, 4, 5, 383]) {
        const price = requiredCourseUnlockPriceStars(opened);
        const op = learningV2UnlockStarOp({
          courseId: "c1", requiredSessionOrdinal: opened, priceStars: price, ruleVersion: 1,
        })!;
        expect(Math.abs(op.delta)).toBeLessThanOrEqual(STAR_OP_MAX_ABS_DELTA);
        expect(op.delta).toBe(-price);
      }
    });

    it("разные занятия одного курса дают разные ключи", () => {
      const a = learningV2UnlockStarOp({
        courseId: "c1", requiredSessionOrdinal: 1, priceStars: 45, ruleVersion: 1,
      })!;
      const b = learningV2UnlockStarOp({
        courseId: "c1", requiredSessionOrdinal: 2, priceStars: 50, ruleVersion: 1,
      })!;
      expect(a.opId).not.toBe(b.opId);
    });

    it("повторное открытие того же занятия даёт тот же ключ", () => {
      // Защита от двойного тапа: второй тап дедуплицируется журналом.
      const make = () => learningV2UnlockStarOp({
        courseId: "c1", requiredSessionOrdinal: 2, priceStars: 50, ruleVersion: 1,
      })!;
      expect(make().opId).toBe(make().opId);
    });

    it("отвергает курс с двоеточием", () => {
      expect(() => learningV2UnlockStarOp({
        courseId: "c:1", requiredSessionOrdinal: 1, priceStars: 45, ruleVersion: 1,
      })).toThrow(/source_id_unusable/);
    });
  });
});
