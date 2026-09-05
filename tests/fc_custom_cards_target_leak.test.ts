/**
 * Доказательство протечки языков в пользовательских карточках (найдено 2026-09-05).
 *
 * Правило проекта «сперва логи»: этот тест — постоянная форма трассировки.
 * Он печатает ФАКТ (в какой именно ключ ушла запись и что вернулось при чтении),
 * а не рассуждение, и остаётся в репозитории как сторож против регрессии.
 *
 * Дыра 1: карточка, созданная при активном French, обязана лежать во
 * французском хранилище, а не в общем английском.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetCustomCardsStoreForTests,
  listCustomCards,
  upsertCustomCard,
} from '../app/flashcards/custom_cards_store';
import { customFlashcardsKey } from '../app/target_storage_keys';
import type { CardItem } from '../app/flashcards/types';

const EN_KEY = customFlashcardsKey('en');
const FR_KEY = customFlashcardsKey('fr');

const TRACE = '[FC-TARGET-LEAK]';

const card = (id: string): CardItem => ({
  id,
  en: `en_${id}`,
  ru: `ru_${id}`,
  uk: `uk_${id}`,
  categoryId: 'custom',
  isSystem: false,
});

async function dumpKeys(step: string): Promise<{ en: string | null; fr: string | null }> {
  const en = await AsyncStorage.getItem(EN_KEY);
  const fr = await AsyncStorage.getItem(FR_KEY);
  // зачем: печатаем оба хранилища целиком — видно, куда реально ушла запись,
  // а не только тот ключ, который мы ожидали.
  console.log(`${TRACE} ${step} :: ${EN_KEY} = ${en ?? 'null'}`);
  console.log(`${TRACE} ${step} :: ${FR_KEY} = ${fr ?? 'null'}`);
  return { en, fr };
}

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  __resetCustomCardsStoreForTests();
});

describe('изоляция языков: пользовательские карточки', () => {
  it('карточка, созданная при studyTarget=fr, лежит во французском ключе', async () => {
    console.log(`${TRACE} вход :: upsertCustomCard(card fr_only), studyTarget=fr`);
    await upsertCustomCard(card('fr_only'), 'fr');
    const after = await dumpKeys('после записи при fr');

    expect(after.fr).toContain('fr_only');
    expect(after.en ?? '').not.toContain('fr_only');
  });

  it('английские и французские карточки не видят друг друга', async () => {
    await upsertCustomCard(card('en_only'), 'en');
    await __resetCustomCardsStoreForTests();
    await upsertCustomCard(card('fr_only'), 'fr');
    await dumpKeys('после записи в оба языка');

    __resetCustomCardsStoreForTests();
    const enList = await listCustomCards('en');
    __resetCustomCardsStoreForTests();
    const frList = await listCustomCards('fr');
    console.log(`${TRACE} чтение en -> [${enList.map((c) => c.id).join(',')}]`);
    console.log(`${TRACE} чтение fr -> [${frList.map((c) => c.id).join(',')}]`);

    expect(enList.map((c) => c.id)).toEqual(['en_only']);
    expect(frList.map((c) => c.id)).toEqual(['fr_only']);
  });

  it('миграция: карточки из общего ключа остаются английскими и не пропадают', async () => {
    // Существующий пользователь: всё лежит в общем (английском) ключе.
    await AsyncStorage.setItem(EN_KEY, JSON.stringify([card('legacy_a'), card('legacy_b')]));
    __resetCustomCardsStoreForTests();

    const enList = await listCustomCards('en');
    __resetCustomCardsStoreForTests();
    const frList = await listCustomCards('fr');
    console.log(`${TRACE} миграция :: en -> [${enList.map((c) => c.id).join(',')}], fr -> [${frList.map((c) => c.id).join(',')}]`);

    expect(enList.map((c) => c.id)).toEqual(['legacy_a', 'legacy_b']);
    expect(frList).toEqual([]);
  });
});
