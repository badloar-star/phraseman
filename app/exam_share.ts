import type { Lang } from '../constants/i18n';

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

type ShareExamLang = Lang;

export function buildExamShareMessage(
  lang: ShareExamLang,
  score: number,
  total: number,
  pct: number,
  storeUrl: string,
): string {
  const variantsRu = [
    // зачем (владелец 11.11, аудит текстов; голос — docs/work/VOICE.md): человек отправляет это от своего имени — без угаданного рода, сленга и названия языка, одна улыбка на строку
    `Экзамен в Phraseman сдан: ${score}/${total}! Выдыхаю — и снова за уроки 🎓`,
    `${pct}% на экзамене в Phraseman. Старания окупились 🎯`,
    `Экзамен в Phraseman позади — ${score}/${total}. Это повод для чая. Или шампанского ☕`,
    `Экзамен в Phraseman: ${pct}%. Фраза «ничего не понимаю» официально в прошлом 🎓`,
    `${score}/${total} на экзамене в Phraseman. Почти Шекспир, только скромнее 😎`,
  ];
  const variantsUk = [
    `Іспит у Phraseman складено: ${score}/${total}! Видихаю — і знову до уроків 🎓`,
    `${pct}% на іспиті в Phraseman. Старання окупилися 🎯`,
    `Іспит у Phraseman позаду — ${score}/${total}. Це привід для чаю. Або шампанського ☕`,
    `Іспит у Phraseman: ${pct}%. Фраза «нічого не розумію» офіційно в минулому 🎓`,
    `${score}/${total} на іспиті в Phraseman. Майже Шекспір, тільки скромніше 😎`,
  ];
  const variantsEs = [
    `¡Lo logré! Aprobé el examen en Phraseman: ${score}/${total}. ¡Ahora sí que pueden preocuparse los nativos! 🎓🔥`,
    `¡${pct}% en el examen! Phraseman lo confirma: mi inglés no es un mito, es realidad. 🎓🎯`,
    `¡Uf, hecho! Superé el examen en Phraseman (${score}/${total}). Ya me lo merecía, un descansito (aunque sea poco). 🏆🥤`,
    `¡Examen de Phraseman aprobado! Un ${pct}% — nada mal. Mi inglés ya no se queda solo en «no entiendo nada». 🎓`,
    `¡Libertad para los loros… y para mí! 🎓 Aprobé el examen en Phraseman: ${score}/${total}. ¡Todo un astro! 🌌`,
    `Misión cumplida. 🎓 Examen de Phraseman: ${pct}%. Mi inglés, nivel «casi Shakespeare».`,
    `¡Lo hice! Aprobé el examen en Phraseman con un ${pct}%. 🎓 Ya estoy oficialmente en modo pro del inglés. 🥳`,
    `Examen de Phraseman: ${score}/${total}. 🎓 ¡El esfuerzo mereció la pena! Un brindis (o un té). ☕️🥂`,
    `¡Barrera superada! 🎓 ${pct}% de aciertos en Phraseman: el nivel no para de subir. 🎯`,
  ];
  const variantsEn = [
    `I did it! Passed the Phraseman exam with ${score}/${total}. My English just leveled up! 🎓🔥`,
    `${pct}% on the exam! Phraseman confirms it: my English is no myth, it's real. 🎓🎯`,
    `Phraseman exam done: ${score}/${total}. The effort paid off! ☕️🥂`,
  ];
  const variantsPtBr = [
    `Consegui! Passei no exame do Phraseman com ${score}/${total}. Agora meu inglês entrou em modo perigo! 🎓🔥`,
    `${pct}% no exame! O Phraseman confirma: meu inglês não é mito, é realidade. 🎓🎯`,
    `Exame do Phraseman concluído: ${score}/${total}. O esforço valeu a pena! ☕️🥂`,
  ];
  const variantsVi = [
    `Mình làm được rồi! Vượt qua bài kiểm tra Phraseman với ${score}/${total}. Tiếng Anh lên cấp thật rồi! 🎓🔥`,
    `${pct}% trong bài kiểm tra! Phraseman xác nhận: tiếng Anh của mình không còn là chuyện đùa. 🎓🎯`,
    `Đã xong bài kiểm tra Phraseman (${score}/${total}). Nghỉ một chút rồi học tiếp! 🏆🥤`,
  ];
  const variantsId = [
    `Aku berhasil! Ujian Phraseman lulus dengan ${score}/${total}. Bahasa Inggrisku naik level! 🎓🔥`,
    `${pct}% di ujian! Phraseman membuktikan: bahasa Inggrisku bukan mitos. 🎓🎯`,
    `Ujian Phraseman selesai: ${score}/${total}. Usahaku terbayar! ☕️🥂`,
  ];
  const variantsTr = [
    `Başardım! Phraseman sınavını ${score}/${total} ile geçtim. İngilizcem resmen seviye atladı! 🎓🔥`,
    `Sınavda %${pct}! Phraseman onayladı: İngilizcem artık efsane değil, gerçek. 🎓🎯`,
    `Phraseman sınavı bitti: ${score}/${total}. Emekler karşılığını verdi! ☕️🥂`,
  ];
  const variantsPl = [
    `Udało się! Egzamin w Phraseman zdany na ${score}/${total}. Mój angielski właśnie awansował! 🎓🔥`,
    `${pct}% na egzaminie! Phraseman potwierdza: mój angielski to już nie mit. 🎓🎯`,
    `Egzamin w Phraseman zakończony: ${score}/${total}. Wysiłek się opłacił! ☕️🥂`,
  ];
  const pools: Record<ShareExamLang, readonly string[]> = {
    ru: variantsRu,
    uk: variantsUk,
    en: variantsEn,
    es: variantsEs,
    'pt-BR': variantsPtBr,
    vi: variantsVi,
    id: variantsId,
    tr: variantsTr,
    pl: variantsPl,
  };
  const pool = pools[lang] ?? pools.ru;
  return `${pickRandom(pool)}\n${storeUrl}`;
}

/**
 * Подпись к текстовому шерингу награды.
 *
 * Тексты сознательно НЕ содержат слов «сертификат» / «диплом» / «академия» /
 * «выпускник» — это игровая награда приложения, а не официальная
 * квалификация (см. дисклеймер в экране награды).
 */
export function buildCertificateShareMessage(
  lang: ShareExamLang,
  name: string,
  pct: number,
  storeUrl: string,
): string {
  const cleanName = (name || '').trim();
  const variantsRu = [
    cleanName
      ? `${cleanName}: уровень B2 в Phraseman взят! 🎯 ${pct}% на финальном тесте.`
      : `Уровень B2 в Phraseman взят! 🎯 ${pct}% на финальном тесте.`,
    cleanName
      ? `${cleanName}: финальный тест Phraseman пройден на ${pct}%. 🏆 Уровень B2 — есть!`
      : `Финальный тест Phraseman пройден на ${pct}%. 🏆 Уровень B2 — есть!`,
    cleanName
      ? `${cleanName} — мой английский на уровне B2 по Phraseman! 🎯 Результат: ${pct}%.`
      : `Мой английский на уровне B2 по Phraseman! 🎯 Результат: ${pct}%.`,
  ];
  const variantsUk = [
    cleanName
      ? `${cleanName}: рівень B2 у Phraseman взято! 🎯 ${pct}% на фінальному тесті.`
      : `Рівень B2 у Phraseman взято! 🎯 ${pct}% на фінальному тесті.`,
    cleanName
      ? `${cleanName}: фінальний тест Phraseman пройдено на ${pct}%. 🏆 Рівень B2 — є!`
      : `Фінальний тест Phraseman пройдено на ${pct}%. 🏆 Рівень B2 — є!`,
    cleanName
      ? `${cleanName} — моя англійська на рівні B2 за Phraseman! 🎯 Результат: ${pct}%.`
      : `Моя англійська на рівні B2 за Phraseman! 🎯 Результат: ${pct}%.`,
  ];
  const variantsEs = [
    cleanName
      ? `¡${cleanName} ha alcanzado el nivel B2 en Phraseman! 🎯 ${pct}% en la prueba final.`
      : `¡Nivel B2 en Phraseman conseguido! 🎯 ${pct}% en la prueba final.`,
    cleanName
      ? `${cleanName} completó la prueba final de Phraseman (${pct}%). 🏆 ¡B2 asegurado!`
      : `Prueba final en Phraseman: ${pct}%. 🏆 Nivel B2 conseguido.`,
    cleanName
      ? `${cleanName}: mi inglés está a nivel B2 según Phraseman. 🎯 Resultado: ${pct}%.`
      : `Mi inglés está a nivel B2 según Phraseman. 🎯 Resultado: ${pct}%.`,
  ];
  const variantsEn = [
    cleanName
      ? `${cleanName} reached B2 level in Phraseman! 🎯 ${pct}% on the final test.`
      : `B2 level in Phraseman unlocked! 🎯 ${pct}% on the final test.`,
    cleanName
      ? `${cleanName} completed the Phraseman final test with ${pct}%. 🏆 B2 secured!`
      : `Phraseman final test done: ${pct}%. 🏆 B2 secured!`,
    cleanName
      ? `${cleanName}: my English is at B2 level according to Phraseman. 🎯 Score: ${pct}%.`
      : `My English is at B2 level according to Phraseman. 🎯 Score: ${pct}%.`,
  ];
  const variantsPtBr = [
    cleanName
      ? `${cleanName} alcançou o nível B2 no Phraseman! 🎯 ${pct}% no teste final.`
      : `Nível B2 no Phraseman desbloqueado! 🎯 ${pct}% no teste final.`,
    cleanName
      ? `${cleanName} completou o teste final do Phraseman com ${pct}%. 🏆 B2 garantido!`
      : `Teste final do Phraseman concluído com ${pct}%. 🏆 B2 garantido!`,
    cleanName
      ? `${cleanName}: meu inglês está no nível B2 segundo o Phraseman. 🎯 Resultado: ${pct}%.`
      : `Meu inglês está no nível B2 segundo o Phraseman. 🎯 Resultado: ${pct}%.`,
  ];
  const variantsVi = [
    cleanName
      ? `${cleanName} đã đạt cấp độ B2 trong Phraseman! 🎯 ${pct}% ở bài kiểm tra cuối.`
      : `Đã mở cấp độ B2 trong Phraseman! 🎯 ${pct}% ở bài kiểm tra cuối.`,
    cleanName
      ? `${cleanName} hoàn thành bài kiểm tra cuối của Phraseman với ${pct}%. 🏆 B2 đây rồi!`
      : `Bài kiểm tra cuối của Phraseman đạt ${pct}%. 🏆 B2 đây rồi!`,
    cleanName
      ? `${cleanName}: tiếng Anh của mình ở cấp độ B2 theo Phraseman. 🎯 Kết quả: ${pct}%.`
      : `Tiếng Anh của mình ở cấp độ B2 theo Phraseman. 🎯 Kết quả: ${pct}%.`,
  ];
  const variantsId = [
    cleanName
      ? `${cleanName} mencapai level B2 di Phraseman! 🎯 ${pct}% di tes final.`
      : `Level B2 di Phraseman tercapai! 🎯 ${pct}% di tes final.`,
    cleanName
      ? `${cleanName} menyelesaikan tes final Phraseman dengan ${pct}%. 🏆 B2 aman!`
      : `Tes final Phraseman selesai dengan ${pct}%. 🏆 B2 aman!`,
    cleanName
      ? `${cleanName}: bahasa Inggrisku level B2 menurut Phraseman. 🎯 Hasil: ${pct}%.`
      : `Bahasa Inggrisku level B2 menurut Phraseman. 🎯 Hasil: ${pct}%.`,
  ];
  const variantsTr = [
    cleanName
      ? `${cleanName} Phraseman'de B2 seviyesine ulaştı! 🎯 Final testinde %${pct}.`
      : `Phraseman'de B2 seviyesi tamam! 🎯 Final testinde %${pct}.`,
    cleanName
      ? `${cleanName} Phraseman final testini %${pct} ile tamamladı. 🏆 B2 tamam!`
      : `Phraseman final testi %${pct} ile tamamlandı. 🏆 B2 tamam!`,
    cleanName
      ? `${cleanName}: Phraseman'e göre İngilizcem B2 seviyesinde. 🎯 Sonuç: %${pct}.`
      : `Phraseman'e göre İngilizcem B2 seviyesinde. 🎯 Sonuç: %${pct}.`,
  ];
  const variantsPl = [
    cleanName
      ? `${cleanName} osiągnął/osiągnęła poziom B2 w Phraseman! 🎯 ${pct}% w teście finałowym.`
      : `Poziom B2 w Phraseman zdobyty! 🎯 ${pct}% w teście finałowym.`,
    cleanName
      ? `${cleanName} ukończył/ukończyła test finałowy Phraseman na ${pct}%. 🏆 B2 jest!`
      : `Test finałowy Phraseman ukończony na ${pct}%. 🏆 B2 jest!`,
    cleanName
      ? `${cleanName}: mój angielski jest na poziomie B2 według Phraseman. 🎯 Wynik: ${pct}%.`
      : `Mój angielski jest na poziomie B2 według Phraseman. 🎯 Wynik: ${pct}%.`,
  ];
  const pools: Record<ShareExamLang, readonly string[]> = {
    ru: variantsRu,
    uk: variantsUk,
    en: variantsEn,
    es: variantsEs,
    'pt-BR': variantsPtBr,
    vi: variantsVi,
    id: variantsId,
    tr: variantsTr,
    pl: variantsPl,
  };
  const pool = pools[lang] ?? pools.ru;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
