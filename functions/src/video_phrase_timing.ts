import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { normalizeVideoPhraseList } from '../../shared/video_phrases_contract';
import {
  alignPhrasesToTranscript,
  parseTranscript,
  TIMING_CONFIDENT_SCORE,
} from '../../shared/video_transcript_timing';

/**
 * Кнопка «Загрузить транскрипцию» в «Видео-студии».
 *
 * зачем (владелец 2026-09-25): тап по фразе в приложении перематывает ролик к
 * моменту, где она звучит. Админ загружает .srt/.vtt (или текст расшифровки
 * YouTube), сервер подбирает секунду каждой фразе и возвращает её в редактор.
 * Ничего не пишет: время уходит в черновик обычной кнопкой «Сохранить
 * черновик», поэтому публикация и наборы карточек работают как раньше.
 *
 * Отдельный файл, а не `video_phrases.ts`: 0 чтений Firestore, 0 секретов и
 * 0 вызовов ИИ — чистое сопоставление текста, копейки на вызов.
 */
const REGION = 'us-central1';
const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;

function requireContentWriter(auth: { uid?: string; token?: Record<string, unknown> } | undefined): string {
  if (!auth?.uid || !auth.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role: AdminRole = hasAdminRole(auth.token.adminRole) ? auth.token.adminRole : 'owner';
  if (!hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot edit video phrases');
  return auth.uid;
}

export const adminAlignVideoPhraseTranscript = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, memory: '512MiB', timeoutSeconds: 60 }, async (request) => {
  const uid = requireContentWriter(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
  const videoId = String(request.data?.videoId ?? '').trim();
  if (!VIDEO_ID_RE.test(videoId)) throw new HttpsError('invalid-argument', 'video_id_invalid');

  let phrases;
  try { phrases = normalizeVideoPhraseList(videoId, request.data?.phrases); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'phrases_invalid'); }
  if (!phrases.length) throw new HttpsError('invalid-argument', 'phrases_required');

  let cues;
  try { cues = parseTranscript(String(request.data?.transcript ?? '')); }
  catch (error) {
    const reason = error instanceof Error ? error.message : 'transcript_invalid';
    console.warn(`[VIDEO-TIMING] ${videoId}: транскрипция отклонена — ${reason}`);
    throw new HttpsError('invalid-argument', reason);
  }

  const startedAt = Date.now();
  const matches = alignPhrasesToTranscript(phrases, cues);
  const timed = phrases.map((phrase, index) => {
    const startSec = matches[index].startSec;
    // Не нашли — оставляем прежнее время (например, выставленное руками), а не стираем.
    return startSec === null ? phrase : { ...phrase, startSec };
  });
  const found = matches.filter((match) => match.startSec !== null).length;
  const unsure = matches.filter((match) => match.startSec !== null && match.score < TIMING_CONFIDENT_SCORE).length;
  console.log(`[VIDEO-TIMING] ${videoId} uid=${uid}: реплик ${cues.length}, фраз ${phrases.length}, найдено ${found}, проверить ${unsure}, не найдено ${phrases.length - found}, ${Date.now() - startedAt} мс`);

  return {
    ok: true,
    videoId,
    cueCount: cues.length,
    lastCueSec: cues[cues.length - 1].endSec,
    phrases: timed,
    matches,
    counts: { found, unsure, missing: phrases.length - found },
  };
});
