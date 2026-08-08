// ═══════════════════════════════════════════════════════════════════════════
// TournamentEdgeState.tsx — краевые состояния режима (макеты 45-48, 24).
//
// зачем: один компонент на все «плохие» ситуации — нет сети, загрузка,
// межсезонье, отмена турнира, «вы уже в лобби». Иначе шесть экранов начнут
// расходиться по формулировкам и отступам, а пользователь в самый неприятный
// момент увидит разнобой.
//
// Скелетон здесь НЕ спиннер на весь экран: он повторяет геометрию будущего
// контента, чтобы первый кадр совпал с финальным (Performance Bible).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Cta } from './tournament_ui';
import { T, radius, type, useTournamentPalette, type TournamentPalette} from './tournament_theme';
import { TournamentBackdrop } from './TournamentBackdrop';
import { triLang, type Lang } from '../../constants/i18n';
import { useLang } from '../LangContext';

export type EdgeKind = 'offline' | 'preseason' | 'cancelled' | 'alreadyIn' | 'emptyPool';

type Props = {
  kind: EdgeKind;
  /** Подробность, которая меняется в рантайме (сколько вернули, когда старт). */
  detail?: string;
  onRetry?: () => void;
  onSecondary?: () => void;
};

// зачем: весь модуль турниров был написан без triLang вообще — на украинском
// и остальных 7 языках интерфейса пользователь видел чистый русский текст.
function edgeCopy(kind: EdgeKind, lang: Lang): { icon: string; title: string; body: string; action?: string; secondary?: string } {
  switch (kind) {
    case 'offline':
      return {
        icon: '📡',
        title: triLang(lang, { ru: 'Нет соединения', uk: 'Немає з’єднання', es: 'Sin conexión', 'pt-BR': 'Sem conexão', vi: 'Không có kết nối', id: 'Tidak ada koneksi', tr: 'Bağlantı yok', pl: 'Brak połączenia' }),
        body: triLang(lang, { ru: 'Проверь интернет — турнир начнётся без тебя', uk: 'Перевір інтернет — турнір почнеться без тебе', es: 'Revisa tu conexión: el torneo empezará sin ti', 'pt-BR': 'Verifique sua conexão: o torneio vai começar sem você', vi: 'Kiểm tra kết nối mạng — giải đấu sẽ bắt đầu mà không có bạn', id: 'Periksa koneksi internet — turnamen akan dimulai tanpamu', tr: 'İnterneti kontrol et — turnuva sensiz başlayacak', pl: 'Sprawdź internet — turniej zacznie się bez ciebie' }),
        action: triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
      };
    case 'preseason':
      return {
        icon: '🌱',
        title: triLang(lang, { ru: 'Скоро первый турнир', uk: 'Скоро перший турнір', es: 'Pronto: el primer torneo', 'pt-BR': 'Em breve: o primeiro torneio', vi: 'Sắp có giải đấu đầu tiên', id: 'Segera: turnamen pertama', tr: 'Yakında ilk turnuva', pl: 'Wkrótce pierwszy turniej' }),
        body: triLang(lang, { ru: 'Режим готовится к запуску. Загляни позже — стартуем совсем скоро', uk: 'Режим готується до запуску. Загляни пізніше — стартуємо зовсім скоро', es: 'El modo se está preparando. Vuelve más tarde: empezamos muy pronto', 'pt-BR': 'O modo está sendo preparado. Volte mais tarde: começamos em breve', vi: 'Chế độ đang được chuẩn bị. Quay lại sau nhé — sắp bắt đầu rồi', id: 'Mode sedang disiapkan. Kembali lagi nanti — segera dimulai', tr: 'Mod başlatılmaya hazırlanıyor. Daha sonra tekrar bak — çok yakında başlıyoruz', pl: 'Tryb się przygotowuje. Zajrzyj później — startujemy już wkrótce' }),
      };
    case 'cancelled':
      return {
        icon: '🫱',
        title: triLang(lang, { ru: 'Турнир отменён', uk: 'Турнір скасовано', es: 'Torneo cancelado', 'pt-BR': 'Torneio cancelado', vi: 'Giải đấu đã bị hủy', id: 'Turnamen dibatalkan', tr: 'Turnuva iptal edildi', pl: 'Turniej odwołany' }),
        // зачем: 💎 — запрещённая эмодзи-валюта (правило владельца). Текстом
        // «монеты/жемчужины», как в tournament_results.tsx / tournament_tickets.tsx.
        body: triLang(lang, { ru: 'Не набралось игроков. Билет вернулся, плюс 3 жемчужины за ожидание', uk: 'Не набралося гравців. Квиток повернувся, плюс 3 перлини за очікування', es: 'No se juntaron suficientes jugadores. Se devolvió tu entrada, más 3 perlas por la espera', 'pt-BR': 'Não houve jogadores suficientes. Seu ingresso foi devolvido, mais 3 pérolas pela espera', vi: 'Không đủ người chơi. Vé của bạn đã được hoàn lại, cộng 3 ngọc trai vì đã chờ', id: 'Pemain tidak cukup. Tiketmu dikembalikan, plus 3 mutiara karena menunggu', tr: 'Yeterli oyuncu toplanmadı. Biletin iade edildi, bekleme için 3 inci eklendi', pl: 'Nie zebrano wystarczającej liczby graczy. Bilet wrócił, plus 3 perły za czekanie' }),
        action: triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Ir al inicio', 'pt-BR': 'Ir para o início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfaya git', pl: 'Do strony głównej' }),
      };
    case 'alreadyIn':
      return {
        icon: '✅',
        title: triLang(lang, { ru: 'Вы уже в лобби', uk: 'Ви вже в лобі', es: 'Ya estás en la sala', 'pt-BR': 'Você já está na sala', vi: 'Bạn đã ở trong phòng chờ', id: 'Anda sudah di lobi', tr: 'Zaten lobidesin', pl: 'Jesteś już w lobby' }),
        body: triLang(lang, { ru: 'Возвращаемся к текущему турниру', uk: 'Повертаємось до поточного турніру', es: 'Volviendo al torneo actual', 'pt-BR': 'Voltando ao torneio atual', vi: 'Đang quay lại giải đấu hiện tại', id: 'Kembali ke turnamen saat ini', tr: 'Mevcut turnuvaya dönülüyor', pl: 'Wracamy do bieżącego turnieju' }),
        action: triLang(lang, { ru: 'В лобби', uk: 'До лобі', es: 'Ir a la sala', 'pt-BR': 'Ir para a sala', vi: 'Vào phòng chờ', id: 'Ke lobi', tr: 'Lobiye git', pl: 'Do lobby' }),
      };
    case 'emptyPool':
      return {
        icon: '🧩',
        title: triLang(lang, { ru: 'Турнир пока недоступен', uk: 'Турнір поки недоступний', es: 'El torneo aún no está disponible', 'pt-BR': 'O torneio ainda não está disponível', vi: 'Giải đấu chưa khả dụng', id: 'Turnamen belum tersedia', tr: 'Turnuva henüz kullanılamıyor', pl: 'Turniej jeszcze niedostępny' }),
        body: triLang(lang, { ru: 'Готовим задания. Загляни позже', uk: 'Готуємо завдання. Загляни пізніше', es: 'Estamos preparando las preguntas. Vuelve más tarde', 'pt-BR': 'Estamos preparando as perguntas. Volte mais tarde', vi: 'Đang chuẩn bị câu hỏi. Quay lại sau nhé', id: 'Sedang menyiapkan soal. Kembali lagi nanti', tr: 'Sorular hazırlanıyor. Daha sonra tekrar bak', pl: 'Przygotowujemy zadania. Zajrzyj później' }),
      };
  }
}

export const TournamentEdgeState = memo(function TournamentEdgeState({
  kind, detail, onRetry, onSecondary,
}: Props) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const copy = React.useMemo(() => edgeCopy(kind, lang), [kind, lang]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <TournamentBackdrop variant="edge" />
      <Text style={styles.icon}>{copy.icon}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {copy.action && onRetry ? (
        <View style={styles.action}>
          <Cta onPress={onRetry}>{copy.action}</Cta>
        </View>
      ) : null}

      {copy.secondary && onSecondary ? (
        <View style={styles.secondary}>
          <Cta ghost onPress={onSecondary}>{copy.secondary}</Cta>
        </View>
      ) : null}

      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Animated.View>
  );
});

// ── Скелетон ────────────────────────────────────────────────────────────────

/**
 * Скелетон главной: повторяет геометрию hero-карточки, банка и сезона.
 * Так экран не «схлопывается» в спиннер и не прыгает при появлении данных.
 */
export const TournamentSkeleton = memo(function TournamentSkeleton() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <View style={styles.skeleton}>
      <View style={[styles.skeletonBlock, { height: 300 }]} />
      <View style={[styles.skeletonBlock, { height: 104 }]} />
      <View style={[styles.skeletonBlock, { height: 74 }]} />
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 56, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.text,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  body: {
    ...type.body,
    color: P.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  action: { alignSelf: 'stretch', marginTop: 28 },
  secondary: { alignSelf: 'stretch', marginTop: 10 },
  detail: { ...type.label, fontWeight: '600', color: P.ghost, marginTop: 18 },

  skeleton: { paddingHorizontal: 16, gap: 14 },
  skeletonBlock: {
    borderRadius: radius.lg,
    backgroundColor: P.card,
    opacity: 0.5,
  },
});
