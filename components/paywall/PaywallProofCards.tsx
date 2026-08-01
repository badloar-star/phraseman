// ════════════════════════════════════════════════════════════════════════════
// PaywallProofCards.tsx — «галерея доказательств» (ниже фолда, для сомневающихся):
//   MirrorCard      — «Уже твоё»: зеркало прогресса (endowment, из v1)
//   PercentileCard  — честное соцдоказательство из СВОИХ данных юзера
//   CompareCard     — 4 крупные выгоды Plus без мелких чипов и псевдосравнений
//   FaqCard         — 3 вопроса, бьющие в страх №1 («забуду отменить»)
// Отзывы намеренно НЕ здесь: рендер только verified-отзывов через
// paywall_testimonials (пока их нет — секции нет; не выдумываем).
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../SafeLinearGradient';
import { triLang, type Lang } from '../../constants/i18n';
import type { PremiumContext } from '../../app/premium_context';
import type { ProgressMirror } from '../../app/paywall_progress_mirror';
import type { PaywallProfile } from '../../app/paywall_profile';
import type { PaywallChrome } from './paywallShared';
import { hapticTap } from '../../hooks/use-haptics';

// ── обёртка-карточка ──────────────────────────────────────────────────────────
function ProofCard({ title, chrome, children }: { title?: string; chrome: PaywallChrome; children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[`${chrome.tc.heroAccent}14`, chrome.cardBg, chrome.cardBgStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[S.card, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}
    >
      <View
        pointerEvents="none"
        style={[S.cardHighlight, { backgroundColor: `${chrome.tc.heroAccent}38` }]}
      />
      {title ? <Text style={[S.cardTitle, { color: chrome.textMuted }]}>{title.toUpperCase()}</Text> : null}
      {children}
    </LinearGradient>
  );
}

function formatMirrorValue(value: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  const rounded = thousands < 10 ? Math.round(thousands * 10) / 10 : Math.round(thousands);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}K`;
}

function mirrorStats(lang: Lang, mirror: ProgressMirror): { value: number; label: string }[] {
  const stats: { value: number; label: string }[] = [];
  if (mirror.phrases > 0) stats.push({ value: mirror.phrases, label: triLang(lang, {
    ru: 'фраз',
    uk: 'фраз',
    es: 'frases',
    'pt-BR': 'frases',
    vi: 'cụm từ',
    id: 'frasa',
    tr: 'ifade',
    pl: 'fraz',
  }) });
  if (mirror.words > 0) stats.push({ value: mirror.words, label: triLang(lang, {
    ru: 'слов',
    uk: 'слів',
    es: 'palabras',
    'pt-BR': 'palavras',
    vi: 'từ',
    id: 'kata',
    tr: 'kelime',
    pl: 'słów',
  }) });
  if (mirror.xp > 0) stats.push({ value: mirror.xp, label: 'XP' });
  if (mirror.streak > 0) stats.push({ value: mirror.streak, label: triLang(lang, {
    ru: 'дн. серия',
    uk: 'дн. серія',
    es: 'días racha',
    'pt-BR': 'dias seguidos',
    vi: 'ngày chuỗi',
    id: 'hari runtutan',
    tr: 'gün seri',
    pl: 'dni serii',
  }) });
  return stats;
}

// ── «Уже твоё» ────────────────────────────────────────────────────────────────
export function MirrorCard({ lang, chrome, mirror }: { lang: Lang; chrome: PaywallChrome; mirror: ProgressMirror }) {
  const stats = mirrorStats(lang, mirror);
  if (!stats.length) return null;
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Уже твоё',
      uk: 'Вже твоє',
      es: 'Ya es tuyo',
      'pt-BR': 'Já é seu',
      vi: 'Đã là của bạn',
      id: 'Sudah milikmu',
      tr: 'Zaten senin',
      pl: 'Już twoje',
    })} chrome={chrome}>
      <View style={S.mirrorRow}>
        {stats.slice(0, 4).map((s) => (
          <View key={s.label} style={[S.mirrorStat, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
            <Text
              style={[S.mirrorValue, { color: chrome.textPrimary }]}
              numberOfLines={1}
            >
              {formatMirrorValue(s.value)}
            </Text>
            <Text style={[S.mirrorLabel, { color: chrome.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[S.mirrorLine, { color: chrome.textPrimary }]}>
        {triLang(lang, {
          ru: 'Plus убирает лимиты — больше практики каждый день.',
          uk: 'Plus прибирає ліміти — більше практики щодня.',
          es: 'Plus quita límites: más práctica cada día.',
          'pt-BR': 'Plus remove limites: mais prática todo dia.',
          vi: 'Plus bỏ giới hạn: luyện tập nhiều hơn mỗi ngày.',
          id: 'Plus menghapus batas: lebih banyak latihan tiap hari.',
          tr: 'Plus sınırları kaldırır: her gün daha çok pratik.',
          pl: 'Plus usuwa limity: więcej praktyki każdego dnia.',
        })}
      </Text>
    </ProofCard>
  );
}

// ── перцентиль ────────────────────────────────────────────────────────────────
export function PercentileCard({ lang, chrome, line }: { lang: Lang; chrome: PaywallChrome; line: string }) {
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Твоё место',
      uk: 'Твоє місце',
      es: 'Tu lugar',
      'pt-BR': 'Seu lugar',
      vi: 'Vị trí của bạn',
      id: 'Posisimu',
      tr: 'Yeriniz',
      pl: 'Twoje miejsce',
    })} chrome={chrome}>
      <View style={S.pctRow}>
        <Ionicons name="trending-up" size={25} color={chrome.textMuted} />
        <Text style={[S.pctText, { color: chrome.textPrimary }]}>{line}</Text>
      </View>
    </ProofCard>
  );
}

// зачем (аудит «пейволы-объясняют»): «Quark 92594, Plus даёт больше практики…»
// выглядело роботски — серверные автоники (leaderboard.ts: слово из физ-списка +
// цифры) и Player/User NNNN не показываем; карточка честно работает без имени.
const GENERATED_NAME_RE = /^(alpha|axiom|cosmos|delta|helium|ion|lambda|neon|nova|omega|orbit|photon|quark|quantum|radium|sigma|tensor|vector|vertex|xenon|zenith|player|user|guest)\s*\d{2,}$/i;
export function isAutoGeneratedName(name: string): boolean {
  return GENERATED_NAME_RE.test(name.trim());
}

// зачем: нижняя строка карточки была одна на все 33 контекста («убирает паузы —
// говорить, повторять…») и не попадала в момент (темы, аура, статистика).
// 6 групп по типу ценности; неизвестный контекст падает в «pace».
type PracticeGroup = 'pace' | 'speech' | 'memory' | 'insight' | 'identity' | 'course';
const CONTEXT_PRACTICE_GROUP: Partial<Record<PremiumContext, PracticeGroup>> = {
  dialog_limit: 'speech', dialog_locked_level: 'speech', dialog_analysis: 'speech',
  ai_voice_input: 'speech', speaking: 'speech',
  flashcard_limit: 'memory', flashcard_training: 'memory', flashcard_autoplay: 'memory',
  trainer: 'memory', trainer_limit: 'memory', smart_trainer: 'memory',
  diagnosis_training: 'memory', ai_explain: 'memory', mastery: 'memory',
  stats: 'insight', heatmap: 'insight', patterns: 'insight', percentiles: 'insight', weekly_review: 'insight',
  theme: 'identity', avatar_aura: 'identity', club: 'identity', language_add: 'identity',
  course_after_lesson3: 'course', free_lessons_complete: 'course', lesson_b1: 'course',
  no_energy: 'course', streak: 'course', personal_plan: 'course',
};
type PracticeLineDict = { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string };
const PRACTICE_LINES: Record<PracticeGroup, PracticeLineDict> = {
  pace: {
    ru: 'Plus убирает паузы: занимаешься, пока есть силы и настроение.',
    uk: 'Plus прибирає паузи: займаєшся, поки є сили й настрій.',
    es: 'Plus quita las pausas: estudias mientras tengas ganas y energía.',
    'pt-BR': 'O Plus tira as pausas: você estuda enquanto tiver energia e vontade.',
    vi: 'Plus bỏ các quãng dừng: học khi bạn còn sức và hứng thú.',
    id: 'Plus menghapus jeda: belajar selama masih ada tenaga dan semangat.',
    tr: 'Plus duraklamaları kaldırır: gücün ve hevesin oldukça çalışırsın.',
    pl: 'Plus usuwa pauzy: uczysz się, póki masz siłę i ochotę.',
  },
  speech: {
    ru: 'Plus держит разговор: говоришь, разбираешь реплики, пробуешь снова — без стопов.',
    uk: 'Plus тримає розмову: говориш, розбираєш репліки, пробуєш знову — без стопів.',
    es: 'Plus mantiene la conversación: hablas, repasas frases y repites sin bloqueos.',
    'pt-BR': 'O Plus mantém a conversa: você fala, analisa as falas e tenta de novo, sem travas.',
    vi: 'Plus giữ cuộc trò chuyện: nói, phân tích câu và thử lại — không bị chặn.',
    id: 'Plus menjaga percakapan: bicara, ulas ucapan, coba lagi — tanpa hambatan.',
    tr: 'Plus sohbeti sürdürür: konuşur, cümleleri inceler, yeniden denersin — duraksız.',
    pl: 'Plus podtrzymuje rozmowę: mówisz, analizujesz kwestie i próbujesz znów — bez blokad.',
  },
  memory: {
    ru: 'Plus добивает слабые места: повторяешь ровно то, что проседает.',
    uk: 'Plus добиває слабкі місця: повторюєш саме те, що просідає.',
    es: 'Plus remata tus puntos débiles: repasas justo lo que flojea.',
    'pt-BR': 'O Plus fecha os pontos fracos: você repete exatamente o que está fraco.',
    vi: 'Plus xử lý điểm yếu: ôn đúng phần đang đuối.',
    id: 'Plus menutup titik lemah: mengulang tepat yang masih lemah.',
    tr: 'Plus zayıf noktaları kapatır: tam da geride kalanı tekrar edersin.',
    pl: 'Plus domyka słabe miejsca: powtarzasz dokładnie to, co siada.',
  },
  insight: {
    ru: 'Plus показывает картину целиком: что растёт, что подтянуть и куда идти.',
    uk: 'Plus показує картину повністю: що росте, що підтягнути й куди йти.',
    es: 'Plus te muestra el cuadro completo: qué crece, qué reforzar y hacia dónde ir.',
    'pt-BR': 'O Plus mostra o quadro inteiro: o que cresce, o que reforçar e para onde ir.',
    vi: 'Plus cho thấy bức tranh toàn cảnh: gì đang tiến, gì cần bù và đi hướng nào.',
    id: 'Plus menunjukkan gambaran utuh: apa yang naik, apa yang perlu dikejar, ke mana arahnya.',
    tr: 'Plus tabloyu bütün gösterir: ne büyüyor, ne eksik, yön ne.',
    pl: 'Plus pokazuje pełny obraz: co rośnie, co podciągnąć i dokąd iść.',
  },
  identity: {
    ru: 'Plus делает Phraseman твоим — от оформления до плана на каждый язык.',
    uk: 'Plus робить Phraseman твоїм — від оформлення до плану на кожну мову.',
    es: 'Plus hace que Phraseman sea tuyo: del estilo al plan de cada idioma.',
    'pt-BR': 'O Plus faz o Phraseman ser seu: do visual ao plano de cada idioma.',
    vi: 'Plus biến Phraseman thành của bạn — từ giao diện đến kế hoạch cho từng ngôn ngữ.',
    id: 'Plus menjadikan Phraseman milikmu — dari tampilan sampai rencana tiap bahasa.',
    tr: 'Plus Phraseman’ı senin yapar: görünümden her dilin planına.',
    pl: 'Plus czyni Phraseman twoim — od wyglądu po plan dla każdego języka.',
  },
  course: {
    ru: 'Plus открывает курс целиком: учишься в своём темпе, без пауз.',
    uk: 'Plus відкриває курс повністю: вчишся у своєму темпі, без пауз.',
    es: 'Plus abre el curso entero: aprendes a tu ritmo, sin pausas.',
    'pt-BR': 'O Plus abre o curso inteiro: você aprende no seu ritmo, sem pausas.',
    vi: 'Plus mở toàn bộ khóa học: học theo nhịp của bạn, không gián đoạn.',
    id: 'Plus membuka seluruh kursus: belajar sesuai ritmemu, tanpa jeda.',
    tr: 'Plus kursun tamamını açar: kendi temponda, arasız öğrenirsin.',
    pl: 'Plus otwiera cały kurs: uczysz się w swoim tempie, bez przerw.',
  },
};

export function PersonalizationProofCard({
  lang,
  chrome,
  ctx,
  tagTexts = [],
  profile,
  mirror,
  percentileLine,
}: {
  lang: Lang;
  chrome: PaywallChrome;
  ctx?: PremiumContext;
  tagTexts?: string[];
  profile: PaywallProfile | null;
  mirror: ProgressMirror | null;
  percentileLine?: string | null;
}) {
  const stats = mirror ? mirrorStats(lang, mirror).slice(0, 4) : [];
  const rawName = profile?.name?.trim() || '';
  const name = isAutoGeneratedName(rawName) ? '' : rawName;
  const hasPersonalSignal = tagTexts.some(Boolean);
  const hasContent = hasPersonalSignal || stats.length > 0 || !!name || !!percentileLine;
  if (!hasContent) return null;

  const accent = chrome.tc.heroAccent;
  const phraseValue = mirror?.phrases ? formatMirrorValue(mirror.phrases) : '';
  const streakValue = mirror?.streak ? formatMirrorValue(mirror.streak) : '';
  const progressLine = phraseValue || streakValue
    ? `${name ? `${name}, ` : ''}${triLang(lang, {
        ru: phraseValue && streakValue ? `у тебя уже ${phraseValue} фраз и ${streakValue} дн. серии.` : phraseValue ? `у тебя уже ${phraseValue} фраз.` : `у тебя уже ${streakValue} дн. серии.`,
        uk: phraseValue && streakValue ? `у тебе вже ${phraseValue} фраз і ${streakValue} дн. серії.` : phraseValue ? `у тебе вже ${phraseValue} фраз.` : `у тебе вже ${streakValue} дн. серії.`,
        es: phraseValue && streakValue ? `ya tienes ${phraseValue} frases y ${streakValue} días de racha.` : phraseValue ? `ya tienes ${phraseValue} frases.` : `ya tienes ${streakValue} días de racha.`,
        'pt-BR': phraseValue && streakValue ? `você já tem ${phraseValue} frases e ${streakValue} dias seguidos.` : phraseValue ? `você já tem ${phraseValue} frases.` : `você já tem ${streakValue} dias seguidos.`,
        vi: phraseValue && streakValue ? `bạn đã có ${phraseValue} cụm từ và chuỗi ${streakValue} ngày.` : phraseValue ? `bạn đã có ${phraseValue} cụm từ.` : `bạn đã có chuỗi ${streakValue} ngày.`,
        id: phraseValue && streakValue ? `kamu sudah punya ${phraseValue} frasa dan runtutan ${streakValue} hari.` : phraseValue ? `kamu sudah punya ${phraseValue} frasa.` : `kamu sudah punya runtutan ${streakValue} hari.`,
        tr: phraseValue && streakValue ? `şimdiden ${phraseValue} ifade ve ${streakValue} günlük seri var.` : phraseValue ? `şimdiden ${phraseValue} ifade var.` : `şimdiden ${streakValue} günlük seri var.`,
        pl: phraseValue && streakValue ? `masz już ${phraseValue} fraz i ${streakValue} dni serii.` : phraseValue ? `masz już ${phraseValue} fraz.` : `masz już ${streakValue} dni serii.`,
      })}`
    : name
      ? `${name}, ${triLang(lang, {
          ru: 'Plus даёт больше практики без стопов.',
          uk: 'Plus дає більше практики без стопів.',
          es: 'Plus te da más práctica sin bloqueos.',
          'pt-BR': 'O Plus dá mais prática sem travas.',
          vi: 'Plus cho bạn luyện tập nhiều hơn, không bị chặn.',
          id: 'Plus memberi lebih banyak latihan tanpa hambatan.',
          tr: 'Plus engel olmadan daha çok pratik verir.',
          pl: 'Plus daje więcej praktyki bez blokad.',
        })}`
    : null;
  const practiceGroup: PracticeGroup = (ctx && CONTEXT_PRACTICE_GROUP[ctx]) || 'pace';
  const practiceLine = triLang(lang, PRACTICE_LINES[practiceGroup]);
  return (
    <ProofCard chrome={chrome}>
      <View style={S.personalHeader}>
        {progressLine && <Text style={[S.personalMain, { color: chrome.textPrimary }]}>{progressLine}</Text>}
      </View>

      {stats.length > 0 && (
        <View style={[S.personalStats, { borderTopColor: `${accent}24`, borderBottomColor: `${accent}24` }]}>
          {stats.map((s) => (
            <View key={s.label} style={S.personalStat}>
              <Text
                style={[S.personalStatValue, { color: chrome.textPrimary }]}
                numberOfLines={1}
              >
                {formatMirrorValue(s.value)}
              </Text>
              <Text style={[S.personalStatLabel, { color: chrome.textMuted }]} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[S.personalSub, { color: chrome.textMuted }]}>{practiceLine}</Text>

      {percentileLine && (
        <View style={[S.personalPct, { borderTopColor: `${accent}20` }]}>
          <Ionicons name="trending-up" size={18} color={accent} />
          <Text style={[S.personalPctText, { color: chrome.textPrimary }]}>{percentileLine}</Text>
        </View>
      )}
    </ProofCard>
  );
}

// ── что даёт Plus: один тезис сверху, ниже 4 сильные выгоды ──────────────────
// Тексты сверены с реальными лимитами в коде (см. ниже), без «тумана» и неправды:
//   • Уроки: free = 1–3 (monetization_policy.ts: FREE_LESSON_LIMIT=3). Правда.
//   • Энергия free: +1 за ~10 мин. Произношение/диалоги/тренер: закрыты/пробные.
type LocCell = Record<Lang, string>;

// Стиль 2 — карточки «польза в заголовке» (продаём результат, а не функцию).
type ValueCard = { icon: keyof typeof Ionicons.glyphMap; title: LocCell; desc: LocCell };
const VALUE_CARDS: ValueCard[] = [
  {
    icon: 'chatbubble-ellipses-outline',
    title: { ru: 'Диалоги для живой речи', uk: 'Діалоги для живої мови', es: 'Diálogos para hablar de verdad', 'pt-BR': 'Diálogos para fala real', vi: 'Hội thoại để nói thật', id: 'Dialog untuk bicara nyata', tr: 'Gerçek konuşma diyalogları', pl: 'Dialogi do żywej mowy' },
    desc: { ru: 'Тренируешь рабочие и бытовые ситуации: отвечаешь, уточняешь, просишь повторить и доводишь реплику до нормальной речи.', uk: 'Тренуєш робочі й побутові ситуації: відповідаєш, уточнюєш, просиш повторити й доводиш репліку до нормальної мови.', es: 'Practicas situaciones de trabajo y vida diaria: respondes, aclaras, pides repetir y llevas la frase a una conversación normal.', 'pt-BR': 'Você pratica situações de trabalho e do dia a dia: responde, esclarece, pede para repetir e transforma a fala em conversa natural.', vi: 'Luyện tình huống công việc và đời thường: trả lời, hỏi rõ, xin nhắc lại và đưa câu nói về giao tiếp tự nhiên.', id: 'Latih situasi kerja dan harian: menjawab, memperjelas, minta diulang, dan membuat respons terasa alami.', tr: 'İş ve günlük durumları çalışırsın: cevap verir, netleştirir, tekrar istersin ve cümleyi doğal konuşmaya çevirirsin.', pl: 'Ćwiczysz sytuacje z pracy i życia: odpowiadasz, dopytujesz, prosisz o powtórzenie i doprowadzasz wypowiedź do naturalnej rozmowy.' },
  },
  {
    icon: 'mic-outline',
    title: { ru: 'Устный ввод', uk: 'Усне введення', es: 'Entrada por voz', 'pt-BR': 'Entrada por voz', vi: 'Nhập bằng giọng nói', id: 'Input suara', tr: 'Sesli giriş', pl: 'Wprowadzanie głosem' },
    desc: { ru: 'Произносишь фразу вслух, а Phraseman оценивает, насколько точно и правильно она сказана.', uk: 'Вимовляєш фразу вголос, а Phraseman оцінює, наскільки точно й правильно її сказано.', es: 'Dices la frase en voz alta y Phraseman evalúa qué tan precisa y correcta fue.', 'pt-BR': 'Você diz a frase em voz alta e o Phraseman avalia se ela foi dita com precisão e correção.', vi: 'Bạn nói câu đó thành tiếng, còn Phraseman đánh giá mức độ chính xác và đúng của câu nói.', id: 'Ucapkan frasa dengan suara, lalu Phraseman menilai seberapa tepat dan benar pengucapannya.', tr: 'Cümleyi sesli söylersin; Phraseman ne kadar doğru ve isabetli söylediğini değerlendirir.', pl: 'Wypowiadasz frazę na głos, a Phraseman ocenia, jak dokładnie i poprawnie została powiedziana.' },
  },
  {
    icon: 'navigate-outline',
    title: { ru: 'Слабые места', uk: 'Слабкі місця', es: 'Puntos débiles', 'pt-BR': 'Pontos fracos', vi: 'Điểm yếu', id: 'Titik lemah', tr: 'Zayıf noktalar', pl: 'Słabe miejsca' },
    desc: { ru: 'Ошибочные и трудные фразы возвращаются в повтор, пока не станут уверенными.', uk: 'Помилкові й складні фрази повертаються в повторення, доки не стануть упевненими.', es: 'Las frases difíciles o con errores vuelven al repaso hasta que salgan con seguridad.', 'pt-BR': 'Frases difíceis ou com erro voltam para revisão até ficarem firmes.', vi: 'Câu khó hoặc câu sai quay lại phần ôn cho đến khi bạn nói chắc hơn.', id: 'Frasa sulit atau salah kembali diulang sampai terasa mantap.', tr: 'Hatalı ve zor ifadeler güvenli hale gelene kadar tekrara döner.', pl: 'Błędne i trudne frazy wracają do powtórki, aż staną się pewne.' },
  },
  {
    icon: 'infinite-outline',
    title: { ru: 'Без free-стопов', uk: 'Без free-стопів', es: 'Sin frenos gratis', 'pt-BR': 'Sem travas grátis', vi: 'Không bị chặn kiểu miễn phí', id: 'Tanpa rem gratis', tr: 'Free durakları yok', pl: 'Bez blokad free' },
    desc: { ru: 'Уроки, практика, энергия, карточки и личный план открыты без бесплатных дневных стопов и порогов.', uk: 'Уроки, практика, енергія, картки й особистий план відкриті без безкоштовних денних стопів і порогів.', es: 'Lecciones, práctica, energía, tarjetas y plan personal se abren sin los topes diarios del modo gratis.', 'pt-BR': 'Lições, prática, energia, cartões e plano pessoal abrem sem os bloqueios diários do modo grátis.', vi: 'Bài học, luyện tập, năng lượng, thẻ và kế hoạch cá nhân mở mà không bị các ngưỡng hằng ngày của bản miễn phí.', id: 'Pelajaran, latihan, energi, kartu, dan rencana pribadi terbuka tanpa batas harian mode gratis.', tr: 'Dersler, pratik, enerji, kartlar ve kişisel plan ücretsiz modun günlük durakları olmadan açılır.', pl: 'Lekcje, praktyka, energia, fiszki i plan osobisty są otwarte bez dziennych progów trybu free.' },
  },
];

export function CompareCard({ lang, chrome }: { lang: Lang; chrome: PaywallChrome }) {
  const pick = (d: LocCell) => triLang(lang, d);
  const accent = chrome.tc.heroAccent;
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Что даёт Plus',
      uk: 'Що дає Plus',
      es: 'Qué te da Plus',
      'pt-BR': 'O que o Plus oferece',
      vi: 'Plus mang lại gì',
      id: 'Apa yang Plus berikan',
      tr: 'Plus ne sunar',
      pl: 'Co daje Plus',
    })} chrome={chrome}>
      <View style={S.valList}>
        {VALUE_CARDS.map((card, index) => (
          <View
            key={card.title.ru}
            style={[
              S.valPoint,
              index > 0 && { borderTopColor: `${accent}22`, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={S.valPointMark}>
              <View style={[S.valPointIconShell, { backgroundColor: `${accent}16`, borderColor: `${accent}34` }]}>
                <Ionicons name={card.icon} size={21} color={accent} />
              </View>
            </View>
            <View style={S.valPointText}>
              <Text style={[S.valCardTitle, { color: chrome.textPrimary }]}>{pick(card.title)}</Text>
              <Text style={[S.valCardDesc, { color: chrome.textMuted }]}>{pick(card.desc)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ProofCard>
  );
}

// ── FAQ: 3 вопроса прямо в страх «забуду отменить» ────────────────────────────
export function FaqCard({ lang, chrome, trialDays, priceLine }: {
  lang: Lang;
  chrome: PaywallChrome;
  trialDays: number | null;
  /** «2 990 ₽ за год» — для честного ответа про списание. */
  priceLine: string;
}) {
  const [open, setOpen] = useState(0);
  const qa: { q: string; a: string }[] = [
    ...(trialDays ? [{
      q: triLang(lang, {
        ru: 'Что будет после триала?',
        uk: 'Що буде після тріалу?',
        es: '¿Qué pasa tras la prueba?',
        'pt-BR': 'O que acontece depois do teste?',
        vi: 'Sau thời gian dùng thử thì sao?',
        id: 'Apa yang terjadi setelah uji coba?',
        tr: 'Denemeden sonra ne olur?',
        pl: 'Co będzie po okresie próbnym?',
      }),
      a: triLang(lang, {
        ru: `${trialDays} дн. всё открыто бесплатно. Если уведомления разрешены, напомним перед окончанием. Отменишь — деньги не спишутся. Не отменишь — ${priceLine}.`,
        uk: `${trialDays} дн. усе відкрито безкоштовно. Якщо сповіщення дозволені, нагадаємо перед завершенням. Скасуєш — гроші не спишуться. Не скасуєш — ${priceLine}.`,
        es: `${trialDays} días con todo abierto gratis. Si permites notificaciones, te recordaremos antes del final. Si cancelas, no se cobra nada. Si no, ${priceLine}.`,
        'pt-BR': `${trialDays} dias com tudo liberado grátis. Se as notificações estiverem permitidas, lembraremos antes do fim. Se cancelar, nada é cobrado. Se não, ${priceLine}.`,
        vi: `${trialDays} ngày mở tất cả miễn phí. Nếu bạn cho phép thông báo, chúng tôi sẽ nhắc trước khi kết thúc. Hủy thì không bị trừ tiền. Không hủy thì ${priceLine}.`,
        id: `${trialDays} hari semua terbuka gratis. Jika notifikasi diizinkan, kami akan mengingatkan sebelum berakhir. Kalau dibatalkan, tidak ada tagihan. Kalau tidak, ${priceLine}.`,
        tr: `${trialDays} gün boyunca her şey ücretsiz açık. Bildirimlere izin verirsen bitmeden önce hatırlatırız. İptal edersen ücret alınmaz. Etmezsen ${priceLine}.`,
        pl: `${trialDays} dni wszystko jest otwarte za darmo. Jeśli powiadomienia są dozwolone, przypomnimy przed końcem. Anulujesz — nic nie pobierzemy. Nie anulujesz — ${priceLine}.`,
      }),
    }] : []),
    {
      q: triLang(lang, {
        ru: 'Как отменить?',
        uk: 'Як скасувати?',
        es: '¿Cómo cancelo?',
        'pt-BR': 'Como cancelar?',
        vi: 'Hủy bằng cách nào?',
        id: 'Bagaimana cara membatalkan?',
        tr: 'Nasıl iptal ederim?',
        pl: 'Jak anulować?',
      }),
      a: triLang(lang, {
        ru: 'Настройки телефона → Подписки → Phraseman → Отменить. Две минуты, без писем и звонков. Доступ останется до конца оплаченного срока.',
        uk: 'Налаштування телефона → Підписки → Phraseman → Скасувати. Дві хвилини, без листів і дзвінків. Доступ лишиться до кінця оплаченого строку.',
        es: 'Ajustes del teléfono → Suscripciones → Phraseman → Cancelar. Dos minutos, sin correos ni llamadas. El acceso sigue hasta el final del período pagado.',
        'pt-BR': 'Ajustes do telefone → Assinaturas → Phraseman → Cancelar. Dois minutos, sem e-mails nem ligações. O acesso continua até o fim do período pago.',
        vi: 'Cài đặt điện thoại → Đăng ký → Phraseman → Hủy. Hai phút, không email hay cuộc gọi. Quyền truy cập vẫn còn đến hết kỳ đã thanh toán.',
        id: 'Pengaturan ponsel → Langganan → Phraseman → Batalkan. Dua menit, tanpa email atau telepon. Akses tetap aktif sampai periode berbayar berakhir.',
        tr: 'Telefon ayarları → Abonelikler → Phraseman → İptal et. İki dakika, e-posta veya arama yok. Erişim ücretli dönem bitene kadar sürer.',
        pl: 'Ustawienia telefonu → Subskrypcje → Phraseman → Anuluj. Dwie minuty, bez maili i telefonów. Dostęp zostaje do końca opłaconego okresu.',
      }),
    },
    {
      q: triLang(lang, {
        ru: 'Что входит в Plus?',
        uk: 'Що входить у Plus?',
        es: '¿Qué incluye Plus?',
        'pt-BR': 'O que inclui o Plus?',
        vi: 'Plus bao gồm những gì?',
        id: 'Apa saja isi Plus?',
        tr: 'Plus neleri içerir?',
        pl: 'Co zawiera Plus?',
      }),
      a: triLang(lang, {
        ru: 'Уроки после бесплатного порога и все уровни, энергия без ожидания, безлимитная практика, больше 20 карточек, AI-диалоги и сценарии уровней, устный ввод с оценкой фразы, умный тренер слабых мест, личный план, расширенная статистика, заморозка серии, Plus-темы и Plus-аура профиля.',
        uk: 'Уроки після безкоштовного порога й усі рівні, енергія без очікування, безлімітна практика, понад 20 карток, AI-діалоги й сценарії рівнів, усне введення з оцінкою фрази, розумний тренер слабких місць, особистий план, розширена статистика, заморозка серії, Plus-теми й Plus-аура профілю.',
        es: 'Lecciones tras el tramo gratis y todos los niveles, energía sin esperas, práctica ilimitada, más de 20 tarjetas, diálogos IA y escenarios por nivel, voz con evaluación de frase, entrenador de puntos débiles, plan personal, estadísticas avanzadas, protección de racha, temas Plus y aura Plus de perfil.',
        'pt-BR': 'Lições após a faixa grátis e todos os níveis, energia sem espera, prática ilimitada, mais de 20 cartões, diálogos com IA e cenários por nível, voz com avaliação da frase, treino de pontos fracos, plano pessoal, estatísticas avançadas, proteção de sequência, temas Plus e aura Plus no perfil.',
        vi: 'Bài học sau phần miễn phí và mọi cấp độ, năng lượng không phải chờ, luyện tập không giới hạn, hơn 20 thẻ, hội thoại AI và kịch bản theo cấp độ, nói bằng giọng với đánh giá câu, luyện điểm yếu, kế hoạch cá nhân, thống kê nâng cao, bảo vệ chuỗi, chủ đề Plus và hào quang hồ sơ Plus.',
        id: 'Pelajaran setelah batas gratis dan semua level, energi tanpa menunggu, latihan tanpa batas, lebih dari 20 kartu, dialog AI dan skenario level, input suara dengan penilaian frasa, pelatih titik lemah, rencana pribadi, statistik lanjutan, pelindung streak, tema Plus, dan aura profil Plus.',
        tr: 'Ücretsiz eşikten sonraki dersler ve tüm seviyeler, beklemesiz enerji, sınırsız pratik, 20’den fazla kart, AI diyalogları ve seviye senaryoları, cümle puanlayan sesli giriş, zayıf nokta antrenörü, kişisel plan, gelişmiş istatistik, seri dondurma, Plus temaları ve Plus profil aurası.',
        pl: 'Lekcje po darmowym progu i wszystkie poziomy, energia bez czekania, nielimitowana praktyka, ponad 20 fiszek, dialogi AI i scenariusze poziomów, mówienie z oceną frazy, trener słabych miejsc, plan osobisty, rozszerzone statystyki, ochrona serii, motywy Plus i aura profilu Plus.',
      }),
    },
  ];
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Частые вопросы',
      uk: 'Часті питання',
      es: 'Preguntas frecuentes',
      'pt-BR': 'Perguntas frequentes',
      vi: 'Câu hỏi thường gặp',
      id: 'Pertanyaan umum',
      tr: 'Sık sorulan sorular',
      pl: 'Częste pytania',
    })} chrome={chrome}>
      {qa.map((item, i) => {
        const isOpen = open === i;
        return (
          <TouchableOpacity
            key={item.q}
            activeOpacity={0.7}
            onPress={() => {
              hapticTap();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpen(isOpen ? -1 : i);
            }}
            style={[S.faqQ, i < qa.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: chrome.cardBorder }]}
          >
            <View style={S.faqHead}>
              <Text style={[S.faqQText, { color: chrome.textPrimary }]}>{item.q}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={chrome.textMuted} />
            </View>
            {isOpen && <Text style={[S.faqA, { color: chrome.textMuted }]}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </ProofCard>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 0, paddingHorizontal: 17, paddingVertical: 15, marginTop: 14, overflow: 'hidden' },
  cardHighlight: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, opacity: 0.72 },
  cardTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0, marginBottom: 12 },

  mirrorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  mirrorStat: {
    flexGrow: 1, flexBasis: '47%', minWidth: '47%', minHeight: 74, borderRadius: 13, borderWidth: 0,
    paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
  },
  // зачем: было adjustsFontSizeToFit(0.72) — запрещённое динамическое сжатие
  // коротких чисел/процентов; formatMirrorValue уже отдаёт компактные строки
  // (напр. «87%», «12д»), статичного кегля 18 хватает без обрезки на iOS.
  mirrorValue: {
    alignSelf: 'stretch', textAlign: 'center',
    fontSize: 18, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'],
  },
  mirrorLabel: { fontSize: 11.5, marginTop: 4, textAlign: 'center' },
  mirrorLine: { fontSize: 13.5, marginTop: 11, lineHeight: 19 },

  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pctText: { flex: 1, fontSize: 14, lineHeight: 20 },

  personalHeader: { alignItems: 'stretch' },
  personalMain: { fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: 0, textAlign: 'left' },
  personalSub: { fontSize: 13.5, lineHeight: 19, marginTop: 8 },
  personalStats: {
    flexDirection: 'row',
    marginTop: 14, paddingTop: 12, paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  personalStat: {
    flex: 1, minWidth: 0,
    paddingVertical: 1, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center',
  },
  // зачем: было adjustsFontSizeToFit(0.76) — тот же класс бага, что у mirrorValue.
  personalStatValue: {
    alignSelf: 'stretch', textAlign: 'center',
    fontSize: 17.5, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'],
  },
  personalStatLabel: { alignSelf: 'stretch', fontSize: 11.5, marginTop: 3, textAlign: 'center' },
  personalPct: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  personalPctText: { flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: '700' },

  // Польза в заголовке, без внутренних контейнеров
  valList: { marginTop: 13 },
  valPoint: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
  valPointMark: { width: 40, alignItems: 'center' },
  valPointIconShell: {
    width: 35, height: 35, borderRadius: 12, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  valPointText: { flex: 1, minWidth: 0 },
  valCardTitle: { fontSize: 16.5, lineHeight: 21.5, fontWeight: '900', letterSpacing: 0, marginBottom: 4 },
  valCardDesc: { fontSize: 14.2, lineHeight: 20.5 },

  faqQ: { paddingVertical: 12 },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  faqQText: { flex: 1, fontSize: 14, fontWeight: '700' },
  faqA: { fontSize: 13, lineHeight: 18.5, marginTop: 8 },
});
