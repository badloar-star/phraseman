// зачем (жалоба №6 «подвисает, теряет связь с микрофоном», координатор 24.10): при быстром «Дальше» новая запись ждёт, пока прежняя освободит микрофон,
// но не дольше потолка; без прежней записи — не ждёт вовсе. Хук голосового задания использует это перед startHoldRecording.
import { awaitPreviousCaptureReleaseV1 } from '../modules/learning-v2/runtime/await_previous_capture_release_v1';
import { readSource } from './helpers/read_source';

describe('ожидание освобождения микрофона прежней записью', () => {
  it('без прежней записи — сразу', async () => {
    await expect(awaitPreviousCaptureReleaseV1(null, 1500)).resolves.toMatchObject({ outcome: 'none', waitedMs: 0 });
  });

  it('прежняя запись освободилась — ждём ровно до этого момента', async () => {
    let release!: () => void;
    const inFlight = new Promise<void>((r) => { release = r; });
    const pending = awaitPreviousCaptureReleaseV1(inFlight, 1500);
    setTimeout(() => release(), 20);
    await expect(pending).resolves.toMatchObject({ outcome: 'released' });
  });

  it('остановка упала — не висим, идём дальше', async () => {
    await expect(awaitPreviousCaptureReleaseV1(Promise.reject(new Error('native')), 1500)).resolves.toMatchObject({ outcome: 'failed' });
  });

  it('зависшая остановка не блокирует следующее задание дольше потолка', async () => {
    const never = new Promise<void>(() => undefined);
    const res = await awaitPreviousCaptureReleaseV1(never, 30);
    expect(res.outcome).toBe('timeout');
    expect(res.waitedMs).toBeLessThan(500);
  });

  it('хук ждёт освобождения перед новой записью и помнит незавершённую остановку', () => {
    const hook = readSource('hooks/use_learning_v2_local_hold_to_talk_v1.ts');
    const waitAt = hook.indexOf('awaitPreviousCaptureReleaseV1(pcmStopInFlightRef.current');
    const startAt = hook.indexOf('recording = startHoldRecording({');
    expect(waitAt).toBeGreaterThan(0);
    expect(waitAt).toBeLessThan(startAt);
    expect(hook).toContain('pcmStopInFlightRef.current = stopping;');
  });
});
