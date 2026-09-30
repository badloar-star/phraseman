#!/usr/bin/env -S npx tsx
/**
 * card_tts_voice_all.ts — массовая озвучка карточек (D128): официальные наборы
 * + (по флагу) уже опубликованные наборы сообщества.
 *
 * зачем: D128 — «озвучить все карточки», но массовая озвучка — ОТДЕЛЬНЫЙ запуск
 * с оценкой стоимости. Скрипт по умолчанию DRY-RUN: считает уникальные
 * (текст, язык), символы и цену, ничего не тратит и не пишет.
 *
 * Ключи/пути/голоса — из functions/src/card_tts_core.ts (тот же дедуп, что у
 * серверного воркера): клип, уже лежащий в Storage, повторно не оплачивается.
 *
 * Источники:
 *   - официальные: app/flashcards/system-cards.ts (английские карточки раздела).
 *     Английские тексты, уже озвученные корпусом фраз (echo, папка flashcard),
 *     НЕ озвучиваются повторно — клиент играет их из корпуса.
 *   - --community: опубликованные наборы из Firestore (нужен прод-доступ ADC /
 *     GOOGLE_APPLICATION_CREDENTIALS, только чтение). Наборы 'none' пропускаются.
 *
 * Запуск:
 *   npx tsx scripts/card_tts_voice_all.ts                      # dry-run, без сети
 *   npx tsx scripts/card_tts_voice_all.ts --community          # dry-run + прод-чтение наборов
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 GOOGLE_APPLICATION_CREDENTIALS=... \
 *     npx tsx scripts/card_tts_voice_all.ts --community --apply   # реальная озвучка
 */
import path from 'node:path';
import { SYSTEM_CARDS } from '../app/flashcards/system-cards';
import { getPhraseAudioUrl } from '../app/phrase_audio_url_map.generated';
import {
  CARD_TTS_CONCURRENCY,
  CARD_TTS_DEFAULT_BUCKET,
  CARD_TTS_MODEL,
  CARD_TTS_SPEED,
  CARD_TTS_STYLE_VERSION,
  CARD_TTS_USD_PER_1K_CHARS,
  CARD_TTS_VOICE_BY_LANGUAGE,
  cardTtsCharCount,
  cardTtsDownloadToken,
  cardTtsEstimateUsd,
  cardTtsInstructions,
  cardTtsTextOfCard,
  mapWithConcurrency,
  planCardTtsItems,
  type CardTtsItem,
  type CardTtsLanguage,
} from '../functions/src/card_tts_core';
import { communityPackTtsLanguage } from '../functions/src/community_pack_language';

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const WITH_COMMUNITY = process.argv.includes('--community');

type Source = { label: string; language: CardTtsLanguage; texts: string[] };

function officialSources(): { sources: Source[]; coveredByCorpus: number } {
  const texts: string[] = [];
  let coveredByCorpus = 0;
  for (const card of SYSTEM_CARDS) {
    const text = cardTtsTextOfCard(card);
    if (!text) continue;
    if (getPhraseAudioUrl(text)) { coveredByCorpus += 1; continue; }
    texts.push(text);
  }
  return { sources: [{ label: 'official:system-cards', language: 'en', texts }], coveredByCorpus };
}

async function communitySources(): Promise<{ sources: Source[]; skippedNone: number }> {
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) admin.initializeApp({ storageBucket: CARD_TTS_DEFAULT_BUCKET });
  // guard-ok: разовый админ-скрипт по флагу --community, только опубликованные (десятки наборов).
  const snap = await admin.firestore().collection('community_packs').where('listingStatus', '==', 'published').get();
  const sources: Source[] = [];
  let skippedNone = 0;
  for (const doc of snap.docs) {
    const pack = doc.data();
    const language = communityPackTtsLanguage(pack.packLanguage, { packId: doc.id });
    if (!language) { skippedNone += 1; continue; }
    const cards = Array.isArray(pack.cards) ? pack.cards : [];
    sources.push({ label: `community:${doc.id}`, language, texts: cards.map(cardTtsTextOfCard) });
  }
  return { sources, skippedNone };
}

function mergePlan(sources: Source[]): { items: CardTtsItem[]; skippedEmpty: number; skippedLong: number; perLanguage: Record<string, { items: number; chars: number }> } {
  const byKey = new Map<string, CardTtsItem>();
  let skippedEmpty = 0;
  let skippedLong = 0;
  for (const source of sources) {
    const { items, skipped } = planCardTtsItems(source.language, source.texts);
    skippedEmpty += skipped.empty;
    skippedLong += skipped.too_long;
    for (const item of items) if (!byKey.has(item.key)) byKey.set(item.key, item);
  }
  const items = [...byKey.values()];
  const perLanguage: Record<string, { items: number; chars: number }> = {};
  for (const item of items) {
    const row = perLanguage[item.language] ?? { items: 0, chars: 0 };
    perLanguage[item.language] = { items: row.items + 1, chars: row.chars + item.text.length };
  }
  return { items, skippedEmpty, skippedLong, perLanguage };
}

async function applyVoicing(items: CardTtsItem[]): Promise<void> {
  if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
    console.error('ОТКАЗ: нужен PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (трата OpenAI).');
    process.exit(2);
  }
  const { requireOpenAiTtsKey } = await import('./openai-tts-key.mjs');
  const openAiKey: string = requireOpenAiTtsKey(ROOT);
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) admin.initializeApp({ storageBucket: CARD_TTS_DEFAULT_BUCKET });
  const bucket = admin.storage().bucket(CARD_TTS_DEFAULT_BUCKET);

  const exists = await mapWithConcurrency(items, 8, async (item) => (await bucket.file(item.objectPath).exists())[0]);
  const missing = items.filter((_, i) => !exists[i]);
  console.log(`[CARD-TTS] apply: уже в Storage ${items.length - missing.length}, озвучить ${missing.length} (${cardTtsCharCount(missing)} симв.)`);

  let ok = 0;
  let failed = 0;
  let okChars = 0;
  await mapWithConcurrency(missing, CARD_TTS_CONCURRENCY, async (item) => {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CARD_TTS_MODEL,
          voice: CARD_TTS_VOICE_BY_LANGUAGE[item.language],
          input: item.text,
          speed: CARD_TTS_SPEED,
          instructions: cardTtsInstructions(item.language),
          response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`http_${response.status}: ${(await response.text()).slice(0, 200)}`);
      const audio = Buffer.from(await response.arrayBuffer());
      if (audio.length < 500) throw new Error(`audio_too_small_${audio.length}`);
      await bucket.file(item.objectPath).save(audio, {
        resumable: false,
        contentType: 'audio/mpeg',
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: cardTtsDownloadToken(item.objectPath),
            language: item.language,
            voice: CARD_TTS_VOICE_BY_LANGUAGE[item.language],
            model: CARD_TTS_MODEL,
            styleVersion: CARD_TTS_STYLE_VERSION,
          },
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
      ok += 1;
      okChars += item.text.length;
    } catch (error: unknown) {
      failed += 1;
      console.error('[CARD-TTS] apply:item_failed', item.language, item.key, error instanceof Error ? error.message : String(error));
    }
  });
  await admin.firestore().collection('card_tts_billing').add({
    operation: 'card_tts',
    source: 'script:card_tts_voice_all',
    model: CARD_TTS_MODEL,
    language: 'mixed',
    characters: okChars,
    requests: missing.length,
    failedRequests: failed,
    estCostUsd: cardTtsEstimateUsd(okChars),
    createdAtMs: Date.now(),
  }).catch((error: unknown) => console.error('[CARD-TTS] apply:billing_write_failed', error instanceof Error ? error.message : String(error)));
  console.log(`[CARD-TTS] apply: готово ${ok}, ошибок ${failed}, ~$${cardTtsEstimateUsd(okChars)}`);
}

async function main(): Promise<void> {
  const official = officialSources();
  const sources = [...official.sources];
  let skippedNone = 0;
  if (WITH_COMMUNITY) {
    const community = await communitySources();
    sources.push(...community.sources);
    skippedNone = community.skippedNone;
  }
  const plan = mergePlan(sources);
  const chars = cardTtsCharCount(plan.items);
  console.log('── Озвучка карточек (D128) ──');
  console.log(`официальные карточки: ${SYSTEM_CARDS.length}, уже озвучены корпусом фраз (echo): ${official.coveredByCorpus}`);
  console.log(WITH_COMMUNITY
    ? `наборы сообщества: ${sources.length - official.sources.length} опубликованных, пропущено «без языка»: ${skippedNone}`
    : 'наборы сообщества: не считались (добавь --community, нужен прод-доступ на чтение)');
  console.log(`уникальных (текст, язык) к озвучке: ${plan.items.length}; пропущено пустых: ${plan.skippedEmpty}, длиннее лимита: ${plan.skippedLong}`);
  for (const [language, row] of Object.entries(plan.perLanguage)) {
    console.log(`  ${language}: ${row.items} клипов, ${row.chars} симв., голос ${CARD_TTS_VOICE_BY_LANGUAGE[language as CardTtsLanguage]}`);
  }
  console.log(`символов всего: ${chars}`);
  console.log(`оценка трат OpenAI: ~$${cardTtsEstimateUsd(chars).toFixed(4)} (ставка $${CARD_TTS_USD_PER_1K_CHARS}/1000 симв., ${CARD_TTS_MODEL}; клипы, уже лежащие в Storage, не оплачиваются)`);
  if (!APPLY) {
    console.log('\nDRY-RUN. Ничего не потрачено и не записано. Реальный запуск: --apply + PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 + прод-доступ.');
    return;
  }
  await applyVoicing(plan.items);
}

main().catch((error: unknown) => {
  console.error('[CARD-TTS] script_failed', error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
