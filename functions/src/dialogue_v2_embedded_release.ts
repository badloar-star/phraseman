import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';

/**
 * Встроенный (едет вместе с кодом функций) выпуск Диалогов V2.
 *
 * зачем (владелец 01.10, «Диалоги не загрузились»): в Firestore нет указателя
 * dialogue_v2_release_control/active, а публикатора в репозитории нет. Выпуск
 * собирается скриптом scripts/dialogue_v2_embedded_release.ts из одобренного
 * владельцем 28.09 кандидата и лежит в generated/. Он НЕ даёт полномочий сам по
 * себе: каждый вызывающий по-прежнему прогоняет его через полный авторизатор
 * (покрытие 304, PASS всех ролей, пины манифеста, хэш каждого пакета).
 *
 * Читается лениво и один раз на экземпляр: ~600 КБ JSON не должны парситься на
 * холодном старте функций, которым Диалоги не нужны (см. support_repository_context).
 */
const EMBEDDED_SCHEMA = 'dialogue-v2-embedded-server-release.v1';

let cached: DialogueV2ServerRelease | null | undefined;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function loadEmbeddedDialogueV2ServerRelease(): DialogueV2ServerRelease | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const file = record(require('./generated/dialogue_v2_server_release.json'));
    const release = record(file?.release);
    if (file?.schemaVersion !== EMBEDDED_SCHEMA || !release
      || !record(release.manifest) || !record(release.packets)) {
      console.error('[DIALOGUE-V2] embedded_release:invalid_shape', JSON.stringify({
        schemaVersion: file?.schemaVersion ?? null,
        hasRelease: Boolean(release),
      }));
      cached = null;
      return cached;
    }
    // Ровно два ключа: авторизатор отвергает любые лишние поля конверта.
    cached = { manifest: release.manifest, packets: release.packets } as unknown as DialogueV2ServerRelease;
    return cached;
  } catch (error) {
    console.error('[DIALOGUE-V2] embedded_release:load_failed', error instanceof Error ? error.message : String(error));
    cached = null;
    return cached;
  }
}

/** Только для тестов: сбросить кэш экземпляра. */
export function resetEmbeddedDialogueV2ServerReleaseForTests(): void {
  cached = undefined;
}
