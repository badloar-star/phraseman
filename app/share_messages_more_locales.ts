/**
 * Тексты «Поделиться» (медаль, открытый урок, зачёт, экзамен Лингмана, достижение) для en, pt-BR, vi, id, tr, pl.
 *
 * зачем (владелец 17.10 «открой язык английский», аудит переводчика): buildCelebrationShareBody и buildAchievementShareMessage
 * знали только ru/uk/es, остальные шесть языков получали РУССКИЙ текст и отправляли его друзьям. Пулы короче русских
 * (по три варианта, как в exam_share.ts), без названия изучаемого языка и без рода (D188): человек может учить не английский.
 * Нет пула для языка → null, вызывающий берёт свою ветку ru/uk/es как раньше.
 */
import type { Lang } from '../constants/i18n';

type MoreLocale = 'en' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type Pools<A extends unknown[]> = Readonly<Record<MoreLocale, (...args: A) => readonly string[]>>;

const MORE_LOCALES: ReadonlySet<string> = new Set<MoreLocale>(['en', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const isMoreLocale = (lang: Lang): lang is MoreLocale => MORE_LOCALES.has(lang);
const pick = (values: readonly string[]): string => values[Math.floor(Math.random() * values.length)]!;

const MEDAL: Pools<[lessonId: number, score: number, emoji: string]> = {
  en: (n, s, e) => [
    `Framing this one! ${e} Medal for lesson ${n} in Phraseman ★ ${s} 🔥`,
    `Lesson ${n} — done ✅ Medal earned in Phraseman ★ ${s}. On to the next one! 🚀`,
    `One more medal in Phraseman: lesson ${n} ★ ${s}. I'm on a roll! 🔥`,
  ],
  'pt-BR': (n, s, e) => [
    `Vou emoldurar essa! ${e} Medalha da lição ${n} no Phraseman ★ ${s} 🔥`,
    `Lição ${n} — feita ✅ Medalha conquistada no Phraseman ★ ${s}. Bora para a próxima! 🚀`,
    `Mais uma medalha no Phraseman: lição ${n} ★ ${s}. Não paro mais! 🔥`,
  ],
  vi: (n, s, e) => [
    `Phải đóng khung mới được! ${e} Huy chương bài ${n} trong Phraseman ★ ${s} 🔥`,
    `Xong bài ${n} ✅ Nhận huy chương trong Phraseman ★ ${s}. Học tiếp thôi! 🚀`,
    `Thêm một huy chương trong Phraseman: bài ${n} ★ ${s}. Đang vào guồng! 🔥`,
  ],
  id: (n, s, e) => [
    `Ini harus dipajang! ${e} Medali pelajaran ${n} di Phraseman ★ ${s} 🔥`,
    `Pelajaran ${n} selesai ✅ Medali didapat di Phraseman ★ ${s}. Lanjut! 🚀`,
    `Satu medali lagi di Phraseman: pelajaran ${n} ★ ${s}. Lagi semangat! 🔥`,
  ],
  tr: (n, s, e) => [
    `Bunu çerçeveletmeli! ${e} Phraseman'de ${n}. ders madalyası ★ ${s} 🔥`,
    `${n}. ders tamam ✅ Phraseman'de madalya kazandım ★ ${s}. Sıradaki gelsin! 🚀`,
    `Phraseman'de bir madalya daha: ${n}. ders ★ ${s}. Durmak yok! 🔥`,
  ],
  pl: (n, s, e) => [
    `To trzeba oprawić w ramkę! ${e} Medal za lekcję ${n} w Phraseman ★ ${s} 🔥`,
    `Lekcja ${n} zaliczona ✅ Medal zdobyty w Phraseman ★ ${s}. Lecę dalej! 🚀`,
    `Kolejny medal w Phraseman: lekcja ${n} ★ ${s}. Nie zwalniam! 🔥`,
  ],
};

const LESSON_UNLOCK: Pools<[lessonId: number]> = {
  en: (n) => [
    `New level unlocked! 🔓 Lesson ${n} is open in Phraseman. Here I come! ⚔️`,
    `Another lock down! 🔓 Lesson ${n} unlocked in Phraseman. No stopping now! ⚡️`,
    `The road is clear 🔓 Lesson ${n} in Phraseman is waiting. Onward! 🚀`,
  ],
  'pt-BR': (n) => [
    `Novo nível liberado! 🔓 A lição ${n} está aberta no Phraseman. Lá vou eu! ⚔️`,
    `Mais um cadeado aberto! 🔓 Lição ${n} liberada no Phraseman. Ninguém me segura! ⚡️`,
    `Caminho livre 🔓 A lição ${n} me espera no Phraseman. Bora! 🚀`,
  ],
  vi: (n) => [
    `Mở khóa cấp mới! 🔓 Bài ${n} trong Phraseman đã mở. Tiến lên! ⚔️`,
    `Thêm một ổ khóa được mở! 🔓 Bài ${n} trong Phraseman đã sẵn sàng. Không gì cản được! ⚡️`,
    `Đường đã thông 🔓 Bài ${n} trong Phraseman đang chờ. Đi thôi! 🚀`,
  ],
  id: (n) => [
    `Level baru terbuka! 🔓 Pelajaran ${n} di Phraseman sudah terbuka. Ayo maju! ⚔️`,
    `Satu gembok lagi terbuka! 🔓 Pelajaran ${n} di Phraseman siap. Tak terbendung! ⚡️`,
    `Jalan sudah terbuka 🔓 Pelajaran ${n} di Phraseman menunggu. Gas! 🚀`,
  ],
  tr: (n) => [
    `Yeni seviye açıldı! 🔓 Phraseman'de ${n}. ders açık. Geliyorum! ⚔️`,
    `Bir kilit daha kırıldı! 🔓 Phraseman'de ${n}. dersin kilidi açıldı. Durdurulamam! ⚡️`,
    `Yol açık 🔓 Phraseman'de ${n}. ders beni bekliyor. İleri! 🚀`,
  ],
  pl: (n) => [
    `Nowy poziom odblokowany! 🔓 Lekcja ${n} w Phraseman jest otwarta. Nadchodzę! ⚔️`,
    `Kolejna kłódka padła! 🔓 Lekcja ${n} w Phraseman odblokowana. Nic mnie nie zatrzyma! ⚡️`,
    `Droga wolna 🔓 Lekcja ${n} w Phraseman czeka. Naprzód! 🚀`,
  ],
};

const LEVEL_EXAM_UNLOCK: Pools<[level: string]> = {
  en: (l) => [
    `The level boss is near! 📋 Level ${l} test unlocked in Phraseman. Wish me luck! 😎`,
    `Next stop: speaking with confidence 📋 The level ${l} test is open in Phraseman. No turning back! 🏁`,
    `Time to prove it 📋 Level ${l} test unlocked in Phraseman. Fingers crossed! 🔥`,
  ],
  'pt-BR': (l) => [
    `O chefão do nível está perto! 📋 Teste do nível ${l} liberado no Phraseman. Me deseje sorte! 😎`,
    `Próxima parada: falar com confiança 📋 O teste do nível ${l} está aberto no Phraseman. Sem volta! 🏁`,
    `Hora de provar 📋 Teste do nível ${l} liberado no Phraseman. Torçam por mim! 🔥`,
  ],
  vi: (l) => [
    `Trùm cuối của cấp độ đã gần! 📋 Đã mở bài kiểm tra cấp ${l} trong Phraseman. Chúc mình may mắn nhé! 😎`,
    `Điểm dừng tiếp theo: nói thật tự tin 📋 Bài kiểm tra cấp ${l} trong Phraseman đã mở. Không quay đầu! 🏁`,
    `Đến lúc chứng minh rồi 📋 Đã mở bài kiểm tra cấp ${l} trong Phraseman. Cố lên nào! 🔥`,
  ],
  id: (l) => [
    `Bos level sudah dekat! 📋 Ujian level ${l} terbuka di Phraseman. Doakan aku ya! 😎`,
    `Berikutnya: bicara dengan percaya diri 📋 Ujian level ${l} di Phraseman terbuka. Tak ada jalan mundur! 🏁`,
    `Saatnya membuktikan 📋 Ujian level ${l} terbuka di Phraseman. Ayo! 🔥`,
  ],
  tr: (l) => [
    `Seviyenin son patronu yakın! 📋 Phraseman'de ${l} seviye sınavı açıldı. Bana şans dileyin! 😎`,
    `Sıradaki durak: rahatça konuşmak 📋 Phraseman'de ${l} seviye sınavı açık. Geri dönüş yok! 🏁`,
    `Kanıtlama zamanı 📋 Phraseman'de ${l} seviye sınavı açıldı. Hadi bakalım! 🔥`,
  ],
  pl: (l) => [
    `Boss poziomu tuż-tuż! 📋 Test poziomu ${l} odblokowany w Phraseman. Trzymajcie kciuki! 😎`,
    `Następny przystanek: swobodna rozmowa 📋 Test poziomu ${l} w Phraseman jest otwarty. Nie ma odwrotu! 🏁`,
    `Czas to udowodnić 📋 Test poziomu ${l} odblokowany w Phraseman. Do dzieła! 🔥`,
  ],
};

const LINGMAN_EXAM_UNLOCK: Pools<[]> = {
  en: () => [
    `All lessons done! 🎓 Professor Lingman's final exam is unlocked in Phraseman. Time for legends! 🏆`,
    `Final boss mode 🎓 Professor Lingman's exam is open in Phraseman. Wish me luck! 🥇`,
    `Professor Lingman, get the diploma ready! 🎓 Final exam unlocked in Phraseman 🏆`,
  ],
  'pt-BR': () => [
    `Todas as lições feitas! 🎓 O exame final do Professor Lingman está liberado no Phraseman. Hora das lendas! 🏆`,
    `Modo chefão final 🎓 O exame do Professor Lingman está aberto no Phraseman. Me deseje sorte! 🥇`,
    `Professor Lingman, prepare o diploma! 🎓 Exame final liberado no Phraseman 🏆`,
  ],
  vi: () => [
    `Xong hết các bài rồi! 🎓 Đã mở bài thi cuối của Giáo sư Lingman trong Phraseman. Đến lúc thành huyền thoại! 🏆`,
    `Chế độ trùm cuối 🎓 Bài thi của Giáo sư Lingman trong Phraseman đã mở. Chúc mình may mắn nhé! 🥇`,
    `Giáo sư Lingman ơi, chuẩn bị bằng đi! 🎓 Đã mở bài thi cuối trong Phraseman 🏆`,
  ],
  id: () => [
    `Semua pelajaran selesai! 🎓 Ujian akhir Profesor Lingman terbuka di Phraseman. Saatnya jadi legenda! 🏆`,
    `Mode bos terakhir 🎓 Ujian Profesor Lingman di Phraseman sudah terbuka. Doakan aku ya! 🥇`,
    `Profesor Lingman, siapkan ijazahnya! 🎓 Ujian akhir terbuka di Phraseman 🏆`,
  ],
  tr: () => [
    `Tüm dersler bitti! 🎓 Phraseman'de Profesör Lingman'ın final sınavı açıldı. Efsane olma zamanı! 🏆`,
    `Son patron modu 🎓 Phraseman'de Profesör Lingman'ın sınavı açık. Bana şans dileyin! 🥇`,
    `Profesör Lingman, diplomayı hazırlayın! 🎓 Phraseman'de final sınavı açıldı 🏆`,
  ],
  pl: () => [
    `Wszystkie lekcje za mną! 🎓 Egzamin końcowy Profesora Lingmana odblokowany w Phraseman. Czas na legendy! 🏆`,
    `Tryb ostatniego bossa 🎓 Egzamin Profesora Lingmana w Phraseman jest otwarty. Trzymajcie kciuki! 🥇`,
    `Profesorze Lingman, proszę szykować dyplom! 🎓 Egzamin końcowy odblokowany w Phraseman 🏆`,
  ],
};

const ACHIEVEMENT: Pools<[name: string]> = {
  en: (a) => [
    `+1 to my trophy shelf! 🏅 Unlocked the “${a}” achievement in Phraseman. More to come!`,
    `Look what I just got! 😎 “${a}” achievement unlocked in Phraseman ✨`,
    `They say success is 1% talent and 99% Phraseman. Proof: “${a}” unlocked! ✨`,
  ],
  'pt-BR': (a) => [
    `+1 na minha estante de troféus! 🏅 Conquista “${a}” desbloqueada no Phraseman. Vem mais por aí!`,
    `Olha o que eu acabei de ganhar! 😎 Conquista “${a}” desbloqueada no Phraseman ✨`,
    `Dizem que sucesso é 1% talento e 99% Phraseman. A prova: “${a}” desbloqueada! ✨`,
  ],
  vi: (a) => [
    `+1 vào kệ cúp của mình! 🏅 Đã mở thành tích “${a}” trong Phraseman. Còn nữa đấy!`,
    `Xem mình vừa nhận được gì này! 😎 Thành tích “${a}” trong Phraseman ✨`,
    `Người ta nói thành công là 1% tài năng và 99% Phraseman. Bằng chứng: “${a}”! ✨`,
  ],
  id: (a) => [
    `+1 di rak trofiku! 🏅 Pencapaian “${a}” terbuka di Phraseman. Masih banyak lagi!`,
    `Lihat apa yang baru kudapat! 😎 Pencapaian “${a}” di Phraseman ✨`,
    `Katanya sukses itu 1% bakat dan 99% Phraseman. Buktinya: “${a}”! ✨`,
  ],
  tr: (a) => [
    `Kupa rafıma +1! 🏅 Phraseman'de “${a}” başarımı açıldı. Devamı gelecek!`,
    `Bak ne kazandım! 😎 Phraseman'de “${a}” başarımı ✨`,
    `Başarı %1 yetenek, %99 Phraseman derler. Kanıtı: “${a}”! ✨`,
  ],
  pl: (a) => [
    `+1 na mojej półce z trofeami! 🏅 Osiągnięcie „${a}” odblokowane w Phraseman. Będzie więcej!`,
    `Patrzcie, co nowego! 😎 Osiągnięcie „${a}” w Phraseman ✨`,
    `Mówią, że sukces to 1% talentu i 99% Phraseman. Dowód: „${a}”! ✨`,
  ],
};

export type MoreLocaleCelebrationKind = 'medal' | 'lesson_unlock' | 'level_exam_unlock' | 'lingman_exam_unlock';

/** Текст «Поделиться» праздника для en/pt-BR/vi/id/tr/pl; для ru/uk/es — null (у вызывающего свои пулы). */
export function celebrationShareForMoreLocales(
  kind: MoreLocaleCelebrationKind,
  lang: Lang,
  p: Readonly<{ lessonId: number; score: number; emoji: string; level: string }>,
): string | null {
  if (!isMoreLocale(lang)) return null;
  if (kind === 'medal') return pick(MEDAL[lang](p.lessonId, p.score, p.emoji));
  if (kind === 'lesson_unlock') return pick(LESSON_UNLOCK[lang](p.lessonId));
  if (kind === 'level_exam_unlock') return pick(LEVEL_EXAM_UNLOCK[lang](p.level));
  return pick(LINGMAN_EXAM_UNLOCK[lang]());
}

/** Текст «Поделиться» достижения для en/pt-BR/vi/id/tr/pl; для ru/uk/es — null. */
export function achievementShareForMoreLocales(lang: Lang, name: string): string | null {
  return isMoreLocale(lang) ? pick(ACHIEVEMENT[lang](name)) : null;
}
