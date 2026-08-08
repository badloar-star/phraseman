import { triLang, type Lang } from '../../constants/i18n';

export function arenaNextStepCopy(lang: Lang, winner: boolean, serverConfirmed: boolean): string {
  if (winner && serverConfirmed) {
    return triLang(lang, { ru: 'Серия побед продолжает расти', uk: 'Серія перемог продовжує зростати', es: 'La racha de victorias sigue creciendo', 'pt-BR': 'A sequência de vitórias continua crescendo', vi: 'Chuỗi chiến thắng tiếp tục tăng', id: 'Rentetan kemenangan terus bertambah', tr: 'Galibiyet serisi büyümeye devam ediyor', pl: 'Seria zwycięstw nadal rośnie' });
  }
  if (winner) {
    return triLang(lang, { ru: 'Результат матча сохраняется', uk: 'Результат матчу зберігається', es: 'Guardando el resultado del duelo', 'pt-BR': 'Salvando o resultado da partida', vi: 'Đang lưu kết quả trận đấu', id: 'Menyimpan hasil pertandingan', tr: 'Maç sonucu kaydediliyor', pl: 'Zapisywanie wyniku meczu' });
  }
  return triLang(lang, { ru: 'Следующий раунд поможет вернуть темп', uk: 'Наступний раунд допоможе повернути темп', es: 'La próxima ronda ayudará a recuperar el ritmo', 'pt-BR': 'A próxima rodada ajuda a recuperar o ritmo', vi: 'Vòng tiếp theo sẽ giúp lấy lại nhịp độ', id: 'Ronde berikutnya membantu mengembalikan ritme', tr: 'Sonraki tur ritmi geri kazandırır', pl: 'Następna runda pomoże odzyskać rytm' });
}

export function lessonSavedResultCopy(lang: Lang): string {
  return triLang(lang, { ru: 'Результат сохранён в твоём пути', uk: 'Результат збережено у твоєму шляху', es: 'El resultado quedó guardado en tu camino', 'pt-BR': 'O resultado foi salvo no seu caminho', vi: 'Kết quả đã được lưu vào hành trình của bạn', id: 'Hasil tersimpan di perjalananmu', tr: 'Sonuç yolculuğuna kaydedildi', pl: 'Wynik zapisano na twojej drodze' });
}
