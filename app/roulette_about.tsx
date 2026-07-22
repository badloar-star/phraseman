/**
 * Экран «Что это?» для рулетки Plus (роут /roulette_about).
 *
 * Полностью статичный: hero с тремя карточками призов, «Как это работает»
 * (3 шага), полный список призов с дефолтными шансами, правила, CTA
 * «Пригласить друга» → /referrals.
 *
 * Токены: fontWeight только '400'/'700'; тени shadowColor '#000000';
 * LinearGradient только start/end.
 */
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { CINEMA, cinemaAlpha, isCinemaMode } from '../constants/cinemaThemes';
import { triLang, type Lang } from '../constants/i18n';
import { ROULETTE_PRIZES, SHOW_SPIN_ODDS } from './roulette_prizes';
import { useReferralRouletteEnabled } from './referral_roulette_flag';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function RouletteAboutScreen() {
  const { theme: t, f, ds, themeMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const rouletteOn = useReferralRouletteEnabled();

  const steps: readonly { title: string; text: string }[] = [
    {
      title: L('Пригласи друга', 'Запроси друга', 'Invita a un amigo', 'Convide um amigo', 'Mời một người bạn', 'Undang teman', 'Bir arkadaşını davet et', 'Zaproś znajomego'),
      text: L('Поделись ссылкой или кодом из раздела «Рефералы».', 'Поділися посиланням або кодом із розділу «Реферали».', 'Comparte tu enlace o código desde «Referidos».', 'Compartilhe seu link ou código em «Indicados».', 'Chia sẻ liên kết hoặc mã từ mục giới thiệu.', 'Bagikan tautan atau kode dari bagian referal.', 'Davetler bölümündeki bağlantını veya kodunu paylaş.', 'Udostępnij link lub kod z sekcji poleceń.'),
    },
    {
      title: L('Друг начнёт учиться', 'Друг почне вчитися', 'Tu amigo empieza a aprender', 'Seu amigo começa a aprender', 'Bạn của bạn bắt đầu học', 'Temanmu mulai belajar', 'Arkadaşın öğrenmeye başlar', 'Znajomy zaczyna naukę'),
      text: L('Когда он введёт твой код и закончит первый урок, ты получишь 1 прокрут.', 'Коли він введе твій код і закінчить перший урок, ти отримаєш 1 прокрут.', 'Cuando introduzca tu código y termine la primera lección, recibirás 1 giro.', 'Quando inserir seu código e concluir a primeira lição, você recebe 1 giro.', 'Khi họ nhập mã và hoàn thành bài học đầu tiên, bạn nhận 1 lượt quay.', 'Saat memasukkan kodemu dan menyelesaikan pelajaran pertama, kamu mendapat 1 putaran.', 'Kodunu girip ilk dersi bitirdiğinde 1 çevirme kazanırsın.', 'Gdy wpisze twój kod i ukończy pierwszą lekcję, dostaniesz 1 los.'),
    },
    {
      title: L('Крути и выигрывай', 'Крути й вигравай', 'Gira y gana', 'Gire e ganhe', 'Quay và chiến thắng', 'Putar dan menangkan', 'Çevir ve kazan', 'Zakręć i wygraj'),
      text: L('Каждый прокрут даёт Plus от 1 дня до 365 дней.', 'Кожен прокрут дає Plus від 1 до 365 днів.', 'Cada giro da entre 1 y 365 días de Plus.', 'Cada giro dá de 1 a 365 dias de Plus.', 'Mỗi lượt quay nhận từ 1 đến 365 ngày Plus.', 'Setiap putaran memberi 1–365 hari Plus.', 'Her çevirme 1–365 gün Plus verir.', 'Każdy los daje od 1 do 365 dni Plus.'),
    },
  ];

  const rules: readonly string[] = [
    L('Прокрут начисляется за каждое засчитанное приглашение.', 'Прокрут нараховується за кожне зараховане запрошення.', 'Se acredita un giro por cada invitación válida.', 'Um giro é creditado por cada convite válido.', 'Mỗi lời mời hợp lệ nhận một lượt quay.', 'Satu putaran diberikan untuk setiap undangan yang sah.', 'Her geçerli davet için bir çevirme yüklenir.', 'Jeden los jest przyznawany za każde uznane zaproszenie.'),
    L('Не более 3 прокрутов в день и 30 в месяц.', 'Не більше 3 прокрутів на день і 30 на місяць.', 'Máximo 3 giros al día y 30 al mes.', 'No máximo 3 giros por dia e 30 por mês.', 'Tối đa 3 lượt mỗi ngày và 30 lượt mỗi tháng.', 'Maksimal 3 putaran per hari dan 30 per bulan.', 'Günde en fazla 3, ayda 30 çevirme.', 'Maksymalnie 3 losy dziennie i 30 miesięcznie.'),
    L('Выигрыш суммируется с текущим сроком Plus.', 'Виграш додається до поточного строку Plus.', 'El premio se suma a tu período Plus actual.', 'O prêmio é somado ao período Plus atual.', 'Phần thưởng được cộng vào thời hạn Plus hiện tại.', 'Hadiah ditambahkan ke masa Plus saat ini.', 'Ödül mevcut Plus sürene eklenir.', 'Nagroda dodaje się do obecnego okresu Plus.'),
    L('Результат определяет сервер.', 'Результат визначає сервер.', 'El servidor determina el resultado.', 'O servidor determina o resultado.', 'Máy chủ xác định kết quả.', 'Server menentukan hasilnya.', 'Sonucu sunucu belirler.', 'Wynik ustala serwer.'),
  ];

  const prizeLabel = (days: number): string => {
    const labels: Record<number, string> = {
      1: L('1 день', '1 день', '1 día', '1 dia', '1 ngày', '1 hari', '1 gün', '1 dzień'),
      7: L('7 дней', '7 днів', '7 días', '7 dias', '7 ngày', '7 hari', '7 gün', '7 dni'),
      30: L('1 месяц', '1 місяць', '1 mes', '1 mês', '1 tháng', '1 bulan', '1 ay', '1 miesiąc'),
      90: L('3 месяца', '3 місяці', '3 meses', '3 meses', '3 tháng', '3 bulan', '3 ay', '3 miesiące'),
      180: L('6 месяцев', '6 місяців', '6 meses', '6 meses', '6 tháng', '6 bulan', '6 ay', '6 miesięcy'),
      365: L('1 год', '1 рік', '1 año', '1 ano', '1 năm', '1 tahun', '1 yıl', '1 rok'),
    };
    return labels[days] ?? String(days);
  };

  if (!rouletteOn) {
    return (
      <View style={[styles.root, { backgroundColor: t.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', textAlign: 'center' }}>
          {L('Раздел временно недоступен', 'Розділ тимчасово недоступний', 'Sección temporalmente no disponible', 'Seção temporariamente indisponível', 'Mục tạm thời không khả dụng', 'Bagian sementara tidak tersedia', 'Bölüm geçici olarak kullanılamıyor', 'Sekcja jest chwilowo niedostępna')}
        </Text>
      </View>
    );
  }

  const bloomColors: [string, string] = isCinemaMode(themeMode)
    ? [CINEMA[themeMode].bloomA, CINEMA[themeMode].bloomB]
    : [t.accent, t.accent];

  const heroPrizes = [ROULETTE_PRIZES[2], ROULETTE_PRIZES[5], ROULETTE_PRIZES[3]]; // 1м / 1г / 3м

  return (
    <View style={styles.root}>
      <LinearGradient colors={t.bgGradient} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['transparent', cinemaAlpha(bloomColors[0], 0.18), cinemaAlpha(bloomColors[1], 0.26)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomBloom}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Хедер */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.headerBtn, { borderColor: t.border }]}
            accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '400' }}>‹</Text>
          </Pressable>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1, textAlign: 'center' }}>
            {L('Что это?', 'Що це?', '¿Qué es?', 'O que é?', 'Đây là gì?', 'Apa ini?', 'Bu nedir?', 'Co to jest?')}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Hero: три карточки веером */}
        <View style={styles.hero}>
          {heroPrizes.map((p, i) => (
            <View
              key={p.index}
              style={[
                styles.heroCardOuter,
                { shadowColor: '#000000' },
                i === 1 ? styles.heroCardCenter : null,
                { transform: [{ rotate: i === 0 ? '-8deg' : i === 2 ? '8deg' : '0deg' }] },
              ]}
            >
              <View style={[styles.heroCardInner, { borderColor: i === 1 ? t.accent : t.border }]}>
                <Image source={p.image} style={styles.heroCardImage} resizeMode="cover" />
              </View>
            </View>
          ))}
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '700', textAlign: 'center', marginTop: 18, paddingHorizontal: 32 }}>
          {L('Рулетка Plus', 'Рулетка Plus', 'Ruleta Plus', 'Roleta Plus', 'Vòng quay Plus', 'Roulette Plus', 'Plus Ruleti', 'Ruletka Plus')}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', textAlign: 'center', marginTop: 6, paddingHorizontal: 32 }}>
          {L('Друг вводит твой код и заканчивает первый урок — ты получаешь 1 прокрут. Приз — Plus от 1 дня до 365 дней.', 'Друг вводить твій код і закінчує перший урок — ти отримуєш 1 прокрут. Приз — Plus від 1 до 365 днів.', 'Tu amigo introduce tu código y termina la primera lección: recibes 1 giro. Premio Plus de 1 a 365 días.', 'Seu amigo insere seu código e conclui a primeira lição: você recebe 1 giro. Prêmio Plus de 1 a 365 dias.', 'Bạn bè nhập mã và hoàn thành bài học đầu tiên: bạn nhận 1 lượt quay. Giải Plus từ 1 đến 365 ngày.', 'Teman memasukkan kodemu dan menyelesaikan pelajaran pertama: kamu mendapat 1 putaran. Hadiah Plus 1–365 hari.', 'Arkadaşın kodunu girip ilk dersi bitirir: 1 çevirme kazanırsın. Ödül 1–365 gün Plus.', 'Znajomy wpisuje twój kod i kończy pierwszą lekcję: dostajesz 1 los. Nagroda Plus od 1 do 365 dni.')}
        </Text>

        {/* Как это работает */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            {L('Как это работает', 'Як це працює', 'Cómo funciona', 'Como funciona', 'Cách hoạt động', 'Cara kerjanya', 'Nasıl çalışır', 'Jak to działa')}
          </Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: t.accent }]}>
                <Text style={{ color: t.correctText, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>{s.title}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', marginTop: 2 }}>{s.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Призы */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            {L('Призы', 'Призи', 'Premios', 'Prêmios', 'Phần thưởng', 'Hadiah', 'Ödüller', 'Nagrody')}
          </Text>
          {ROULETTE_PRIZES.map((p) => (
            <View key={p.index} style={styles.prizeRow}>
              <View style={[styles.prizeThumbOuter, { borderColor: t.border }]}>
                <Image source={p.image} style={styles.prizeThumb} resizeMode="cover" />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700', width: 74 }}>
                {prizeLabel(p.days)}
              </Text>
              {SHOW_SPIN_ODDS && (
                <>
                  <View style={[styles.prizeBarTrack, { backgroundColor: t.border }]}>
                    <View style={[styles.prizeBarFill, { backgroundColor: t.accent, width: `${Math.max(2, p.weight)}%` }]} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', width: 52, textAlign: 'right' }}>
                    {p.weight}%
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Правила */}
        <View style={[styles.card, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily }]}>
            {L('Правила', 'Правила', 'Reglas', 'Regras', 'Quy tắc', 'Aturan', 'Kurallar', 'Zasady')}
          </Text>
          {rules.map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={{ color: t.accent, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700' }}>•</Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', flex: 1 }}>{r}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <View style={[styles.ctaOuter, { shadowColor: '#000000' }]}>
            <Pressable
              onPress={() => router.push('/referrals')}
              style={({ pressed }: { pressed: boolean }) => [{ borderRadius: 22, overflow: 'hidden', opacity: pressed ? 0.92 : 1 }]}
              accessibilityLabel={L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời một người bạn', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
            >
              <LinearGradient
                colors={bloomColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.ctaBtn, { height: ds.buttonHeight }]}
              >
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                  {L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời một người bạn', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottomBloom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  heroCardOuter: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroCardCenter: {
    zIndex: 1,
    marginTop: -14,
  },
  heroCardInner: {
    width: 120,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  prizeThumbOuter: {
    width: 48,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  prizeThumb: {
    width: '100%',
    height: '100%',
  },
  prizeBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prizeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ctaWrap: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  ctaOuter: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaBtn: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
