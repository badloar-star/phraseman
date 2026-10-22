/**
 * Мой ответ на «Фразу дня вдвоём» (идея 8) — запись friends_phrase_v1 на телефоне.
 *
 * зачем (закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи»): ответ сохраняется сразу (карточка открывает
 * ответы друзей без ожидания сети), в облако уходит склеенным патчем синхронизации — отдельной записи и транзакции голоса нет.
 * Нет сети — ответ всё равно засчитан на телефоне и уйдёт при следующей синхронизации. За выключателем «Вместе».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncToCloud } from '../cloud_sync';
import { getLocalDayKey } from '../local_date';
import { FRIEND_PHRASE_STORAGE_KEY, parseFriendPhraseAnswer, serializeFriendPhraseAnswer, type FriendPhraseAnswer } from './friend_phrase';
import { FRIENDS_TOGETHER_UI_ENABLED } from './together_config';

const LOG = '[FRIEND-PHRASE]';

export async function readMyPhraseAnswer(): Promise<FriendPhraseAnswer | null> {
  try {
    return parseFriendPhraseAnswer(await AsyncStorage.getItem(FRIEND_PHRASE_STORAGE_KEY));
  } catch (error) {
    console.warn(`${LOG} свой ответ не прочитался: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
    return null;
  }
}

/** Записать ответ на фразу дня. null — выключатель выключен или запись не удалась (причина в журнале). */
export async function recordMyPhraseAnswer(input: Readonly<{ phraseId: string; optionId: string; correct: boolean }>): Promise<FriendPhraseAnswer | null> {
  if (!FRIENDS_TOGETHER_UI_ENABLED) {
    console.log(`${LOG} ответ не записан: выключатель «Вместе» выключен`); // guard-ok: ранний выход называет причину
    return null;
  }
  const answer = parseFriendPhraseAnswer({ v: 1, day: getLocalDayKey(), ...input });
  if (!answer) {
    console.warn(`${LOG} ответ не записан: неверные поля phraseId=${input.phraseId} optionId=${input.optionId}`); // guard-ok: ранний выход называет причину
    return null;
  }
  try {
    await AsyncStorage.setItem(FRIEND_PHRASE_STORAGE_KEY, serializeFriendPhraseAnswer(answer));
    void syncToCloud();
    console.log(`${LOG} ответ записан day=${answer.day} phrase=${answer.phraseId} option=${answer.optionId} correct=${answer.correct}`); // guard-ok: одна строка на ответ
    return answer;
  } catch (error) {
    console.warn(`${LOG} ответ не сохранился: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
    return null;
  }
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
