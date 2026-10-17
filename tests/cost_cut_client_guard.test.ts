// зачем (расходы, координатор 17.10, безопасные пункты клиентского аудита): сторож — прогревы Диалогов не чаще раза в 30 минут и не с Главной,
// каталоги наборов/видео живут в кэше 24 часа, рассылка и колокольчик ходят в сеть редко; каждый ранний выход называет причину в логе [COST-CUT].
import fs from 'fs';
import path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('клиентские расходы: прогревы, каталоги, сообщения', () => {
  it('прогрев Диалогов V2: 30 минут, лог [COST-CUT] на выходе', () => {
    const src = read('app/dialogue_v2_warmup.ts');
    expect(src).toContain('DIALOGUE_V2_WARM_INTERVAL_MS = 30 * 60 * 1000');
    expect(src).toContain('[COST-CUT] dialogue_v2_warm skipped reason=ttl_not_expired');
  });
  it('Главная не греет Диалоги', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("useDialogueV2Warmup(false, 'home_tile')");
    expect(read('hooks/use_dialogue_v2_warmup.ts')).toContain('[COST-CUT] dialogue_v2_warm skipped reason=disabled');
  });
  it('стрим-прогрев Диалогов: не чаще раза в 30 минут на цель обучения', () => {
    const src = read('app/ai_dialog_stream_client.ts');
    expect(src).toContain('STREAM_WARM_TTL_MS = 30 * 60 * 1000');
    expect(src).toContain('[COST-CUT] premium_dialog_stream_warm skipped reason=ttl_not_expired');
  });
  it('каталоги наборов и видео: TTL 24 часа', () => {
    expect(read('app/community_packs/communityFirestore.ts')).toContain('COMMUNITY_CATALOG_TTL_MS = 24 * 60 * 60 * 1000');
    expect(read('app/video_phrase_set_packs.ts')).toContain('VIDEO_PHRASE_SET_PACKS_TTL_MS = 24 * 60 * 60 * 1000');
  });
  it('сообщения и рассылка: открытие колокольчика раз в час, пустая рассылка 12 ч, лог на выходе', () => {
    expect(read('components/AppMessagesInbox.tsx')).toContain('INBOX_OPEN_REFRESH_MIN_INTERVAL_MS = 60 * 60_000');
    expect(read('app/global_broadcast_modal.ts')).toContain('GLOBAL_BROADCAST_EMPTY_TTL_MS = 12 * 60 * 60 * 1000');
    expect(read('app/app_messages.ts')).toContain('[COST-CUT] app_messages skipped reason=ttl_not_expired');
  });
});
