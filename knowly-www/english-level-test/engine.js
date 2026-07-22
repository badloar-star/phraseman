/**
 * English Level Test — transparent CEFR staircase.
 *
 * This is deliberately not labelled as IRT: the question bank has not been
 * psychometrically calibrated. Every promotion and result is therefore based
 * on simple, auditable evidence rules.
 */

(function (global) {
  'use strict';

  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const LEVEL_MAP = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
  const SKILL_LIST = ['grammar', 'vocabulary', 'reading', 'pragmatics'];
  const FORMAT_LIST = ['multiple-choice', 'gap-fill'];
  const RECENT_STORAGE_KEY = 'en_test_recent';
  const RECENT_TTL_MS = 30 * 86400000;
  const RECENT_MAX_IDS = 240;

  const CONFIG = {
    anchorCount: 2,
    anchorMaxDifficulty: 0.65,
    promoteAfterCorrect: 2,
    minQuestions: 12,
    maxQuestions: 20,
    upperBandMinShown: 3,
    upperBandMinCorrect: 2,
    standardBandMinShown: 2,
    standardBandMinCorrect: 2,
  };

  function seededRandom(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function clampLevel(index) {
    return Math.max(0, Math.min(LEVELS.length - 1, index));
  }

  class Engine {
    constructor(questions, attemptSeed) {
      this.questions = questions;
      this.history = [];
      this.shownIds = new Set();
      this.seed = attemptSeed ?? Math.floor(Math.random() * 1e9);
      this.rng = seededRandom(this.seed);
      this.startedAt = Date.now();
      this.targetLevelIndex = 0;
      this.correctStreak = 0;
      this.pendingQuestion = null;
      this.skillCounts = {};
      this.formatCounts = {};
      this.recentQuestions = this.loadRecentQuestions();
      for (const skill of SKILL_LIST) this.skillCounts[skill] = 0;
      for (const format of FORMAT_LIST) this.formatCounts[format] = 0;
    }

    loadRecentQuestions() {
      try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(RECENT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const knownIds = new Set(this.questions.map((question) => question.id));
        const now = Date.now();
        return Object.fromEntries(Object.entries(parsed)
          .filter(([id, shownAt]) => (
            knownIds.has(id)
            && Number.isFinite(shownAt)
            && shownAt <= now + 86400000
            && now - shownAt <= RECENT_TTL_MS
          ))
          .sort((left, right) => right[1] - left[1])
          .slice(0, RECENT_MAX_IDS));
      } catch (error) {
        // Storage may be unavailable in privacy modes; selection still works.
        return {};
      }
    }

    saveRecentQuestion(questionId) {
      const now = Date.now();
      this.recentQuestions[questionId] = now;
      this.recentQuestions = Object.fromEntries(Object.entries(this.recentQuestions)
        .filter(([, shownAt]) => Number.isFinite(shownAt) && now - shownAt <= RECENT_TTL_MS)
        .sort((left, right) => right[1] - left[1])
        .slice(0, RECENT_MAX_IDS));
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(this.recentQuestions));
      } catch (error) {
        // In-memory penalties still diversify the current session.
      }
    }

    getRecentPenalty(questionId) {
      const shownAt = this.recentQuestions[questionId];
      if (!shownAt) return 0;
      const days = (Date.now() - shownAt) / 86400000;
      if (days < 1) return 3;
      if (days < 7) return 1.5;
      if (days < 30) return 0.5;
      return 0;
    }

    getAvailableQuestions(level) {
      return this.questions.filter((question) => (
        !this.shownIds.has(question.id) && (!level || question.level === level)
      ));
    }

    scoreQuestion(question, preferredSkill) {
      const skillCount = this.skillCounts[question.skill] || 0;
      const formatCount = this.formatCounts[question.format] || 0;
      const preferredBonus = preferredSkill && question.skill === preferredSkill ? -2 : 0;
      return (
        skillCount * 1.5
        + formatCount * 0.25
        + this.getRecentPenalty(question.id)
        + preferredBonus
        + this.rng() * 0.05
      );
    }

    chooseSourceQuestion() {
      const anchorPosition = this.history.length;
      if (anchorPosition < CONFIG.anchorCount) {
        const firstSkill = this.history[0] && this.history[0].question.skill;
        let anchors = this.getAvailableQuestions('A1').filter(
          (question) => Number(question.difficulty) <= CONFIG.anchorMaxDifficulty,
        );
        if (!anchors.length) anchors = this.getAvailableQuestions('A1');
        if (anchorPosition === 1) {
          const differentSkill = anchors.filter((question) => question.skill !== firstSkill);
          if (differentSkill.length) anchors = differentSkill;
        }
        return anchors
          .map((question) => ({ question, score: this.scoreQuestion(question) }))
          .sort((left, right) => left.score - right.score)[0]?.question || null;
      }

      const desiredLevel = LEVELS[this.targetLevelIndex];
      let pool = this.getAvailableQuestions(desiredLevel);
      if (this.targetLevelIndex >= LEVEL_MAP.C1) {
        const evidencePool = pool.filter((question) => question.upperBandEvidence === true);
        if (evidencePool.length) pool = evidencePool;
      }
      if (!pool.length) {
        const available = this.getAvailableQuestions();
        if (!available.length) return null;
        const nearestDistance = Math.min(...available.map(
          (question) => Math.abs(LEVEL_MAP[question.level] - this.targetLevelIndex),
        ));
        pool = available.filter(
          (question) => Math.abs(LEVEL_MAP[question.level] - this.targetLevelIndex) === nearestDistance,
        );
      }

      const minSkillCount = Math.min(...SKILL_LIST.map((skill) => this.skillCounts[skill] || 0));
      const preferredSkills = SKILL_LIST.filter(
        (skill) => (this.skillCounts[skill] || 0) === minSkillCount,
      );
      const preferredSkill = preferredSkills[Math.floor(this.rng() * preferredSkills.length)];
      return pool
        .map((question) => ({ question, score: this.scoreQuestion(question, preferredSkill) }))
        .sort((left, right) => left.score - right.score)[0]?.question || null;
    }

    shuffleForDisplay(question) {
      const shuffled = question.options.map((text, originalIndex) => ({ text, originalIndex }));
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(this.rng() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return {
        ...question,
        options: shuffled.map((option) => option.text),
        correctIndex: shuffled.findIndex((option) => option.originalIndex === question.correctIndex),
        sourceCorrectIndex: question.correctIndex,
      };
    }

    pickNextQuestion() {
      if (this.pendingQuestion) return this.pendingQuestion;
      const sourceQuestion = this.chooseSourceQuestion();
      if (!sourceQuestion) return null;
      this.pendingQuestion = this.shuffleForDisplay(sourceQuestion);
      return this.pendingQuestion;
    }

    recordAnswer(question, selectedIndex, skipped, responseTimeMs) {
      const correct = !skipped && selectedIndex === question.correctIndex;
      this.history.push({
        question,
        selectedIndex,
        correct,
        skipped: !!skipped,
        responseTimeMs: responseTimeMs || 0,
      });
      this.shownIds.add(question.id);
      this.saveRecentQuestion(question.id);
      this.pendingQuestion = null;
      this.skillCounts[question.skill] = (this.skillCounts[question.skill] || 0) + 1;
      this.formatCounts[question.format] = (this.formatCounts[question.format] || 0) + 1;

      if (correct) {
        this.correctStreak += 1;
        if (this.correctStreak >= CONFIG.promoteAfterCorrect) {
          const targetLevel = LEVELS[this.targetLevelIndex];
          const needsUpperBandEvidence = this.targetLevelIndex === LEVEL_MAP.C1;
          const hasUpperBandEvidence = this.getLevelEvidence()[targetLevel].shown
            >= CONFIG.upperBandMinShown;
          if (!needsUpperBandEvidence || hasUpperBandEvidence) {
            this.targetLevelIndex = clampLevel(this.targetLevelIndex + 1);
            this.correctStreak = 0;
          }
        }
      } else {
        this.targetLevelIndex = clampLevel(this.targetLevelIndex - 1);
        this.correctStreak = 0;
      }
    }

    getLevelEvidence() {
      const evidence = Object.fromEntries(
        LEVELS.map((level) => [level, { shown: 0, correct: 0 }]),
      );
      for (const response of this.history) {
        const levelEvidence = evidence[response.question.level];
        levelEvidence.shown += 1;
        if (response.correct) levelEvidence.correct += 1;
      }
      return evidence;
    }

    qualifiesForLevel(level, evidence) {
      const levelIndex = LEVEL_MAP[level];
      const minShown = levelIndex >= LEVEL_MAP.C1
        ? CONFIG.upperBandMinShown
        : CONFIG.standardBandMinShown;
      const minCorrect = levelIndex >= LEVEL_MAP.C1
        ? CONFIG.upperBandMinCorrect
        : CONFIG.standardBandMinCorrect;
      return evidence[level].shown >= minShown && evidence[level].correct >= minCorrect;
    }

    getEstimatedLevel(evidence) {
      let estimatedLevel = 'Pre-A1';
      for (const level of LEVELS.slice(0, this.targetLevelIndex + 1)) {
        if (this.qualifiesForLevel(level, evidence)) estimatedLevel = level;
      }
      return estimatedLevel;
    }

    hasStableLowBandEvidence() {
      const evidence = this.getLevelEvidence();
      const estimatedLevel = this.getEstimatedLevel(evidence);
      if (estimatedLevel === 'Pre-A1') return this.targetLevelIndex === LEVEL_MAP.A1;
      if (this.targetLevelIndex >= LEVEL_MAP.C1) return false;

      const targetLevel = LEVELS[this.targetLevelIndex];
      if (estimatedLevel !== targetLevel) return false;
      if (evidence[targetLevel].shown < 3 || evidence[targetLevel].correct < 2) return false;
      if (this.targetLevelIndex > LEVEL_MAP.A1) {
        const lowerLevel = LEVELS[this.targetLevelIndex - 1];
        if (!this.qualifiesForLevel(lowerLevel, evidence)) return false;
      }

      const recent = this.history.slice(-4);
      return recent.length === 4 && recent.filter((response) => response.correct).length >= 3;
    }

    shouldFinish() {
      const count = this.history.length;
      if (count < CONFIG.minQuestions) return false;
      if (count >= CONFIG.maxQuestions) return true;

      const targetLevel = LEVELS[this.targetLevelIndex];
      if (this.targetLevelIndex >= LEVEL_MAP.C1) {
        const evidence = this.getLevelEvidence();
        return this.qualifiesForLevel(targetLevel, evidence);
      }
      return this.hasStableLowBandEvidence();
    }

    getStopReason() {
      if (this.history.length >= CONFIG.maxQuestions) return 'max_questions';
      const targetLevel = LEVELS[this.targetLevelIndex];
      if (this.targetLevelIndex >= LEVEL_MAP.C1
        && this.qualifiesForLevel(targetLevel, this.getLevelEvidence())) {
        return 'upper_band_confirmed';
      }
      return 'minimum_evidence';
    }

    computeResult() {
      const answeredResponses = this.history.filter((response) => !response.skipped);
      const correct = answeredResponses.filter((response) => response.correct).length;
      const skipped = this.history.length - answeredResponses.length;
      const evidence = this.getLevelEvidence();
      const estimatedLevel = this.getEstimatedLevel(evidence);
      const levelIndex = LEVELS.indexOf(estimatedLevel);

      const skillAccuracy = Object.fromEntries(
        SKILL_LIST.map((skill) => [skill, { correct: 0, total: 0 }]),
      );
      for (const response of answeredResponses) {
        const skill = response.question.skill;
        if (!skillAccuracy[skill]) skillAccuracy[skill] = { correct: 0, total: 0 };
        skillAccuracy[skill].total += 1;
        if (response.correct) skillAccuracy[skill].correct += 1;
      }

      const strongSkills = Object.entries(skillAccuracy)
        .filter(([, accuracy]) => accuracy.total >= 2 && accuracy.correct / accuracy.total >= 0.7)
        .map(([skill]) => skill);
      let growthSkill = null;
      let lowestRate = Infinity;
      for (const [skill, accuracy] of Object.entries(skillAccuracy)) {
        if (accuracy.total < 2) continue;
        const rate = accuracy.correct / accuracy.total;
        if (rate < lowestRate) {
          lowestRate = rate;
          growthSkill = skill;
        }
      }

      const insufficientData = answeredResponses.length < 4;
      const borderline = estimatedLevel === 'Pre-A1'
        ? (insufficientData ? 'Недостаточно ответов для оценки' : 'Базовые навыки ещё формируются')
        : `Предварительная оценка: ${estimatedLevel}`;

      return {
        estimatedLevel,
        levelIndex,
        correct,
        answered: answeredResponses.length,
        skipped,
        totalQuestions: this.history.length,
        strongSkills,
        growthSkill,
        borderline,
        insufficientData,
        assessmentScope: 'text-only',
        stopReason: this.getStopReason(),
        evidence,
      };
    }
  }

  global.EnglishTestEngine = {
    Engine,
    LEVELS,
    SKILL_LIST,
    FORMAT_LIST,
    CONFIG,
    hashString,
    seededRandom,
  };
})(typeof window !== 'undefined' ? window : globalThis);
