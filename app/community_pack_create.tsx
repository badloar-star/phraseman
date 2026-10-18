import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import HybridSheetShell from '../components/modal_fx/HybridSheetShell';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import {
  CardsGlassBottomBar,
  CardsGlassPrimaryButton,
  CardsGlassScreen,
  CardsGlassStateBlock,
  CardsGlassSurface,
  useCardsGlass,
} from './flashcards/CardsGlassKit';
import { PackMenuRow, PackPopoverMenu } from './community_packs/PackCreateGlassParts';
import { AddCardRow, EditorCardList, EditorCardRow, EditorField, EditorHeader, EditorSheet, LevelChips, VisibilitySegment } from './community_packs/PackEditorV2';
import { normalizePackLevel, PACK_LEVELS, type PackLevel } from './flashcards/pack_deck_meta';
import { useAuthorPackQuota } from './community_packs/useAuthorPackQuota';
import { KitCta, KitSectionHead } from '../components/cards-grid/CardsKit';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { DebugLogger } from './debug-logger';
import { actionToastTri, emitAppEvent } from './events';
import { flashcardsCommunityPacksAvailableForTarget } from './flashcards_target_gate';
import {
  COMMUNITY_PACK_CARD_COUNT_MAX,
  COMMUNITY_PACK_CARD_COUNT_MIN,
  type CommunityPackSubmissionPayload,
} from './community_packs/schema';
import { publishLocalAuthorPack, withdrawLocalAuthorPack } from './community_packs/publishLocalPack';
import { PACK_PUBLISH_DAILY_LIMIT_COPY } from './community_packs/publish_limit_copy';
import { fetchCommunityPackForAuthorEdit } from './community_packs/communityFirestore';
import {
  clearCommunityPackCreateDraft,
  communityPackCreateDraftIsMeaningful,
  loadCommunityPackCreateDraft,
  saveCommunityPackCreateDraft,
} from './community_packs/communityPackDraftStorage';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { soundDirector } from '../modules/audio/sound_director';
import {
  UGC_CARD_THEME_DEFAULT_ID,
  UGC_CARD_THEME_IDS,
  type UgcCardThemeId,
} from './community_packs/ugcCardThemePresets';
import {
  isLocalAuthorPackId,
  FREE_AUTHOR_PACK_LIMIT,
  loadLocalAuthorPacks,
  saveLocalAuthorPack,
} from './community_packs/localAuthorPacks';
import { getCanonicalUserId } from './user_id_policy';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { getTextInputSystemEditMenuProps } from './textInputSystemMenuProps';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { useFeatureAccess, usePremium } from '../components/PremiumContext';
import { trackEvent } from './analytics';
import { creatorPaywallContext, shouldGateCreator } from './creator_access';
import BouncyScrollView from '../components/BouncyScrollView';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import {
  normalizePackCardTexts,
  NO_PACK_LANGUAGE,
  normalizePackLanguage,
  type PackLanguage,
} from './flashcards/pack_languages';
import { buildSourceLabel } from './flashcards/source_labels';
import {
} from './flashcards/marketplace';
import { consumeSavedCardSetStage } from './community_packs/savedCardSetStaging';
import { noteSwallowedAs } from './swallow_log';
import { PACK_ROW_DELETE_LOCK_MS, rowsWithout } from './community_packs/pack_rows_remove'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Предел названия в поле (координатор 18.10: шапка набора переносит название целиком, без многоточия — 80 держат её в 2–3 строки). Сервер режет до 200 (functions/src/community_packs.ts) — поле строже. */
const PACK_TITLE_MAX_CHARS = 80;

type Row = {
  id: string;
  en: string;
  ru: string;
  uk: string;
  translationUk?: string;
  origin?: { source?: string; sourceId?: string; sourceTitle?: string };
  es?: string;
  sourceLocales?: {
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  };
};

function rowFromStagedSavedCard(card: Record<string, unknown>, packLanguage: PackLanguage, lang: Lang): Row {
  const normalized = normalizePackCardTexts(card, packLanguage);
  const note = String(card.note ?? card.description ?? '').trim();
  return {
    id: String(card.id ?? '').trim(),
    en: normalized.targetText,
    ru: normalized.translationText,
    uk: note,
    translationUk: typeof card.uk === 'string' ? card.uk : undefined,
    origin: card.origin && typeof card.origin === 'object'
      ? card.origin as Row['origin']
      : { source: String(card.source ?? 'lesson'), sourceId: String(card.sourceId ?? ''), sourceTitle: String(card.sourceTitle ?? '') },
    es: typeof card.es === 'string' ? card.es.trim() || undefined : undefined,
    sourceLocales: typeof card.sourceLocales === 'object' && card.sourceLocales
      ? card.sourceLocales as Row['sourceLocales']
      : undefined,
  };
}

type PlannedCommunitySourceLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

function plannedCommunitySourceLocale(lang: Lang): PlannedCommunitySourceLocale | null {
  return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl'
    ? lang
    : null;
}

function communitySourceLocalesWith(
  sourceLocales: Row['sourceLocales'] | undefined,
  locale: PlannedCommunitySourceLocale | null,
  text: string,
): NonNullable<Row['sourceLocales']> {
  const next = {
    'pt-BR': sourceLocales?.['pt-BR'],
    vi: sourceLocales?.vi,
    id: sourceLocales?.id,
    tr: sourceLocales?.tr,
    pl: sourceLocales?.pl,
  };
  if (locale) next[locale] = text || undefined;
  return next;
}

function communityPackRowWithSourceLocale(
  base: Row,
  en: string,
  ru: string,
  es: string,
  note: string,
  locale: PlannedCommunitySourceLocale | null,
  text: string,
): Row {
  const next = {
    ...base,
    en,
    uk: note,
    sourceLocales: communitySourceLocalesWith(base.sourceLocales, locale, text),
  };
  next.ru = ru;
  next.es = es || undefined;
  return next;
}

function newCommunityPackRowWithSourceLocale(
  id: string,
  en: string,
  ru: string,
  es: string,
  note: string,
  locale: PlannedCommunitySourceLocale | null,
  text: string,
): Row {
  const row = {
    id,
    en,
    uk: note,
    sourceLocales: communitySourceLocalesWith(undefined, locale, text),
  } as Row;
  row.ru = ru;
  row.es = es || undefined;
  return row;
}

function communityPackValidationToast(
  err: string,
  cardsLen: number,
): Parameters<typeof actionToastTri>[1] {
  switch (err) {
    case 'card_count':
      if (cardsLen < COMMUNITY_PACK_CARD_COUNT_MIN) {
        return {
          ru: `Минимум ${COMMUNITY_PACK_CARD_COUNT_MIN} карточек.`,
          uk: `Мінімум ${COMMUNITY_PACK_CARD_COUNT_MIN} карток.`,
          es: `Al menos ${COMMUNITY_PACK_CARD_COUNT_MIN} tarjetas.`, en: `At least ${COMMUNITY_PACK_CARD_COUNT_MIN} cards.`,
          'pt-BR': `No mínimo ${COMMUNITY_PACK_CARD_COUNT_MIN} cartões.`,
          vi: `Tối thiểu ${COMMUNITY_PACK_CARD_COUNT_MIN} thẻ.`,
          id: `Minimal ${COMMUNITY_PACK_CARD_COUNT_MIN} kartu.`,
          tr: `En az ${COMMUNITY_PACK_CARD_COUNT_MIN} kart.`,
          pl: `Minimum ${COMMUNITY_PACK_CARD_COUNT_MIN} kart.`,
        };
      }
      return {
        ru: `Не более ${COMMUNITY_PACK_CARD_COUNT_MAX} карточек.`,
        uk: `Не більше ${COMMUNITY_PACK_CARD_COUNT_MAX} карток.`,
        es: `Como máximo, ${COMMUNITY_PACK_CARD_COUNT_MAX} tarjetas.`, en: `No more than ${COMMUNITY_PACK_CARD_COUNT_MAX} cards.`,
        'pt-BR': `No máximo ${COMMUNITY_PACK_CARD_COUNT_MAX} cartões.`,
        vi: `Tối đa ${COMMUNITY_PACK_CARD_COUNT_MAX} thẻ.`,
        id: `Maksimal ${COMMUNITY_PACK_CARD_COUNT_MAX} kartu.`,
        tr: `En fazla ${COMMUNITY_PACK_CARD_COUNT_MAX} kart.`,
        pl: `Maksymalnie ${COMMUNITY_PACK_CARD_COUNT_MAX} kart.`,
      };
    case 'title_or_desc':
      return {
        ru: 'Укажи название и описание набора.',
        uk: 'Вкажи назву й опис набору.',
        es: 'Indica el título y la descripción del pack.', en: 'Enter the pack title and description.',
        'pt-BR': 'Informe o título e a descrição do pacote.',
        vi: 'Nhập tên và mô tả của bộ thẻ.',
        id: 'Isi judul dan deskripsi paket.',
        tr: 'Paketin adını ve açıklamasını gir.',
        pl: 'Podaj nazwę i opis zestawu.',
      };
    case 'card_fields':
      // зачем (D188-следствие, владелец 14.10): набор может быть на испанском, французском, немецком, итальянском —
      // «EN / English text» было ложью; теперь «фраза и перевод» на любом языке набора.
      return {
        ru: 'У каждой карточки должны быть фраза и перевод.',
        uk: 'У кожної картки мають бути вислів і переклад.',
        es: 'Cada tarjeta debe tener frase y traducción.', en: 'Every card needs a phrase and a translation.',
        'pt-BR': 'Cada cartão precisa ter frase e tradução.',
        vi: 'Mỗi thẻ cần có cụm từ và bản dịch.',
        id: 'Setiap kartu harus memiliki frasa dan terjemahan.',
        tr: 'Her kartta ifade ve çeviri olmalı.',
        pl: 'Każda karta musi mieć zwrot i tłumaczenie.',
      };
    case 'study_target_gate':
      return {
        ru: 'Community-наборы для French закрыты до отдельной проверки источников.',
        uk: 'Community-набори для French закриті до окремої перевірки джерел.',
        es: 'Los packs community para French están bloqueados hasta una revisión de fuentes.', en: 'Community packs for French are closed until the sources are reviewed.',
        'pt-BR': 'Os pacotes community para French ficam bloqueados até uma revisão separada das fontes.',
        vi: 'Bộ community cho French bị chặn cho đến khi kiểm tra nguồn riêng.',
        id: 'Paket community untuk French diblokir sampai sumbernya ditinjau terpisah.',
        tr: 'French community paketleri ayrı kaynak incelemesine kadar kapalı.',
        pl: 'Zestawy community dla French są zablokowane do osobnej weryfikacji źródeł.',
      };
    default:
      return {
        ru: 'Проверь название, описание и все карточки.',
        uk: 'Перевір назву, опис і всі картки.',
        es: 'Revisa el título, la descripción y todas las tarjetas.', en: 'Check the title, description and all cards.',
        'pt-BR': 'Verifique o título, a descrição e todos os cartões.',
        vi: 'Kiểm tra tên, mô tả và tất cả thẻ.',
        id: 'Periksa judul, deskripsi, dan semua kartu.',
        tr: 'Adı, açıklamayı ve tüm kartları kontrol et.',
        pl: 'Sprawdź nazwę, opis i wszystkie karty.',
      };
  }
}

export default function CommunityPackCreateScreen() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const effectiveOs = useEffectivePlatformOS();
  const router = useRouter();
  const params = useLocalSearchParams<{ packId?: string; fresh?: string; stage?: string; packLanguage?: string }>();
  const editPackId = typeof params.packId === 'string' ? params.packId.trim() : '';
  const freshStart = String(params.fresh ?? '') === '1';
  const stageKey = typeof params.stage === 'string' ? params.stage.trim() : '';

  // зачем: Liquid Glass — токены активной темы (cards.html #23–24, #65–74).
  const { t, g } = useCardsGlass();
  // зачем (макет cards-section «Новый набор»): части экрана рисуются токенами 2.0
  const kg = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const entryPackLanguage = normalizePackLanguage(params.packLanguage ?? studyTarget);
  const L = useCallback((
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl }), [lang]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // зачем (владелец 04.10: «Описание» необязательное и не на виду): поле показывается по пункту меню «⋮»; пока пусто — при сохранении берётся название
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => normalizePackLanguage(params.packLanguage ?? studyTarget));
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  // зачем (cards-v2 `lvls`, данные Ядра ee01d089a): уровень набора A1–C1 по выбору автора; нет выбора — поле не уходит
  const [level, setLevel] = useState<PackLevel | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [addCardFormOpen, setAddCardFormOpen] = useState(false);
  const [draftEn, setDraftEn] = useState('');
  const [draftRu, setDraftRu] = useState('');
  const [draftEs, setDraftEs] = useState('');
  const [draftPlannedTranslation, setDraftPlannedTranslation] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  /** Extra bottom padding so ScrollView can scroll past the keyboard. */
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const [clearDraftModalOpen, setClearDraftModalOpen] = useState(false);
  /** Меню «⋯» в шапке (очистить черновик / сообщить об ошибке). */
  const [packMenuOpen, setPackMenuOpen] = useState(false);
  /** Индекс карточки, для которой открыто меню «править / удалить». */
  const [rowMenuIdx, setRowMenuIdx] = useState<number | null>(null);
  /** Окно «Карточек уже 50». */
  const [cardLimitModalOpen, setCardLimitModalOpen] = useState(false);
  /** Оформление (цвет карточек, иконка) — необязательное, по умолчанию свёрнуто. */

  const scrollViewRef = useRef<ScrollView>(null);
  const savedPackIdRef = useRef<string | undefined>(undefined);
  const originalStudyTargetRef = useRef(studyTarget);
  const submitInFlightRef = useRef(false);
  const scrollYRef = useRef(0);
  const kbHeightRef = useRef(0);
  const lastFocusedInputRef = useRef<React.RefObject<TextInput | null> | null>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const draftEnInputRef = useRef<TextInput>(null);
  const draftRuInputRef = useRef<TextInput>(null);
  const draftEsInputRef = useRef<TextInput>(null);
  const draftPlannedInputRef = useRef<TextInput>(null);
  const draftNoteInputRef = useRef<TextInput>(null);
  const draftPanelRef = useRef<View>(null);

  const communityPacksTargetEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  // Device authoring remains available offline and independently of cloud/catalog gates.
  const canUse = true;
  const isEditMode = !!editPackId;

  // зачем (владелец 2026-08-24): СОЗДАНИЕ своего набора — функция подписки
  // (Plus/Pro/Max). Как и в редакторе карточек, гейт стоит на самом экране,
  // а не на кнопках — входов в него несколько (хаб категорий, «Мои наборы»).
  // Редактирование СВОЕГО существующего набора не гейтится: уже созданное не
  // отбираем (решение владельца), поэтому условие завязано на isEditMode.
  // зачем accessResolved (аудит 2026-08-24): до резолва подписки hasPremiumAccess
  // равен false — платящий человек на холодном старте получил бы пейвол вместо
  // экрана. Канонический паттерн проекта: ждать резолва перед редиректом
  // (см. ai_companion_session.tsx). Сохранение при этом закрыто уже по creatorGated.
  const { accessResolved } = usePremium();
  const hasPremiumAccess = useFeatureAccess('flashcards');
  const creatorGated = !isEditMode && shouldGateCreator(hasPremiumAccess);
  const creatorLocked = creatorGated && accessResolved;
  const creatorRedirectedRef = useRef(false);
  useEffect(() => {
    if (!creatorLocked || creatorRedirectedRef.current) return;
    creatorRedirectedRef.current = true;
    void trackEvent('paywall_shown', { context: creatorPaywallContext('pack'), source: 'pack_create' });
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/premium_modal',
      params: { context: creatorPaywallContext('pack'), source: 'pack_create' },
    } as never);
  }, [creatorLocked, router]);

  // зачем (Карточки 2.0 12.10, координатор: лимит на ВХОДЕ, а не после «Создать»): у Free 3 своих набора (D118). Счёт и флаг лимита отдаёт
  // useAuthorPackQuota (Ядро 859c0e487): первый кадр из памяти, пересчёт с устройства, 0 чтений Firestore. Серверная граница записи
  // (saveLocalAuthorPack) остаётся второй линией защиты; черновик сохраняется сам.
  const { quota: authorPackQuota } = useAuthorPackQuota(hasPremiumAccess);
  const ownPackCount = authorPackQuota?.count ?? null;
  const packLimitReached = !isEditMode && accessResolved && !hasPremiumAccess && !!authorPackQuota?.limitReached;

  /** Create mode: false until local draft load/clear finished (avoid overwriting AsyncStorage). */
  const [draftHydrated, setDraftHydrated] = useState(() => isEditMode || !canUse);

  // PM-065: one canonical card appearance; legacy stored theme indices are read
  // for compatibility but never affect the rendered UI or new submissions.
  const themeKey: UgcCardThemeId = UGC_CARD_THEME_DEFAULT_ID;
  const plannedDraftLocale = plannedCommunitySourceLocale(lang);

  const scrollFocusedInputIntoView = useCallback((inputRef: React.RefObject<TextInput | null>) => {
    const input = inputRef.current;
    const scroll = scrollViewRef.current;
    if (!input || !scroll) return;
    const winH = Dimensions.get('window').height;
    const kb = kbHeightRef.current || Keyboard.metrics()?.height || 0;
    const visibleBottom = kb > 0 ? winH - kb : winH;
    const pad = 20;
    input.measureInWindow((_ix, iy, _iw, ih) => {
      const bottom = iy + ih;
      if (bottom > visibleBottom - pad) {
        const delta = bottom - visibleBottom + pad;
        scroll.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
      }
    });
  }, []);

  const bindScrollOnFocus = useCallback(
    (inputRef: React.RefObject<TextInput | null>) => () => {
      lastFocusedInputRef.current = inputRef;
      scrollFocusedInputIntoView(inputRef);
      if (effectiveOs === 'android') {
        requestAnimationFrame(() => scrollFocusedInputIntoView(inputRef));
        setTimeout(() => scrollFocusedInputIntoView(inputRef), 120);
        setTimeout(() => scrollFocusedInputIntoView(inputRef), 320);
      }
    },
    [scrollFocusedInputIntoView, effectiveOs],
  );

  useEffect(() => {
    const showEvent = effectiveOs === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = effectiveOs === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      kbHeightRef.current = e.endCoordinates.height;
      setKeyboardBottomInset(e.endCoordinates.height);
      const r = lastFocusedInputRef.current;
      if (r) {
        requestAnimationFrame(() => scrollFocusedInputIntoView(r));
        setTimeout(() => scrollFocusedInputIntoView(r), 80);
      }
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      kbHeightRef.current = 0;
      setKeyboardBottomInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollFocusedInputIntoView, effectiveOs]);

  useEffect(() => {
    if (!canUse) return;
    if (!isEditMode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const localMirror = (await loadLocalAuthorPacks()).find(x => x.id === editPackId || x.cloudPackId === editPackId);
      if (isLocalAuthorPackId(editPackId) || localMirror) {
        /** Свой набор с устройства — читаем локально, без облака и модерации. */
        const local = localMirror;
        if (cancelled) return;
        if (!local) {
          setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'The pack is not available for editing', 'El pack no está disponible para editar', 'O pacote não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Zestaw nie jest dostępny do edycji'));
          return;
        }
        setTitle(local.title);
        savedPackIdRef.current = local.id;
        originalStudyTargetRef.current = local.studyTarget ?? studyTarget;
        setDescription(local.description);
        setPackLanguage(normalizePackLanguage(local.packLanguage));
        setPublishToCommunity(local.isPublic !== false);
        setLevel(normalizePackLevel(local.level) ?? null);
        // зачем (владелец 2026-09-21): цена платного набора восстанавливается
        // вместе с галочкой — иначе правка молча делала набор бесплатным.
        const localThemeIdx = UGC_CARD_THEME_IDS.indexOf(local.cardThemeKey as UgcCardThemeId);
        setThemeIdx(localThemeIdx >= 0 ? localThemeIdx : 0);
        setRows(
          local.cards.map((c) => ({
            translationUk: c.translationUk,
            origin: c.origin,
            id: c.id,
            en: c.en,
            ru: c.ru ?? '',
            uk: c.uk ?? '',
            es: c.es,
            sourceLocales: {
              'pt-BR': c.sourceLocales?.['pt-BR'],
              vi: c.sourceLocales?.vi,
              id: c.sourceLocales?.id,
              tr: c.sourceLocales?.tr,
              pl: c.sourceLocales?.pl,
            },
          })),
        );
        return;
      }
      const sid = await getCanonicalUserId();
      if (!sid) {
        setLoadErr(L('Нет id', 'Немає id', 'No ID', 'Sin ID', 'Sem ID', 'Không có ID', 'Tanpa ID', 'ID yok', 'Brak ID'));
        return;
      }
      const snap = await fetchCommunityPackForAuthorEdit(editPackId, sid, studyTarget);
      if (cancelled) return;
      if (!snap) {
        setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'The pack is not available for editing', 'El pack no está disponible para editar', 'O pacote não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Zestaw nie jest dostępny do edycji'));
        return;
      }
      setTitle(snap.title);
      originalStudyTargetRef.current = snap.studyTarget;
      setDescription(snap.description);
      setPackLanguage(normalizePackLanguage(snap.packLanguage));
      setPublishToCommunity(true);
      const ti = UGC_CARD_THEME_IDS.indexOf(snap.cardThemeKey as UgcCardThemeId);
      setThemeIdx(ti >= 0 ? ti : 0);
      setRows(
        snap.cards.map((c) => ({
          translationUk: c.translationUk,
          origin: c.origin,
          id: c.id,
          en: c.en,
          ru: c.ru,
          uk: c.uk,
          es: c.es,
          sourceLocales: {
            'pt-BR': c.sourceLocales?.['pt-BR'],
            vi: c.sourceLocales?.vi,
            id: c.sourceLocales?.id,
            tr: c.sourceLocales?.tr,
            pl: c.sourceLocales?.pl,
          },
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse, isEditMode, editPackId, lang, studyTarget, L]);

  useEffect(() => {
    if (!canUse || isEditMode) {
      setDraftHydrated(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (freshStart) {
        await clearCommunityPackCreateDraft(studyTarget, lang, entryPackLanguage);
        if (stageKey) {
          const staged = await consumeSavedCardSetStage(stageKey);
          if (staged && staged.cards.length > 0 && !cancelled) {
            const language = normalizePackLanguage(staged.packLanguage);
            setPackLanguage(language);
            setRows(staged.cards.map((card) => rowFromStagedSavedCard(card, language, lang)).filter((row) => row.id && row.en));
          }
        }
        if (!cancelled) setDraftHydrated(true);
        return;
      }
      const d = await loadCommunityPackCreateDraft(studyTarget, lang, entryPackLanguage);
      if (cancelled) return;
      if (d) {
        setTitle(d.title);
        setDescription(d.description);
        setThemeIdx(d.themeIdx);
        setPackLanguage(normalizePackLanguage(d.packLanguage ?? studyTarget));
        setPublishToCommunity(d.publishToCommunity !== false);
        setLevel(normalizePackLevel(d.level) ?? null);
        setRows(d.rows.map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })));
        setAddCardFormOpen(d.addCardFormOpen);
        setDraftEn(d.draftEn);
        setDraftRu(d.draftRu);
        setDraftEs(d.draftEs);
        setDraftPlannedTranslation(d.draftPlannedTranslation);
        setDraftNote(d.draftNote);
      }
      setDraftHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse, isEditMode, freshStart, stageKey, studyTarget, lang, entryPackLanguage]);

  useEffect(() => {
    if (!draftHydrated || isEditMode || !canUse) return;
    if (editingIdx != null) return;
    const tmr = setTimeout(() => {
      void saveCommunityPackCreateDraft({
        title,
        description,
        themeIdx,
        packLanguage,
        publishToCommunity,
        ...(level ? { level } : {}),
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftEs,
        draftPlannedTranslation,
        draftNote,
      }, studyTarget, lang);
    }, 420);
    return () => clearTimeout(tmr);
  }, [
    draftHydrated,
    isEditMode,
    canUse,
    editingIdx,
    title,
    description,
    themeIdx,
    packLanguage,
    publishToCommunity,
    level,
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftEs,
    draftPlannedTranslation,
    draftNote,
    studyTarget,
    lang,
  ]);

  useEffect(() => {
    if (!draftHydrated || isEditMode || !canUse) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') {
        if (editingIdx != null) return;
        void saveCommunityPackCreateDraft({
          title,
          description,
          themeIdx,
          packLanguage,
          publishToCommunity,
          rows,
          addCardFormOpen,
          draftEn,
          draftRu,
          draftEs,
          draftPlannedTranslation,
          draftNote,
        }, studyTarget, lang);
      }
    });
    return () => sub.remove();
  }, [
    draftHydrated,
    isEditMode,
    canUse,
    editingIdx,
    title,
    description,
    themeIdx,
    packLanguage,
    publishToCommunity,
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftEs,
    draftPlannedTranslation,
    draftNote,
    studyTarget,
    lang,
  ]);

  // зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): двойной тап «Удалить» удалял ещё и соседнюю карточку (индекс сдвигался, шторка закрывается ~440 мс): замок по времени + сверка удаляемой строки по ссылке
  const rowDeleteLockUntilRef = useRef(0);
  const removeRow = useCallback((idx: number, expected?: Row) => {
    const now = Date.now();
    if (now < rowDeleteLockUntilRef.current) {
      console.log(`[OPT-UI] pack_row_delete ignored reason=double_tap idx=${idx} leftMs=${rowDeleteLockUntilRef.current - now}`); // guard-ok: ранний выход пишет причину
      return;
    }
    rowDeleteLockUntilRef.current = now + PACK_ROW_DELETE_LOCK_MS;
    setRows((r) => {
      if (r.length <= 0) return r;
      const without = rowsWithout(r, idx, expected);
      if (!without) {
        console.log(`[OPT-UI] pack_row_delete ignored reason=stale_row idx=${idx} rows=${r.length}`); // guard-ok: ранний выход пишет причину
        return r;
      }
      return without.map((row, i) => ({ ...row, id: `c${i + 1}` }));
    });
  }, []);

  // зачем (Карточки 2.0, макет «Изменить набор»: ручка переноса): порядок карточек меняют перетаскиванием; номера c1, c2… пересчитываются как при удалении
  const moveRow = useCallback((from: number, to: number) => {
    setRows((r) => {
      if (from === to || from < 0 || to < 0 || from >= r.length || to >= r.length) return r;
      const next = [...r];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
    });
  }, []);
  /** Пока строку тащат, прокрутка экрана отключена — иначе вертикальный жест уходил бы в скролл. */
  const [rowsDragging, setRowsDragging] = useState(false);

  const editRow = useCallback(
    (idx: number) => {
      Keyboard.dismiss();
      const row = rows[idx];
      if (!row) return;
      setDraftEn(row.en);
      setDraftRu(row.ru);
      setDraftEs(row.es ?? '');
      setDraftPlannedTranslation(plannedDraftLocale ? row.sourceLocales?.[plannedDraftLocale] ?? '' : '');
      setDraftNote(row.uk);
      setAddCardFormOpen(true);
      setEditingIdx(idx);
    },
    [rows, plannedDraftLocale],
  );

  useEffect(() => {
    if (editingIdx == null) return;
    const timer = setTimeout(() => {
      const panel = draftPanelRef.current;
      const scroll = scrollViewRef.current;
      if (!panel || !scroll) return;
      panel.measureInWindow((_ix, iy) => {
        const desiredTopOffset = 96;
        if (iy > desiredTopOffset) {
          const delta = iy - desiredTopOffset;
          scroll.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
        }
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [editingIdx]);

  const draftTranslation = plannedDraftLocale ? draftPlannedTranslation : lang === 'es' ? draftEs : draftRu;
  const setDraftTranslation = plannedDraftLocale ? setDraftPlannedTranslation : lang === 'es' ? setDraftEs : setDraftRu;
  const draftTranslationInputRef = plannedDraftLocale ? draftPlannedInputRef : lang === 'es' ? draftEsInputRef : draftRuInputRef;
  const draftValid = draftEn.trim().length > 0 && draftTranslation.trim().length > 0;
  const isEditingCard = editingIdx != null;

  const saveDraftCard = useCallback(() => {
    Keyboard.dismiss();
    const en = draftEn.trim();
    const translation = draftTranslation.trim();
    if (!en || !translation) {
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Заполни фразу и перевод.',
        uk: 'Заповни вислів і переклад.',
        es: 'Completa la frase y la traducción.', en: 'Fill in the phrase and the translation.',
        'pt-BR': 'Preencha a frase e a tradução.',
        vi: 'Nhập cụm từ và bản dịch.',
        id: 'Isi frasa dan terjemahannya.',
        tr: 'İfadeyi ve çeviriyi doldur.',
        pl: 'Uzupełnij zwrot i tłumaczenie.',
      }));
      return;
    }
    const ru = plannedDraftLocale ? draftRu.trim() : lang === 'es' ? draftRu.trim() : translation;
    const es = plannedDraftLocale ? draftEs.trim() : lang === 'es' ? translation : draftEs.trim();
    const note = draftNote.trim();
    if (editingIdx != null) {
      setRows((r) =>
        r.map((row, i) =>
          i === editingIdx
            ? communityPackRowWithSourceLocale(row, en, ru, es, note, plannedDraftLocale, translation)
            : row,
        ),
      );
    } else {
      setRows((r) => {
        if (r.length >= 50) return r;
        const next = [
          ...r,
          newCommunityPackRowWithSourceLocale(`c${r.length + 1}`, en, ru, es, note, plannedDraftLocale, translation),
        ];
        return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
      });
    }
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftPlannedTranslation('');
    setDraftNote('');
    setAddCardFormOpen(false);
    setEditingIdx(null);
  }, [draftEn, draftRu, draftEs, draftTranslation, draftNote, editingIdx, lang, plannedDraftLocale]);

  const cancelDraftCard = useCallback(() => {
    Keyboard.dismiss();
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftPlannedTranslation('');
    setDraftNote('');
    setAddCardFormOpen(false);
    setEditingIdx(null);
  }, []);

  const localDraftLooksMeaningful = useMemo(
    () =>
      communityPackCreateDraftIsMeaningful({
        v: 1,
        title,
        description,
        themeIdx,
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftEs,
        draftPlannedTranslation,
        draftNote,
      }),
    [title, description, themeIdx, rows, addCardFormOpen, draftEn, draftRu, draftEs, draftPlannedTranslation, draftNote],
  );

  const performClearLocalDraft = useCallback(() => {
    setClearDraftModalOpen(false);
    void clearCommunityPackCreateDraft(studyTarget, lang, packLanguage);
    setTitle('');
    setDescription('');
    setThemeIdx(0);
    setPublishToCommunity(false);
    setLevel(null);
    setRows([]);
    setAddCardFormOpen(false);
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftPlannedTranslation('');
    setDraftNote('');
  }, [studyTarget, lang, packLanguage]);

  const onClearLocalDraftPrompt = useCallback(() => {
    setClearDraftModalOpen(true);
  }, []);

  const payload = useMemo((): CommunityPackSubmissionPayload | null => {
    const cards = rows.map((row) => ({
      translationUk: row.translationUk,
      origin: row.origin,
      id: row.id,
      en: row.en.trim(),
      targetText: row.en.trim(),
      translationText: row.ru.trim() || row.es?.trim() || Object.values(row.sourceLocales ?? {}).find((value) => String(value ?? '').trim()) || undefined,
      ru: row.ru.trim() || undefined,
      uk: row.uk.trim() || undefined,
      es: row.es?.trim() || undefined,
      sourceLocales: {
        'pt-BR': row.sourceLocales?.['pt-BR'],
        vi: row.sourceLocales?.vi,
        id: row.sourceLocales?.id,
        tr: row.sourceLocales?.tr,
        pl: row.sourceLocales?.pl,
      },
    }));
    const p: CommunityPackSubmissionPayload = {
      packLanguage,
      publishToCommunity,
      ...(level ? { level } : {}),
      studyTarget,
      title: title.trim(),
      // зачем (владелец 04.10): описание необязательно — пустое заменяется названием, чтобы набор проходил прежние проверки и публикацию
      description: description.trim() || title.trim(),
      sourceLang: lang,
      cards,
      cardThemeKey: themeKey,
      // Приватный набор ценой не обладает: его никто, кроме автора, не увидит.
      // зачем ноль жёстко (владелец 2026-09-21: «убери чтобы никто не смог
      // сделать набор платным»): блок цены снят с экрана, назначить её через
      // приложение нельзя. Поле оставлено в payload осознанно — сервер НЕ
      // трогаем по прямому запрету владельца, и возврат цены будет обратным
      // коммитом, а не переписыванием.
      priceRunes: 0,
    };
    return p;
  }, [title, description, rows, themeKey, lang, packLanguage, publishToCommunity, level, studyTarget]);

  /** Локальная проверка перед сохранением: название, описание и хотя бы одна карточка. */
  const localSaveError = useCallback((submission: CommunityPackSubmissionPayload): string | null => {
    if (!submission.title.trim() || !submission.description.trim()) return 'title_or_desc';
    if (submission.cards.length < 10 || submission.cards.length > 50) return 'card_count';
    if (submission.cards.some((c) => !c.en.trim())) return 'card_fields';
    return null;
  }, []);

  const onSubmit = useCallback(() => {
    if (!payload || submitInFlightRef.current) return;
    // Вторая линия защиты: сохранить новый набор без подписки нельзя, даже если
    // редирект на пейвол почему-то не отработал.
    if (creatorGated) return;
    const err = localSaveError(payload);
    if (err) {
      emitAppEvent(
        'action_toast',
        actionToastTri(
          'error',
          err === 'no_cards'
            ? {
                ru: 'Добавь хотя бы одну карточку.',
                uk: 'Додай хоча б одну картку.',
                es: 'Añade al menos una tarjeta.', en: 'Add at least one card.',
                'pt-BR': 'Adicione pelo menos um cartão.',
                vi: 'Thêm ít nhất một thẻ.',
                id: 'Tambahkan setidaknya satu kartu.',
                tr: 'En az bir kart ekle.',
                pl: 'Dodaj przynajmniej jedną kartę.',
              }
            : communityPackValidationToast(err, payload.cards.length),
        ),
      );
      return;
    }
    submitInFlightRef.current = true;
    void (async () => {
      setBusy(true);
      try {
        const authorStableId = await getCanonicalUserId().catch(noteSwallowedAs('community_pack_create:useCallback.getCanonicalUserId', null));
        const cloudEdit = isEditMode && !isLocalAuthorPackId(editPackId);
        const localId = savedPackIdRef.current ?? (isEditMode ? (cloudEdit ? `local_pack_${editPackId}` : editPackId) : undefined);
        const previous = localId ? (await loadLocalAuthorPacks()).find(pack => pack.id === localId) : undefined;
        // зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): снятие публикации стояло ДО сохранения: сбой сохранения оставлял набор уже снятым с публикации (а сбой снятия обрывал сохранение — правки терялись). Теперь сначала сохраняем.
        // Persist the author's latest version even while the public version is awaiting review.
        const savedId = await saveLocalAuthorPack(payload, {
          packId: localId,
          authorStableId: authorStableId ?? undefined,
          studyTarget: originalStudyTargetRef.current,
          cloudPackId: cloudEdit && !previous ? editPackId : undefined,
          isPremium: hasPremiumAccess,
        });
        savedPackIdRef.current = savedId;
        if (!payload.publishToCommunity && previous) {
          try {
            await withdrawLocalAuthorPack(savedId, previous);
          } catch (withdrawError: unknown) {
            // набор уже сохранён; не снялась только публикация — говорим прямо, форма остаётся, повторное «Сохранить» повторит снятие
            console.warn('[PACK-CREATE] save ok, withdraw failed', { packId: savedId, reason: withdrawError instanceof Error ? withdrawError.message : String(withdrawError) }); // guard-ok: catch называет причину
            emitAppEvent('action_toast', actionToastTri('info', {
              ru: 'Набор сохранён. Снять с публикации не получилось — попробуй ещё раз.',
              uk: 'Набір збережено. Зняти з публікації не вийшло — спробуй ще раз.',
              en: 'Pack saved. Couldn’t unpublish it — try again.',
              es: 'Pack guardado. No se pudo retirar la publicación: inténtalo de nuevo.',
              'pt-BR': 'Pacote salvo. Não deu para despublicar — tente de novo.', vi: 'Đã lưu bộ thẻ. Chưa hủy công khai được — thử lại nhé.', id: 'Paket tersimpan. Publikasi belum bisa dicabut — coba lagi.', tr: 'Paket kaydedildi. Yayından kaldırılamadı — tekrar dene.', pl: 'Zestaw zapisany. Nie udało się wycofać publikacji — spróbuj jeszcze raz.',
            }));
            return;
          }
        }
        if (!payload.publishToCommunity && cloudEdit && !previous) await withdrawLocalAuthorPack(savedId);
        if (!isEditMode) await clearCommunityPackCreateDraft(studyTarget, lang, packLanguage);
        const publishResult = payload.publishToCommunity
          ? await publishLocalAuthorPack(savedId, lang, studyTarget)
          : 'submitted';
        if (publishResult === 'daily_limit') {
          // зачем: Q55 — набор сохранён на устройстве, но сервер пускает не больше 3
          // новых публикаций в сутки; говорим об этом прямо, а не «при подключении».
          emitAppEvent('action_toast', actionToastTri('info', PACK_PUBLISH_DAILY_LIMIT_COPY));
          return;
        }
        if (publishResult !== 'submitted') {
          // зачем (Макеты cards-072, разбор 13.10): набор сохранён, не дошла только публикация — это сообщение (тон info), а не ошибка
          emitAppEvent('action_toast', actionToastTri('info', {
            ru: 'Набор сохранён на устройстве. Публикация не завершена — нажми «Сохранить» ещё раз при подключении.',
            uk: 'Набір збережено на пристрої. Для публікації натисни «Зберегти» ще раз після підключення.',
            en: 'Saved on this device. Publication is pending — save again when connected.',
            es: 'Guardado en este dispositivo. Vuelve a guardar con conexión para publicarlo.',
            'pt-BR': 'Salvo neste dispositivo. A publicação está pendente — salve de novo quando estiver conectado.', vi: 'Đã lưu trên thiết bị này. Chưa xuất bản xong — hãy lưu lại khi có kết nối.', id: 'Tersimpan di perangkat ini. Publikasi belum selesai — simpan lagi saat terhubung.', tr: 'Bu cihaza kaydedildi. Yayın tamamlanmadı — bağlanınca tekrar kaydet.', pl: 'Zapisano na tym urządzeniu. Publikacja nie została zakończona — zapisz ponownie po połączeniu.',
          }));
          return;
        }
        // зачем: pm.cards.pack_created — только для НОВОГО набора (создал и
        // опубликовал), не для правки уже существующего своего набора.
        if (!isEditMode) soundDirector.request('pm.cards.pack_created', { scope: 'cards' });
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Набор сохранён.',
          uk: 'Набір збережено.',
          es: 'Pack guardado.', en: 'Pack saved.',
          'pt-BR': 'Pacote salvo.',
          vi: 'Đã lưu bộ thẻ.',
          id: 'Paket disimpan.',
          tr: 'Paket kaydedildi.',
          pl: 'Zestaw zapisany.',
        }));
        emitAppEvent('community_pack_added', { packId: editPackId || 'local' });
        // зачем fallback на конкретный набор при cloudEdit (аудит 2026-09-17):
        // safeRouterBack обычно и так вернёт на экран набора (человек пришёл сюда
        // по кнопке «Править» с flashcards_collection.tsx), но без истории стека
        // (например открытие по прямой ссылке) fallback уводил в общий хаб
        // «/flashcards», и автор не видел результат своей правки без лишнего
        // поиска набора заново.
        safeRouterBack(
          router,
          (cloudEdit
            ? { pathname: '/flashcards_collection', params: { pack: editPackId } }
            : '/flashcards') as any,
        );
      } catch (e: unknown) {
        DebugLogger.error('community_pack_create:save', e instanceof Error ? e : new Error(String(e)), 'warning');
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
        if (msg.includes('free_author_pack_limit_reached')) {
          // зачем: сырой код ошибки в тосте — потеря работы без объяснения; ведём в покупку (черновик сохранён)
          console.log('[PACK-CREATE] save refused by free pack limit -> paywall'); // guard-ok: ранний выход пишет причину
          router.push({ pathname: '/premium_modal', params: { context: creatorPaywallContext('pack'), source: 'pack_create_limit' } } as never);
          return;
        }
        // зачем (аудит Optimistic UI Карточек, 12.10): раньше в тост шёл текст исключения («Account changed», «Local pack not found») — английский в русском интерфейсе;
        // человеку — локализованный текст, причина — в журнал.
        console.warn('[OPT-UI] pack_save rollback reason=exception', msg.slice(0, 200)); // guard-ok: catch пишет причину
        const short = '';
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: short || 'Не удалось сохранить набор.',
          uk: short || 'Не вдалося зберегти набір.',
          es: short || 'No se pudo guardar el pack.', en: short || 'Could not save the pack.',
          'pt-BR': short || 'Não foi possível salvar o pacote.',
          vi: short || 'Không thể lưu bộ thẻ.',
          id: short || 'Gagal menyimpan paket.',
          tr: short || 'Paket kaydedilemedi.',
          pl: short || 'Nie udało się zapisać zestawu.',
        }));
      } finally {
        submitInFlightRef.current = false;
        setBusy(false);
      }
    })();
  }, [payload, localSaveError, isEditMode, editPackId, studyTarget, lang, router, creatorGated, packLanguage]);


  // зачем (Liquid Glass, cards.html #23–24, #65–74): весь экран на токенах стекла —
  // поля-плашки с подписью внутри, переключатель, строки карточек, закреплённая
  // «Сохранить». Логика черновика/публикации/лимитов выше не менялась.
  const backLabel = L('Назад', 'Назад', 'Back', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz');
  const menuLabel = L('Меню', 'Меню', 'Menu', 'Menú', 'Menu', 'Menu', 'Menu', 'Menü', 'Menu');
  const goBack = () => {
    Keyboard.dismiss();
    safeRouterBack(router, '/flashcards' as any);
  };
  // зачем (Макеты cards-074, решение координатора 13.10): шапка вторичных экранов (недоступно для правки, недоступно в сборке, скелетон перед пейволом) — как у основной формы
  // и в утверждённом cards-v2 edHead: × слева, заголовок слева, без ← и центровки; один общий EditorHeader вместо двух разных шапок
  const renderHeader = (title: string, right?: React.ReactNode) => (
    <EditorHeader g={kg} title={title} closeLabel={backLabel} onClose={goBack} right={right} />
  );
  const newPackTitle = L('Новый набор', 'Новий набір', 'New pack', 'Nuevo pack', 'Novo pacote', 'Bộ thẻ mới', 'Paket baru', 'Yeni paket', 'Nowy zestaw');
  const glassInput = { color: g.text, fontSize: 16, lineHeight: 22, paddingHorizontal: 0, paddingVertical: 0, marginTop: 6 } as const;
  const fieldLabel = { color: g.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700' as const, letterSpacing: 0.2 };
  const cardsCountText = `${rows.length} ${L('из', 'з', 'of', 'de', 'de', 'trên', 'dari', '/', 'z')} 10–50`;

  if (!canUse) {
    return (
      <CardsGlassScreen g={g}>
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          {renderHeader('')}
          <ContentWrap>
            <View style={styles.formHorizontalInset}>
              <Text style={{ color: g.secondary, fontSize: 16, lineHeight: 22, marginTop: 24 }}>
                {communityPacksTargetEnabled
                  ? L('Создание наборов пока недоступно.', 'Створення наборів поки недоступне.', 'Creating packs isn’t available yet.', 'Crear packs aún no está disponible.', 'La creación de pacotes ainda não está disponível.', 'Chưa thể tạo bộ thẻ.', 'Pembuatan paket belum tersedia.', 'Paket oluşturma henüz kullanılamıyor.', 'Tworzenie zestawów nie jest jeszcze dostępne.')
                  : L('Наборы сообщества для французского пока закрыты.', 'Набори спільноти для французької поки закриті.', 'Community packs for French aren’t open yet.', 'Los packs de la comunidad para francés aún no están abiertos.', 'Os pacotes da comunidade para francês ainda não estão abertos.', 'Bộ thẻ cộng đồng cho tiếng Pháp chưa mở.', 'Paket komunitas untuk bahasa Prancis belum dibuka.', 'Fransızca için topluluk paketleri henüz açık değil.', 'Zestawy społeczności dla francuskiego nie są jeszcze otwarte.')}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </CardsGlassScreen>
    );
  }

  // Недоступно для правки / ошибка загрузки (макет #74): плитка-замок, заголовок, «Назад».
  if (isEditMode && loadErr) {
    return (
      <CardsGlassScreen g={g}>
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          {renderHeader(L('Редактирование', 'Редагування', 'Editing', 'Edición', 'Edição', 'Chỉnh sửa', 'Pengeditan', 'Düzenleme', 'Edycja'))}
          <ContentWrap>
            <CardsGlassStateBlock
              g={g}
              testID="ugc-pack-load-error"
              icon="lock-closed-outline" // зачем (Макеты cards-074): в образце замок контурный, а не залитый
              title={loadErr}
              actionLabel={backLabel}
              onAction={goBack}
            />
          </ContentWrap>
        </SafeAreaView>
      </CardsGlassScreen>
    );
  }

  // зачем (аудит пейволла «Мастерская», 2026-08-25): раньше здесь всегда
  // рендерилась полная рабочая форма создания набора, даже для гейтнутого
  // юзера — блокировалось только финальное сохранение (onSubmit проверяет
  // creatorGated), а сама форма была видна и заполняема до срабатывания
  // редиректа на premium_modal. Данные не терялись (onSubmit — вторая линия
  // защиты), но это мельтешение формы перед пейволом хуже, чем в
  // flashcards_card_editor.tsx, где форма вообще не рендерится. Тот же
  // паттерн здесь: скелетон вместо полей, пока не разрешится подписка/пойдёт
  // редирект — геометрия шапки и первого кадра сохраняется (layout stability).
  if (creatorGated) {
    return (
      <CardsGlassScreen g={g}>
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          {renderHeader(newPackTitle)}
          <ContentWrap>
            <View style={[styles.formHorizontalInset, { marginTop: 12 }]}>
              {[74, 74, 74].map((h, i) => (
                <View key={i} style={{ marginTop: 14 }}>
                  <SkeletonBlock width="100%" height={h} borderRadius={14} baseColor={g.opaqueControl} highlightColor={g.selected} />
                </View>
              ))}
            </View>
          </ContentWrap>
        </SafeAreaView>
      </CardsGlassScreen>
    );
  }

  const cloudEditLocked = isEditMode && !isLocalAuthorPackId(editPackId);
  const cardLimitReached = rows.length >= 50;
  const cardBackText = (row: Row): string => {
    // зачем: та же логика «что показывать на обороте», что была в превью карточки.
    const planned = lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl'
      ? row.sourceLocales?.[lang]?.trim()
      : '';
    return planned || (lang === 'es' ? (row.es?.trim() || row.ru.trim()) : row.ru.trim());
  };
  const openAddCard = () => {
    Keyboard.dismiss();
    if (cardLimitReached) {
      // Макет #71: вместо «мёртвой» кнопки — окно с объяснением.
      console.log(`[PACK-CREATE] лимит карточек: rows=${rows.length} -> окно`); // guard-ok: ранний выход обязан называть причину
      setCardLimitModalOpen(true);
      return;
    }
    if (isEditingCard) return;
    setAddCardFormOpen(true);
  };
  const editLabel = L('Редактировать', 'Редагувати', 'Edit', 'Editar', 'Editar', 'Chỉnh sửa', 'Edit', 'Düzenle', 'Edytuj');
  const deleteLabel = L('Удалить', 'Видалити', 'Delete', 'Eliminar', 'Excluir', 'Xóa', 'Hapus', 'Sil', 'Usuń');
  const cancelLabel = L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj');
  const menuRow = rowMenuIdx != null ? rows[rowMenuIdx] : undefined;

  const levelLabel = L('Уровень', 'Рівень', 'Level', 'Nivel', 'Nível', 'Trình độ', 'Level', 'Seviye', 'Poziom');
  const visibilityLabel = L('Кто видит', 'Хто бачить', 'Who can see it', 'Quién lo ve', 'Quem vê', 'Ai xem được', 'Siapa yang melihat', 'Kimler görür', 'Kto widzi');
  const privateOnlyLabel = L('Только я', 'Лише я', 'Only me', 'Solo yo', 'Só eu', 'Chỉ mình tôi', 'Hanya saya', 'Yalnızca ben', 'Tylko ja');
  const publicAllLabel = L('Все', 'Усі', 'Everyone', 'Todos', 'Todos', 'Mọi người', 'Semua', 'Herkes', 'Wszyscy');
  const cardsTitle = L('Карточки', 'Картки', 'Cards', 'Tarjetas', 'Cartões', 'Thẻ', 'Kartu', 'Kartlar', 'Karty');
  // зачем (Карточки 2.0 12.10, `ghostadd` «＋ Карточка»): кнопка добавления — под списком, подпись короткая
  const addCardLabel = L('Карточка', 'Картка', 'Card', 'Tarjeta', 'Cartão', 'Thẻ', 'Kartu', 'Kart', 'Karta');
  const createPackLabel = L('Создать набор', 'Створити набір', 'Create pack', 'Crear pack', 'Criar pacote', 'Tạo bộ thẻ', 'Buat paket', 'Paket oluştur', 'Utwórz zestaw');
  const firstCardLabel = L('Первая карточка', 'Перша картка', 'First card', 'Primera tarjeta', 'Primeiro cartão', 'Thẻ đầu tiên', 'Kartu pertama', 'İlk kart', 'Pierwsza karta');
  const saveLabel = L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz');
  const unlimitedPlusLabel = L('Безлимит с Plus', 'Безліміт з Plus', 'Unlimited with Plus', 'Sin límite con Plus', 'Sem limite com Plus', 'Không giới hạn với Plus', 'Tanpa batas dengan Plus', 'Plus ile sınırsız', 'Bez limitu z Plus');
  const openPackLimitPaywall = () => {
    Keyboard.dismiss();
    void trackEvent('paywall_shown', { context: creatorPaywallContext('pack'), source: 'pack_create_limit' });
    router.push({ pathname: '/premium_modal', params: { context: creatorPaywallContext('pack'), source: 'pack_create_limit' } } as never);
  };
  const wordLabel = L('Слово или фраза', 'Слово або вислів', 'Word or phrase', 'Palabra o frase', 'Palavra ou frase', 'Từ hoặc cụm từ', 'Kata atau frasa', 'Kelime veya ifade', 'Słowo lub fraza');
  const translationLabel = L('Перевод', 'Переклад', 'Translation', 'Traducción', 'Tradução', 'Bản dịch', 'Terjemahan', 'Çeviri', 'Tłumaczenie');
  const anotherLabel = L('Ещё одну', 'Ще одну', 'Add another', 'Otra más', 'Mais um', 'Thêm nữa', 'Satu lagi', 'Bir tane daha', 'Jeszcze jedną');
  const addLabel = L('Добавить', 'Додати', 'Add', 'Añadir', 'Adicionar', 'Thêm', 'Tambah', 'Ekle', 'Dodaj');
  // зачем: «Ещё одну» — сохранить эту карточку и сразу открыть пустую форму (шторка остаётся)
  const saveAndAnother = () => {
    saveDraftCard();
    setAddCardFormOpen(true);
  };
  const fieldInput = { color: kg.text, fontSize: 16, lineHeight: 24, paddingHorizontal: 0, paddingVertical: 0 } as const;

  return (
    <CardsGlassScreen g={g}>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={effectiveOs === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={64}
        >
          <EditorHeader
            g={kg}
            title={isEditMode
              ? L('Изменить набор', 'Змінити набір', 'Edit pack', 'Editar pacote', 'Editar pacote', 'Chỉnh sửa bộ thẻ', 'Edit paket', 'Paketi düzenle', 'Edytuj zestaw')
              : newPackTitle}
            closeLabel={backLabel}
            onClose={goBack}
            right={(
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {packLimitReached ? (
                  // макет `limPill('layers', '3/3')`: пилюля лимита — реальный лимит места (свои наборы)
                  <View testID="ugc-pack-limit-pill" accessible accessibilityLabel={`${ownPackCount} / ${FREE_AUTHOR_PACK_LIMIT}`} style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: kg.plateFillFrom, boxShadow: plateBoxShadow(kg) }}>
                    <Ionicons name="layers-outline" size={16} color={kg.text} />
                    <Text style={{ color: kg.text, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{`${ownPackCount}/${FREE_AUTHOR_PACK_LIMIT}`}</Text>
                  </View>
                ) : null}
              <TouchableOpacity
                testID="ugc-pack-menu"
                accessibilityRole="button"
                accessibilityLabel={menuLabel}
                hitSlop={8}
                onPress={() => setPackMenuOpen(true)}
                style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: kg.plateFillFrom, boxShadow: plateBoxShadow(kg) }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={kg.text} />
              </TouchableOpacity>
              </View>
            )}
          />
          <BouncyScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            nestedScrollEnabled
            scrollEnabled={!rowsDragging}
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={effectiveOs === 'ios' ? 'interactive' : 'on-drag'}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 140 + keyboardBottomInset }}
            showsVerticalScrollIndicator={false}
          >
            <ContentWrap>
              <View style={[styles.formHorizontalInset, { paddingTop: 22 }]}>
                <EditorField g={kg} label={L('Название', 'Назва', 'Title', 'Título', 'Título', 'Tên', 'Judul', 'Başlık', 'Tytuł')}>
                  <TextInput
                    ref={titleInputRef}
                    accessibilityLabel={L('Название набора', 'Назва набору', 'Pack title', 'Título del pack', 'Título do pacote', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł zestawu')}
                    {...getTextInputSystemEditMenuProps()}
                    value={title}
                    onChangeText={setTitle}
                    // зачем (аудит Карточек 18.10, длинные названия): сервер молча режет название до 200 символов (functions/src/community_packs.ts
                    // .slice(0, 200)) — у автора на телефоне оставалось длиннее, чем у всех; а шапка набора переносит название целиком.
                    // Поле строже сервера: 80 символов (решение координатора) — и сервер ничего не режет, и шапка не растёт на полэкрана.
                    maxLength={PACK_TITLE_MAX_CHARS}
                    onFocus={bindScrollOnFocus(titleInputRef)}
                    placeholder={L('Название набора', 'Назва набору', 'Pack title', 'Título del pack', 'Título do pacote', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł zestawu')}
                    placeholderTextColor={kg.mutedText}
                    style={fieldInput}
                  />
                </EditorField>

                <View style={{ marginTop: 22 }}>
                  <VisibilitySegment
                    g={kg}
                    label={visibilityLabel}
                    value={publishToCommunity}
                    onChange={setPublishToCommunity}
                    disabled={cloudEditLocked}
                    privateLabel={privateOnlyLabel}
                    publicLabel={publicAllLabel}
                  />
                </View>

                <View style={{ marginTop: 22 }}>
                  <LevelChips g={kg} label={levelLabel} value={level} onChange={(next) => setLevel(normalizePackLevel(next) ?? null)} levels={PACK_LEVELS} />
                </View>

                {descriptionOpen ? (
                  <View style={{ marginTop: 22 }}>
                    <EditorField g={kg} label={L('Описание', 'Опис', 'Description', 'Descripción', 'Descrição', 'Mô tả', 'Deskripsi', 'Açıklama', 'Opis')} tall>
                      <TextInput
                        ref={descriptionInputRef}
                        accessibilityLabel={L('Описание набора', 'Опис набору', 'Pack description', 'Descripción del pack', 'Descrição do pacote', 'Mô tả bộ thẻ', 'Deskripsi paket', 'Paket açıklaması', 'Opis zestawu')}
                        {...getTextInputSystemEditMenuProps()}
                        value={description}
                        onChangeText={setDescription}
                        onFocus={bindScrollOnFocus(descriptionInputRef)}
                        placeholder={L('Кратко о наборе', 'Коротко про набір', 'Briefly about the pack', 'Breve descripción del pack', 'Resumo do pacote', 'Mô tả ngắn về bộ thẻ', 'Ringkasan paket', 'Paket hakkında kısa bilgi', 'Krótko o pakiecie')}
                        placeholderTextColor={kg.mutedText}
                        multiline
                        style={[fieldInput, { fontSize: 16, lineHeight: 22, minHeight: 60, textAlignVertical: 'top' }]}
                      />
                    </EditorField>
                  </View>
                ) : null}

                {/* зачем здесь НЕТ цены (владелец 2026-09-21: «убери чтобы никто
                    не смог сделать набор платным»): блок цены с ползунком снят
                    целиком, наборы бесплатны. Отменяет решение 2026-09-17. Сервер
                    по прямому запрету владельца НЕ трогали — механизм начисления
                    автору цел и оживёт, если цену вернут. */}
                <KitSectionHead g={kg} title={cardsTitle} count={rows.length} />

                <View testID="ugc-pack-cards-count" style={{ gap: 9 }}>
                  {isEditMode ? (
                    <EditorCardList
                      g={kg}
                      rows={rows.map((row, idx) => ({ key: `${row.id}-${idx}`, front: row.en, back: cardBackText(row) }))}
                      onPress={(idx) => { if (!isEditingCard) editRow(idx); }}
                      onLongPress={(idx) => { Keyboard.dismiss(); if (!isEditingCard) setRowMenuIdx(idx); }}
                      onDelete={(idx) => { if (!isEditingCard) removeRow(idx); }}
                      onMove={moveRow}
                      onDragState={setRowsDragging}
                      deleteLabel={deleteLabel}
                      gripLabel={L('Перенести карточку', 'Перенести картку', 'Move the card', 'Mover la tarjeta', 'Mover o cartão', 'Di chuyển thẻ', 'Pindahkan kartu', 'Kartı taşı', 'Przenieś kartę')}
                    />
                  ) : rows.map((row, idx) => (
                    <EditorCardRow
                      key={row.id + String(idx)}
                      g={kg}
                      testID={`ugc-pack-card-${idx}`}
                      front={row.en}
                      back={cardBackText(row)}
                      onPress={() => {
                        if (!isEditingCard) editRow(idx);
                      }}
                      onLongPress={() => {
                        Keyboard.dismiss();
                        if (!isEditingCard) setRowMenuIdx(idx);
                      }}
                    />
                  ))}
                  <AddCardRow g={kg} label={addCardLabel} onPress={openAddCard} disabled={isEditingCard} testID="ugc-pack-add-card" />
                </View>
                {/* Все пользовательские наборы используют единое оформление; старый
                    picker цветов/рубашек удалён из активного UI (PM-065). */}
              </View>
            </ContentWrap>
          </BouncyScrollView>

          {/* Нижняя кнопка (макет «bot»): пока карточек нет — «Первая карточка», иначе «Сохранить». Кнопка активна и при <10 карточек:
              тап показывает тост «Минимум 10 карточек» (макет #69); проверки — прежние, в onSubmit. */}
          <CardsGlassBottomBar g={g} bottomInset={keyboardBottomInset > 0 ? 0 : insets.bottom}>
            {rows.length === 0 && !isEditMode ? (
              <KitCta g={kg} testID="ugc-pack-first-card" label={firstCardLabel} icon="add" onPress={openAddCard} />
            ) : (
              <KitCta
                g={kg}
                testID="ugc-pack-save"
                label={packLimitReached ? unlimitedPlusLabel : isEditMode ? saveLabel : createPackLabel}
                icon={packLimitReached ? 'lock-open-outline' : undefined}
                onPress={() => {
                  if (busy) return;
                  if (packLimitReached) { openPackLimitPaywall(); return; }
                  Keyboard.dismiss();
                  void onSubmit();
                }}
              />
            )}
          </CardsGlassBottomBar>
        </KeyboardAvoidingView>

        {/* Форма карточки — нижняя шторка (макет «Новая карточка»). */}
        <EditorSheet
          g={kg}
          visible={addCardFormOpen}
          title={isEditingCard
            ? L('Редактирование карточки', 'Редагування картки', 'Editing the card', 'Editar tarjeta', 'Editar cartão', 'Chỉnh sửa thẻ', 'Edit kartu', 'Kartı düzenle', 'Edytuj kartę')
            : L('Новая карточка', 'Нова картка', 'New card', 'Nueva tarjeta', 'Novo cartão', 'Thẻ mới', 'Kartu baru', 'Yeni kart', 'Nowa karta')}
          closeLabel={cancelLabel}
          onClose={cancelDraftCard}
          bottomInset={keyboardBottomInset}
        >
          <EditorField g={kg} label={wordLabel}>
            <TextInput
              ref={draftEnInputRef}
              testID="ugc-pack-draft-front"
              accessibilityLabel={L('Передняя сторона карточки', 'Передня сторона картки', 'Front side of the card', 'Cara delantera de la tarjeta', 'Frente do cartão', 'Mặt trước của thẻ', 'Sisi depan kartu', 'Kartın ön yüzü', 'Przednia strona karty')}
              {...getTextInputSystemEditMenuProps()}
              value={draftEn}
              onChangeText={setDraftEn}
              placeholderTextColor={kg.mutedText}
              style={fieldInput}
            />
          </EditorField>
          <View style={{ marginTop: 16 }}>
            <EditorField g={kg} label={translationLabel}>
              <TextInput
                ref={draftTranslationInputRef}
                testID="ugc-pack-draft-back"
                accessibilityLabel={L('Задняя сторона карточки', 'Зворотна сторона картки', 'Back side of the card', 'Cara trasera de la tarjeta', 'Verso do cartão', 'Mặt sau của thẻ', 'Sisi belakang kartu', 'Kartın arka yüzü', 'Tylna strona karty')}
                {...getTextInputSystemEditMenuProps()}
                value={draftTranslation}
                onChangeText={setDraftTranslation}
                placeholderTextColor={kg.mutedText}
                style={fieldInput}
              />
            </EditorField>
          </View>
          <View style={{ marginTop: 16 }}>
            <EditorField g={kg} label={L('Пример', 'Приклад', 'Example', 'Ejemplo', 'Exemplo', 'Ví dụ', 'Contoh', 'Örnek', 'Przykład')}>
              <TextInput
                ref={draftNoteInputRef}
                accessibilityLabel={L('Описание или заметка к карточке', 'Опис або замітка до картки', 'Description or note for the card', 'Descripción o nota de la tarjeta', 'Descrição ou nota do cartão', 'Mô tả hoặc ghi chú thẻ', 'Deskripsi atau catatan kartu', 'Kart açıklaması veya notu', 'Opis lub notatka do karty')}
                {...getTextInputSystemEditMenuProps()}
                value={draftNote}
                onChangeText={setDraftNote}
                placeholderTextColor={kg.mutedText}
                style={fieldInput}
              />
            </EditorField>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <CardsGlassPrimaryButton
                g={g}
                variant="ghost"
                label={isEditingCard ? cancelLabel : anotherLabel}
                onPress={isEditingCard ? cancelDraftCard : saveAndAnother}
                disabled={!isEditingCard && (!draftValid || cardLimitReached)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CardsGlassPrimaryButton
                g={g}
                testID="ugc-pack-draft-save"
                label={isEditingCard
                  ? L('Обновить', 'Оновити', 'Update', 'Actualizar', 'Atualizar', 'Cập nhật', 'Perbarui', 'Güncelle', 'Zaktualizuj')
                  : addLabel}
                onPress={saveDraftCard}
                disabled={!draftValid || cardLimitReached}
              />
            </View>
          </View>
        </EditorSheet>

        {/* Меню шапки (макет #67): очистка черновика и сообщение об ошибке. */}
        <PackPopoverMenu g={g} visible={packMenuOpen} onClose={() => setPackMenuOpen(false)} top={68} closeLabel={cancelLabel}>
          <PackMenuRow
            g={g}
            testID="ugc-pack-menu-description"
            icon="document-text-outline"
            label={descriptionOpen
              ? L('Скрыть описание', 'Сховати опис', 'Hide description', 'Ocultar descripción', 'Ocultar descrição', 'Ẩn mô tả', 'Sembunyikan deskripsi', 'Açıklamayı gizle', 'Ukryj opis')
              : L('Описание набора', 'Опис набору', 'Pack description', 'Descripción del pack', 'Descrição do pacote', 'Mô tả bộ thẻ', 'Deskripsi paket', 'Paket açıklaması', 'Opis zestawu')}
            onPress={() => { setPackMenuOpen(false); setDescriptionOpen((open) => !open); }}
          />
          {/* зачем: язык набора в макете не нарисован, но менять его нужно — он в меню «⋮» */}
          <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12 }}>
            <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600', flexShrink: 1 }}>
              {L('Язык набора', 'Мова набору', 'Pack language', 'Idioma del pack', 'Idioma do pacote', 'Ngôn ngữ bộ thẻ', 'Bahasa paket', 'Paket dili', 'Język zestawu')}
            </Text>
            <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={setPackLanguage} allowNone liquidGlass />
          </View>
          {!isEditMode && draftHydrated && localDraftLooksMeaningful ? (
            <PackMenuRow
              g={g}
              testID="ugc-pack-clear-draft"
              icon="trash-outline"
              danger
              label={L('Очистить черновик', 'Очистити чернетку', 'Clear draft', 'Borrar borrador', 'Apagar rascunho', 'Xóa bản nháp', 'Hapus draf', 'Taslağı temizle', 'Wyczyść szkic')}
              onPress={() => {
                setPackMenuOpen(false);
                Keyboard.dismiss();
                onClearLocalDraftPrompt();
              }}
            />
          ) : null}
          <View style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}>
            <ReportErrorButton
              screen="community_pack_create"
              dataId="community_pack_editor"
              dataText={L('Создание набора', 'Створення набору', 'Creating a pack', 'Crear pack', 'Criar pacote', 'Tạo bộ thẻ', 'Buat paket', 'Paket oluşturma', 'Tworzenie zestawu')}
              textColor={g.text}
              style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
            />
          </View>
        </PackPopoverMenu>

        {/* Действия над строкой карточки: «⋯» → править / удалить. */}
        <HybridSheetShell
          visible={rowMenuIdx != null}
          onClose={() => setRowMenuIdx(null)}
          closeLabel={cancelLabel}
          testID="ugc-pack-card-menu"
          material="liquid-glass-opaque"
          backdropAccessible={false}
        >
          {({ requestDismiss }) => (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 8 }}>
                {menuRow?.en ?? ''}
              </Text>
              <PackMenuRow
                g={g}
                icon="create-outline"
                label={editLabel}
                onPress={() => {
                  const idx = rowMenuIdx;
                  requestDismiss();
                  if (idx != null) editRow(idx);
                }}
              />
              <PackMenuRow
                g={g}
                icon="trash-outline"
                danger
                label={deleteLabel}
                onPress={() => {
                  const idx = rowMenuIdx;
                  requestDismiss();
                  if (idx != null) removeRow(idx, menuRow);
                }}
              />
            </View>
          )}
        </HybridSheetShell>

        {/* Лимит 50 карточек (макет #71). */}
        <ThemedChoiceModal
          visible={cardLimitModalOpen}
          title={L('Карточек уже 50', 'Карток уже 50', 'Already 50 cards', 'Ya hay 50 tarjetas', 'Já são 50 cartões', 'Đã có 50 thẻ', 'Sudah ada 50 kartu', 'Zaten 50 kart var', 'Jest już 50 kart')}
          message={L(
            'В наборе не больше 50 карточек. Удали лишнюю, чтобы добавить новую.',
            'У наборі не більше 50 карток. Видали зайву, щоб додати нову.',
            'A pack holds at most 50 cards. Delete one to add a new card.',
            'Un pack admite como máximo 50 tarjetas. Elimina una para añadir otra.',
            'Um pacote tem no máximo 50 cartões. Exclua um para adicionar outro.',
            'Bộ thẻ có tối đa 50 thẻ. Hãy xóa bớt một thẻ để thêm thẻ mới.',
            'Satu paket maksimal berisi 50 kartu. Hapus satu untuk menambah yang baru.',
            'Bir pakette en fazla 50 kart olur. Yenisini eklemek için birini sil.',
            'W zestawie jest maksymalnie 50 kart. Usuń jedną, aby dodać nową.',
          )}
          choices={[{
            label: L('Понятно', 'Зрозуміло', 'Got it', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
            onPress: () => setCardLimitModalOpen(false),
          }]}
          onRequestClose={() => setCardLimitModalOpen(false)}
        />

        <ThemedConfirmModal
          visible={clearDraftModalOpen}
          title={L('Очистить черновик?', 'Очистити чернетку?', 'Clear the draft?', '¿Borrar borrador?', 'Apagar rascunho?', 'Xóa bản nháp?', 'Hapus draf?', 'Taslak temizlensin mi?', 'Wyczyścić szkic?')}
          message={L(
            'Локальные данные этого набора будут удалены.',
            'Локальні дані цього набору буде видалено.',
            'The local data for this pack will be deleted.',
            'Se borrarán los datos locales de este pack.',
            'Os dados locais deste pacote serão apagados.',
            'Dữ liệu cục bộ của bộ thẻ này sẽ bị xóa.',
            'Data lokal paket ini akan dihapus.',
            'Bu paketin yerel verileri silinecek.',
            'Lokalne dane tego zestawu zostaną usunięte.',
          )}
          cancelLabel={cancelLabel}
          confirmLabel={L('Очистить', 'Очистити', 'Clear', 'Borrar', 'Apagar', 'Xóa', 'Hapus', 'Temizle', 'Wyczyść')}
          confirmVariant="default"
          destructive
          onCancel={() => setClearDraftModalOpen(false)}
          onConfirm={performClearLocalDraft}
        />
      </SafeAreaView>
    </CardsGlassScreen>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  /** Side inset for form body (ContentWrap has no horizontal padding). */
  formHorizontalInset: { paddingHorizontal: 20, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
  fieldSurface: { paddingHorizontal: 16, paddingVertical: 12 },
  rowSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
});
