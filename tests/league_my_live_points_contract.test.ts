/**
 * Контракт: withMyLivePoints — свои очки лиги в реальном времени поверх кэша.
 *
 * зачем: «чужие цифры раз в 6 часов, свои — сразу». Свои очки лежат локально и
 * стоят 0 чтений Firestore, поэтому их подставляют на каждом входе. Логика
 * денежно-рейтинговая: ошибка исказит очки игрока и его место в лиге, поэтому
 * покрываем правила явно (правило TDD для чувствительной логики).
 */
import { withMyLivePoints } from '../app/league_open_cache_policy';

type Member = { name?: string; points?: number; isMe?: boolean; uid?: string };

describe('withMyLivePoints', () => {
  it('поднимает СВОИ очки до свежего локального значения', () => {
    const group: Member[] = [
      { name: 'Alpha', points: 900 },
      { name: 'Me', uid: 'u1', points: 100, isMe: true },
    ];
    const out = withMyLivePoints(group, 250, 'u1', 'Me');
    expect(out[1]!.points).toBe(250);
    // чужие строки не трогаем — их обновляет 6-часовой троттл
    expect(out[0]!.points).toBe(900);
  });

  it('НЕ понижает очки, если кэш свежее локального счётчика', () => {
    // очки могли начислиться на другом устройстве и уже приехать в группу
    const group: Member[] = [{ uid: 'u1', points: 500, isMe: true }];
    const out = withMyLivePoints(group, 120, 'u1');
    expect(out[0]!.points).toBe(500);
  });

  it('находит себя по uid, даже если isMe в кэше не проставлен', () => {
    const group: Member[] = [{ uid: 'u1', name: 'Me', points: 10 }];
    const out = withMyLivePoints(group, 77, 'u1');
    expect(out[0]!.points).toBe(77);
    expect(out[0]!.isMe).toBe(true);
  });

  it('находит себя по имени, только когда uid неизвестен', () => {
    const group: Member[] = [{ name: 'Me', points: 10 }];
    expect(withMyLivePoints(group, 77, null, 'Me')[0]!.points).toBe(77);
    // при известном uid имя НЕ должно случайно совпасть с чужим игроком
    const other: Member[] = [{ name: 'Me', uid: 'someone-else', points: 10 }];
    expect(withMyLivePoints(other, 77, 'u1', 'Me')[0]!.points).toBe(10);
  });

  it('не дорисовывает себя, если в группе нас нет', () => {
    const group: Member[] = [{ name: 'Alpha', uid: 'u2', points: 5 }];
    const out = withMyLivePoints(group, 999, 'u1', 'Me');
    expect(out).toHaveLength(1);
    expect(out[0]!.points).toBe(5);
  });

  it('иммутабельность: исходный массив и объекты не мутируются', () => {
    const mine: Member = { uid: 'u1', points: 10, isMe: true };
    const group: Member[] = [mine];
    const out = withMyLivePoints(group, 300, 'u1');
    expect(mine.points).toBe(10);
    expect(out).not.toBe(group);
    expect(out[0]).not.toBe(mine);
  });

  it('битый ввод не роняет и не даёт отрицательных очков', () => {
    expect(withMyLivePoints(null, 100, 'u1')).toEqual([]);
    expect(withMyLivePoints(undefined, 100, 'u1')).toEqual([]);
    const group: Member[] = [{ uid: 'u1', points: undefined, isMe: true }];
    expect(withMyLivePoints(group, -50, 'u1')[0]!.points).toBe(0);
    expect(withMyLivePoints(group, Number.NaN, 'u1')[0]!.points).toBe(0);
  });

  it('дробные очки округляются вниз — очки лиги целые', () => {
    const group: Member[] = [{ uid: 'u1', points: 0, isMe: true }];
    expect(withMyLivePoints(group, 42.9, 'u1')[0]!.points).toBe(42);
  });
});
