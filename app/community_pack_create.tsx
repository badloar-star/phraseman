import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import auth from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {  Animated,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { flashcardsCommunityPacksAvailableForTarget } from './flashcards_target_gate';
import {
  COMMUNITY_PACK_CARD_COUNT_MAX,
  COMMUNITY_PACK_CARD_COUNT_MIN,
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from './community_packs/schema';
import { callCommunitySubmitPackForReview, isCommunityPacksCloudEnabled } from './community_packs/functionsClient';
import { fetchCommunityPackForAuthorEdit } from './community_packs/communityFirestore';
import {
  clearCommunityPackCreateDraft,
  communityPackCreateDraftIsMeaningful,
  loadCommunityPackCreateDraft,
  saveCommunityPackCreateDraft,
} from './community_packs/communityPackDraftStorage';
import UgcPackEditorCardPreview from './community_packs/UgcPackEditorCardPreview';
import { soundDirector } from '../modules/audio/sound_director';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useAccordionChevronStyle } from '../hooks/useAccordionFaqStyle';
import { configureAccordionLayout } from '../constants/layoutAnimation';
import {
  UGC_CARD_THEME_DEFAULT_ID,
  UGC_CARD_THEME_IDS,
  ugcCardChrome,
  ugcCardThemeAccent,
  ugcCardThemeLabel,
  type UgcCardThemeId,
} from './community_packs/ugcCardThemePresets';
import {
  isLocalAuthorPackId,
  loadLocalAuthorPacks,
  saveLocalAuthorPack,
} from './community_packs/localAuthorPacks';
import {
  UGC_CARD_BACK_DEFAULT_ID,
  UGC_CARD_BACK_IDS,
  cardBackFanImage,
  cardBackImage,
  ugcCardBackLabel,
  type UgcCardBackId,
} from './flashcards/cardBackCatalog';
import { getCanonicalUserId } from './user_id_policy';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { getTextInputSystemEditMenuProps } from './textInputSystemMenuProps';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { useFeatureAccess, usePremium } from '../components/PremiumContext';
import { trackEvent } from './analytics';
import { creatorPaywallContext, shouldGateCreator } from './creator_access';
import BouncyScrollView from '../components/BouncyScrollView';

type Row = {
  id: string;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: {
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  };
};

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
          es: `Al menos ${COMMUNITY_PACK_CARD_COUNT_MIN} tarjetas.`,
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
        es: `Como máximo, ${COMMUNITY_PACK_CARD_COUNT_MAX} tarjetas.`,
        'pt-BR': `No máximo ${COMMUNITY_PACK_CARD_COUNT_MAX} cartões.`,
        vi: `Tối đa ${COMMUNITY_PACK_CARD_COUNT_MAX} thẻ.`,
        id: `Maksimal ${COMMUNITY_PACK_CARD_COUNT_MAX} kartu.`,
        tr: `En fazla ${COMMUNITY_PACK_CARD_COUNT_MAX} kart.`,
        pl: `Maksymalnie ${COMMUNITY_PACK_CARD_COUNT_MAX} kart.`,
      };
    case 'title_or_desc':
      return {
        ru: 'Укажите название и описание набора.',
        uk: 'Вкажіть назву й опис набору.',
        es: 'Indica el título y la descripción del pack.',
        'pt-BR': 'Informe o título e a descrição do pacote.',
        vi: 'Nhập tên và mô tả của bộ thẻ.',
        id: 'Isi judul dan deskripsi paket.',
        tr: 'Paketin adını ve açıklamasını gir.',
        pl: 'Podaj nazwę i opis zestawu.',
      };
    case 'card_fields':
      return {
        ru: 'У каждой карточки должны быть EN и перевод.',
        uk: 'У кожної картки мають бути EN і переклад.',
        es: 'Cada tarjeta debe tener EN y traducción.',
        'pt-BR': 'Cada cartão precisa ter EN e tradução.',
        vi: 'Mỗi thẻ cần có EN và bản dịch.',
        id: 'Setiap kartu harus memiliki EN dan terjemahan.',
        tr: 'Her kartta EN ve çeviri olmalı.',
        pl: 'Każda karta musi mieć EN i tłumaczenie.',
      };
    case 'study_target_gate':
      return {
        ru: 'Community-наборы для French закрыты до отдельной проверки источников.',
        uk: 'Community-набори для French закриті до окремої перевірки джерел.',
        es: 'Los packs community para French están bloqueados hasta una revisión de fuentes.',
        'pt-BR': 'Os pacotes community para French ficam bloqueados até uma revisão separada das fontes.',
        vi: 'Bộ community cho French bị chặn cho đến khi kiểm tra nguồn riêng.',
        id: 'Paket community untuk French diblokir sampai sumbernya ditinjau terpisah.',
        tr: 'French community paketleri ayrı kaynak incelemesine kadar kapalı.',
        pl: 'Pakiety community dla French są zablokowane do osobnej weryfikacji źródeł.',
      };
    default:
      return {
        ru: 'Проверь название, описание и все карточки.',
        uk: 'Перевірте назву, опис і всі картки.',
        es: 'Revisa el título, la descripción y todas las tarjetas.',
        'pt-BR': 'Verifique o título, a descrição e todos os cartões.',
        vi: 'Kiểm tra tên, mô tả và tất cả thẻ.',
        id: 'Periksa judul, deskripsi, dan semua kartu.',
        tr: 'Adı, açıklamayı ve tüm kartları kontrol et.',
        pl: 'Sprawdź nazwę, opis i wszystkie karty.',
      };
  }
}

export default function CommunityPackCreateScreen() {
  const effectiveOs = useEffectivePlatformOS();
  const router = useRouter();
  const params = useLocalSearchParams<{ packId?: string; fresh?: string }>();
  const editPackId = typeof params.packId === 'string' ? params.packId.trim() : '';
  const freshStart = String(params.fresh ?? '') === '1';

  const { theme: t, f, themeMode, isDark } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const isLightTheme = !isDark;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [themeIdx, setThemeIdx] = useState(0);
  const [cardBackIdx, setCardBackIdx] = useState(0);
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
  /** Оформление (цвет карточек, иконка) — необязательное, по умолчанию свёрнуто. */
  const [decorOpen, setDecorOpen] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
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
  const canUse = CLOUD_SYNC_ENABLED && !IS_EXPO_GO && isCommunityPacksCloudEnabled() && communityPacksTargetEnabled;
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

  /** Create mode: false until local draft load/clear finished (avoid overwriting AsyncStorage). */
  const [draftHydrated, setDraftHydrated] = useState(() => isEditMode || !canUse);

  const themeKey: UgcCardThemeId = (UGC_CARD_THEME_IDS[themeIdx] ?? UGC_CARD_THEME_DEFAULT_ID) as UgcCardThemeId;
  const cardBackKey: UgcCardBackId = (UGC_CARD_BACK_IDS[cardBackIdx] ?? UGC_CARD_BACK_DEFAULT_ID) as UgcCardBackId;
  const selectedCardBack = cardBackImage(cardBackKey);
  const selectedCardBackFan = cardBackFanImage(cardBackKey);
  const plannedDraftLocale = plannedCommunitySourceLocale(lang);

  /**
   * Цвет карточек берём напрямую из выбранной палитры: декор paywall-модалки в светлой
   * теме игнорировал выбор автора, и «Цвет карточек» ни на что не влиял (владелец, 2026-08-13).
   */
  const cardChrome = useMemo(
    () => ugcCardChrome(themeKey, { isLight: isLightTheme, bgCard: t.bgCard, bgSurface: t.bgSurface }),
    [themeKey, isLightTheme, t.bgCard, t.bgSurface],
  );
  const decorChevron = useAccordionChevronStyle(decorOpen);
  const toggleDecor = useCallback(() => {
    Keyboard.dismiss();
    configureAccordionLayout();
    setDecorOpen((v) => !v);
  }, []);

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
      if (isLocalAuthorPackId(editPackId)) {
        /** Свой набор с устройства — читаем локально, без облака и модерации. */
        const local = (await loadLocalAuthorPacks(studyTarget)).find((x) => x.id === editPackId);
        if (cancelled) return;
        if (!local) {
          setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'El pack no está disponible para editar', 'O pack não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Pakiet nie jest dostępny do edycji'));
          return;
        }
        setTitle(local.title);
        setDescription(local.description);
        const localThemeIdx = UGC_CARD_THEME_IDS.indexOf(local.cardThemeKey as UgcCardThemeId);
        setThemeIdx(localThemeIdx >= 0 ? localThemeIdx : 0);
        const localBackIdx = UGC_CARD_BACK_IDS.indexOf(local.cardBackKey as UgcCardBackId);
        setCardBackIdx(localBackIdx >= 0 ? localBackIdx : 0);
        setRows(
          local.cards.map((c) => ({
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
        setLoadErr(L('Нет id', 'Немає id', 'Sin ID', 'Sem ID', 'Không có ID', 'Tanpa ID', 'ID yok', 'Brak ID'));
        return;
      }
      const snap = await fetchCommunityPackForAuthorEdit(editPackId, sid, studyTarget);
      if (cancelled) return;
      if (!snap) {
        setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'El pack no está disponible para editar', 'O pack não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Pakiet nie jest dostępny do edycji'));
        return;
      }
      setTitle(snap.title);
      setDescription(snap.description);
      const ti = UGC_CARD_THEME_IDS.indexOf(snap.cardThemeKey as UgcCardThemeId);
      setThemeIdx(ti >= 0 ? ti : 0);
      const bi = UGC_CARD_BACK_IDS.indexOf(snap.cardBackKey as UgcCardBackId);
      setCardBackIdx(bi >= 0 ? bi : 0);
      setRows(
        snap.cards.map((c) => ({
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
  }, [canUse, isEditMode, editPackId, lang, studyTarget]);

  useEffect(() => {
    if (!canUse || isEditMode) {
      setDraftHydrated(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (freshStart) {
        await clearCommunityPackCreateDraft(studyTarget, lang);
        if (!cancelled) setDraftHydrated(true);
        return;
      }
      const d = await loadCommunityPackCreateDraft(studyTarget, lang);
      if (cancelled) return;
      if (d) {
        setTitle(d.title);
        setDescription(d.description);
        setThemeIdx(d.themeIdx);
        setCardBackIdx(d.cardBackIdx);
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
  }, [canUse, isEditMode, freshStart, studyTarget, lang]);

  useEffect(() => {
    if (!draftHydrated || isEditMode || !canUse) return;
    if (editingIdx != null) return;
    const tmr = setTimeout(() => {
      void saveCommunityPackCreateDraft({
        title,
        description,
        themeIdx,
        cardBackIdx,
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
    cardBackIdx,
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
          cardBackIdx,
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
    cardBackIdx,
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

  const removeRow = useCallback((idx: number) => {
    setRows((r) => {
      if (r.length <= 0) return r;
      const next = r.filter((_, i) => i !== idx);
      return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
    });
  }, []);

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
        ru: 'Заполните английский текст и перевод.',
        uk: 'Заповніть англійський текст і переклад.',
        es: 'Completa el texto en inglés y la traducción.',
        'pt-BR': 'Preencha o texto em inglês e a tradução.',
        vi: 'Nhập văn bản tiếng Anh và bản dịch.',
        id: 'Isi teks bahasa Inggris dan terjemahannya.',
        tr: 'İngilizce metni ve çeviriyi doldur.',
        pl: 'Uzupełnij tekst po angielsku i tłumaczenie.',
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
        cardBackIdx,
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftEs,
        draftPlannedTranslation,
        draftNote,
      }),
    [title, description, themeIdx, cardBackIdx, rows, addCardFormOpen, draftEn, draftRu, draftEs, draftPlannedTranslation, draftNote],
  );

  const performClearLocalDraft = useCallback(() => {
    setClearDraftModalOpen(false);
    void clearCommunityPackCreateDraft(studyTarget, lang);
    setTitle('');
    setDescription('');
    setThemeIdx(0);
    setCardBackIdx(0);
    setRows([]);
    setAddCardFormOpen(false);
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftPlannedTranslation('');
    setDraftNote('');
  }, [studyTarget, lang]);

  const onClearLocalDraftPrompt = useCallback(() => {
    setClearDraftModalOpen(true);
  }, []);

  const payload = useMemo((): CommunityPackSubmissionPayload | null => {
    const cards = rows.map((row) => ({
      id: row.id,
      en: row.en.trim(),
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
      studyTarget,
      title: title.trim(),
      description: description.trim(),
      sourceLang: lang,
      cards,
      cardThemeKey: themeKey,
      cardBackKey,
    };
    return p;
  }, [title, description, rows, themeKey, cardBackKey, lang, studyTarget]);

  /**
   * Публикация в сообщество — фоном и БЕЗ формулировок про проверку/модерацию
   * (владелец, 2026-08-13). Пользователь уже получил сохранённый набор; попадёт ли
   * он в общий каталог, решает сервер, и это не должно мешать сохранению.
   */
  const publishToCommunityInBackground = useCallback(
    (submission: CommunityPackSubmissionPayload, authorStableId: string | null, updatePackId?: string) => {
      if (!canUse || !authorStableId) return;
      if (validateCommunityPackPayload(submission) !== null) return;
      void (async () => {
        try {
          if (!auth().currentUser) await auth().signInAnonymously();
          await callCommunitySubmitPackForReview({
            authorStableId,
            payload: buildCommunityPackPayloadForCloud(submission),
            ...(updatePackId ? { updatePackId } : {}),
          });
        } catch (e: unknown) {
          if (__DEV__) console.warn('[community_pack_create] publish failed', e);
        }
      })();
    },
    [canUse],
  );

  /** Локальная проверка перед сохранением: название, описание и хотя бы одна карточка. */
  const localSaveError = useCallback((submission: CommunityPackSubmissionPayload): string | null => {
    if (!submission.title.trim() || !submission.description.trim()) return 'title_or_desc';
    if (submission.cards.length === 0) return 'no_cards';
    if (submission.cards.some((c) => !c.en.trim())) return 'card_fields';
    return null;
  }, []);

  const onSubmit = useCallback(() => {
    if (!payload) return;
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
                es: 'Añade al menos una tarjeta.',
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
    void (async () => {
      setBusy(true);
      try {
        const authorStableId = await getCanonicalUserId().catch(() => null);
        const cloudEdit = isEditMode && !isLocalAuthorPackId(editPackId);
        if (cloudEdit) {
          /** Опубликованный набор живёт на сервере — сохраняем изменения там же. */
          if (!auth().currentUser) await auth().signInAnonymously();
          await callCommunitySubmitPackForReview({
            authorStableId: authorStableId ?? '',
            payload: buildCommunityPackPayloadForCloud(payload),
            updatePackId: editPackId,
          });
        } else {
          await saveLocalAuthorPack(payload, {
            packId: isEditMode ? editPackId : undefined,
            authorStableId: authorStableId ?? undefined,
            studyTarget,
          });
          if (!isEditMode) await clearCommunityPackCreateDraft(studyTarget, lang);
          publishToCommunityInBackground(payload, authorStableId);
        }
        // зачем: pm.cards.pack_created — только для НОВОГО набора (создал и
        // опубликовал), не для правки уже существующего своего набора.
        if (!isEditMode) soundDirector.request('pm.cards.pack_created', { scope: 'cards' });
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Набор сохранён.',
          uk: 'Набір збережено.',
          es: 'Pack guardado.',
          'pt-BR': 'Pacote salvo.',
          vi: 'Đã lưu bộ thẻ.',
          id: 'Paket disimpan.',
          tr: 'Paket kaydedildi.',
          pl: 'Zestaw zapisany.',
        }));
        emitAppEvent('community_pack_added', { packId: editPackId || 'local' });
        safeRouterBack(router, '/flashcards' as any);
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
        const short = msg.slice(0, 140);
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: short || 'Не удалось сохранить набор.',
          uk: short || 'Не вдалося зберегти набір.',
          es: short || 'No se pudo guardar el pack.',
          'pt-BR': short || 'Não foi possível salvar o pacote.',
          vi: short || 'Không thể lưu bộ thẻ.',
          id: short || 'Gagal menyimpan paket.',
          tr: short || 'Paket kaydedilemedi.',
          pl: short || 'Nie udało się zapisać zestawu.',
        }));
      } finally {
        setBusy(false);
      }
    })();
  }, [payload, localSaveError, isEditMode, editPackId, studyTarget, lang, publishToCommunityInBackground, router, creatorGated]);

  const bumpCardBack = useCallback((delta: number) => {
    setCardBackIdx((i) => {
      const n = UGC_CARD_BACK_IDS.length;
      return (i + delta + n * 10) % n;
    });
  }, []);

  if (!canUse) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          <View style={styles.headerRow}>
            <TapScale
              onPress={() => {
                Keyboard.dismiss();
                safeRouterBack(router, '/flashcards' as any);
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
          </View>
          <ContentWrap>
            <View style={styles.formHorizontalInset}>
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 24 }}>
                {communityPacksTargetEnabled
                  ? L('Создание наборов недоступно в этой сборке.', 'Створення наборів недоступне в цьому білді.', 'Crear packs no está disponible en esta versión.', 'A criação de packs não está disponível nesta versão.', 'Tính năng tạo bộ thẻ không khả dụng trong bản dựng này.', 'Pembuatan paket tidak tersedia di build ini.', 'Paket oluşturma bu sürümde kullanılamıyor.', 'Tworzenie pakietów nie jest dostępne w tej wersji.')
                  : L('Community-наборы для French закрыты до отдельной проверки источников.', 'Community-набори для French закриті до окремої перевірки джерел.', 'Los packs community para French están bloqueados hasta una revisión de fuentes.', 'Os packs community para French estão bloqueados até uma revisão de fontes.', 'Các gói community cho French đang bị khóa cho đến khi kiểm tra nguồn riêng.', 'Paket community untuk French dikunci sampai pemeriksaan sumber terpisah.', 'French için community paketleri ayrı kaynak kontrolüne kadar kapalı.', 'Pakiety community dla French są zablokowane do osobnej kontroli źródeł.')}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (isEditMode && loadErr) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
            <TapScale
              onPress={() => {
                Keyboard.dismiss();
                safeRouterBack(router, '/flashcards' as any);
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
              {L('Редактирование', 'Редагування', 'Edición', 'Edição', 'Chỉnh sửa', 'Pengeditan', 'Düzenleme', 'Edycja')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ContentWrap>
            <View style={styles.formHorizontalInset}>
              <Text style={{ color: '#f87171', marginTop: 20 }}>{loadErr}</Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
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
      <ScreenGradient artBackdrop="flashcards">
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
            <TapScale
              onPress={() => {
                Keyboard.dismiss();
                safeRouterBack(router, '/flashcards' as any);
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
              {L('Новый набор', 'Новий набір', 'Nuevo pack', 'Novo pack', 'Bộ thẻ mới', 'Paket baru', 'Yeni paket', 'Nowy pakiet')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ContentWrap>
            <View style={[styles.formHorizontalInset, { gap: 20, marginTop: 24 }]}>
              <View style={{ gap: 8 }}>
                <SkeletonBlock width="30%" height={f.body} borderRadius={6} />
                <SkeletonBlock width="100%" height={f.body + 2 + 32} borderRadius={16} />
              </View>
              <View style={{ gap: 8 }}>
                <SkeletonBlock width="30%" height={f.body} borderRadius={6} />
                <SkeletonBlock width="100%" height={88} borderRadius={16} />
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={effectiveOs === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={64}
        >
          <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
            <TapScale
              onPress={() => {
                Keyboard.dismiss();
                safeRouterBack(router, '/flashcards' as any);
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
              {isEditMode
                ? L('Редактировать набор', 'Редагувати набір', 'Editar pack', 'Editar pack', 'Chỉnh sửa bộ thẻ', 'Edit paket', 'Paketi düzenle', 'Edytuj pakiet')
                : L('Новый набор', 'Новий набір', 'Nuevo pack', 'Novo pack', 'Bộ thẻ mới', 'Paket baru', 'Yeni paket', 'Nowy pakiet')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <BouncyScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            nestedScrollEnabled
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={effectiveOs === 'ios' ? 'interactive' : 'on-drag'}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 32 + keyboardBottomInset }}
            showsVerticalScrollIndicator={false}
          >
            <ContentWrap>
              <View style={styles.formHorizontalInset}>
              <Text style={labelStyle(t)}>{L('Название', 'Назва', 'Título', 'Título', 'Tên', 'Judul', 'Başlık', 'Tytuł')} *</Text>
              <TextInput
                ref={titleInputRef}
                accessibilityLabel={L('Название набора', 'Назва набору', 'Título del pack', 'Título do pack', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł pakietu')}
                {...getTextInputSystemEditMenuProps()}
                value={title}
                onChangeText={setTitle}
                onFocus={bindScrollOnFocus(titleInputRef)}
                placeholder={L('Название набора', 'Назва набору', 'Título del pack', 'Título do pack', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł pakietu')}
                placeholderTextColor={t.textGhost}
                style={fieldInputStyle(t)}
              />
              <Text style={labelStyle(t)}>{L('Описание', 'Опис', 'Descripción', 'Descrição', 'Mô tả', 'Deskripsi', 'Açıklama', 'Opis')} *</Text>
              <TextInput
                ref={descriptionInputRef}
                accessibilityLabel={L('Описание набора', 'Опис набору', 'Descripción del pack', 'Descrição do pack', 'Mô tả bộ thẻ', 'Deskripsi paket', 'Paket açıklaması', 'Opis pakietu')}
                {...getTextInputSystemEditMenuProps()}
                value={description}
                onChangeText={setDescription}
                onFocus={bindScrollOnFocus(descriptionInputRef)}
                placeholder={L('Кратко о наборе', 'Коротко про набір', 'Breve descripción del pack', 'Resumo do pack', 'Mô tả ngắn về bộ thẻ', 'Ringkasan paket', 'Paket hakkında kısa bilgi', 'Krótko o pakiecie')}
                placeholderTextColor={t.textGhost}
                multiline
                style={[fieldInputStyle(t), { minHeight: 88, textAlignVertical: 'top' }]}
              />

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setAddCardFormOpen(true);
                }}
                disabled={rows.length >= 50 || isEditingCard}
                style={{
                  marginTop: 20,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 0,
                  borderColor: t.accent,
                  alignItems: 'center',
                  opacity: rows.length >= 50 || isEditingCard ? 0.45 : 1,
                }}
              >
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: f.body }}>
                  {L('+ Добавить карточку', '+ Додати картку', '+ Añadir tarjeta', '+ Adicionar cartão', '+ Thêm thẻ', '+ Tambah kartu', '+ Kart ekle', '+ Dodaj kartę')}
                </Text>
              </TouchableOpacity>

              {addCardFormOpen ? (
                <View ref={draftPanelRef} style={[styles.draftCardPanel, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginBottom: 4 }}>
                    {isEditingCard
                      ? L('Редактирование карточки', 'Редагування картки', 'Editar tarjeta', 'Editar cartão', 'Chỉnh sửa thẻ', 'Edit kartu', 'Kartı düzenle', 'Edytuj kartę')
                      : L('Новая карточка', 'Нова картка', 'Nueva tarjeta', 'Novo cartão', 'Thẻ mới', 'Kartu baru', 'Yeni kart', 'Nowa karta')}
                  </Text>
                  <Text style={[draftLabelStyle(t), { marginTop: 8 }]}>
                    {L('Передняя сторона', 'Передня сторона', 'Cara delantera', 'Frente', 'Mặt trước', 'Sisi depan', 'Ön yüz', 'Przednia strona')}
                  </Text>
                  <TextInput
                    ref={draftEnInputRef}
                    accessibilityLabel={L('Передняя сторона карточки', 'Передня сторона картки', 'Cara delantera de la tarjeta', 'Frente do cartão', 'Mặt trước của thẻ', 'Sisi depan kartu', 'Kartın ön yüzü', 'Przednia strona karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftEn}
                    onChangeText={setDraftEn}
                    onFocus={bindScrollOnFocus(draftEnInputRef)}
                    style={[fieldInputStyle(t), { borderColor: t.accent }]}
                  />
                  <Text style={draftLabelStyle(t)}>
                    {L('Задняя сторона', 'Зворотна сторона', 'Cara trasera', 'Verso', 'Mặt sau', 'Sisi belakang', 'Arka yüz', 'Tylna strona')}
                  </Text>
                  <TextInput
                    ref={draftTranslationInputRef}
                    accessibilityLabel={L('Задняя сторона карточки', 'Зворотна сторона картки', 'Cara trasera de la tarjeta', 'Verso do cartão', 'Mặt sau của thẻ', 'Sisi belakang kartu', 'Kartın arka yüzü', 'Tylna strona karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftTranslation}
                    onChangeText={setDraftTranslation}
                    onFocus={bindScrollOnFocus(draftTranslationInputRef)}
                    style={fieldInputStyle(t)}
                  />
                  <Text style={draftLabelStyle(t)}>
                    {L('Подсказка (необязательно)', 'Підказка (необов\'язково)', 'Nota (opcional)', 'Nota (opcional)', 'Ghi chú (không bắt buộc)', 'Catatan (opsional)', 'Not (isteğe bağlı)', 'Notatka (opcjonalnie)')}
                  </Text>
                  <TextInput
                    ref={draftNoteInputRef}
                    accessibilityLabel={L('Описание или заметка к карточке', 'Опис або замітка до картки', 'Descripción o nota de la tarjeta', 'Descrição ou nota do cartão', 'Mô tả hoặc ghi chú thẻ', 'Deskripsi atau catatan kartu', 'Kart açıklaması veya notu', 'Opis lub notatka do karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftNote}
                    onChangeText={setDraftNote}
                    onFocus={bindScrollOnFocus(draftNoteInputRef)}
                    multiline
                    style={[fieldInputStyle(t), { minHeight: 72, textAlignVertical: 'top' }]}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={cancelDraftCard}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        borderWidth: 0,
                        borderColor: t.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: t.textSecond, fontWeight: '700', fontSize: f.body }}>
                        {L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveDraftCard}
                      disabled={!draftValid || rows.length >= 50}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        gap: 8,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: !draftValid || rows.length >= 50 ? t.border : t.accent,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={22} color={t.correctText} />
                      <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                        {isEditingCard
                          ? L('Обновить', 'Оновити', 'Actualizar', 'Atualizar', 'Cập nhật', 'Perbarui', 'Güncelle', 'Zaktualizuj')
                          : L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {rows.map((row, idx) => (
                <UgcPackEditorCardPreview
                  key={row.id + String(idx)}
                  t={t}
                  f={f}
                  lang={lang}
                  index={idx}
                  en={row.en}
                  ru={row.ru}
                  uk={row.uk}
                  es={row.es}
                  sourceLocales={row.sourceLocales}
                  frontGradient={cardChrome.frontGradient}
                  backGradient={cardChrome.backGradient}
                  borderAccent={cardChrome.borderAccent}
                  canRemove={!isEditingCard}
                  onRemove={() => removeRow(idx)}
                  canEdit={!isEditingCard}
                  onEdit={() => editRow(idx)}
                  editing={editingIdx === idx}
                />
              ))}

              {/* Оформление — необязательное, свёрнуто по умолчанию (упрощение экрана 2026-08-13). */}
              <TouchableOpacity
                testID="ugc-pack-decor-toggle"
                accessibilityRole="button"
                accessibilityState={{ expanded: decorOpen }}
                onPress={toggleDecor}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: t.bgCard,
                }}
              >
                <Ionicons name="color-palette-outline" size={18} color={t.accent} />
                <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {L('Оформление', 'Оформлення', 'Aspecto', 'Aparência', 'Giao diện', 'Tampilan', 'Görünüm', 'Wygląd')}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }} numberOfLines={1}>
                  {ugcCardThemeLabel(themeKey, lang)}
                </Text>
                <Animated.View style={{ transform: [{ rotate: decorChevron.rotate }] }}>
                  <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                </Animated.View>
              </TouchableOpacity>

              {decorOpen ? (
                <View>
              <Text style={labelStyle(t)}>{L('Цвет карточек', 'Колір карток', 'Color de las tarjetas', 'Cor dos cartões', 'Màu thẻ', 'Warna kartu', 'Kart rengi', 'Kolor kart')}</Text>
              {/* Живое превью: цвет виден сразу, в любой теме (владелец, 2026-08-13). */}
              <LinearGradient
                colors={[...cardChrome.frontGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 72,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: cardChrome.borderAccent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 8,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                  {title.trim() || L('Ваш набор', 'Ваш набір', 'Tu pack', 'Seu pack', 'Bộ thẻ của bạn', 'Paketmu', 'Paketin', 'Twój pakiet')}
                </Text>
              </LinearGradient>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {UGC_CARD_THEME_IDS.map((id, idx) => {
                  const selected = id === themeKey;
                  return (
                    <TouchableOpacity
                      key={id}
                      testID={`ugc-pack-color-${id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={ugcCardThemeLabel(id, lang)}
                      onPress={() => {
                        Keyboard.dismiss();
                        setThemeIdx(idx);
                      }}
                      activeOpacity={0.85}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? t.accent : t.border,
                        backgroundColor: t.bgCard,
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: ugcCardThemeAccent(id, { isLight: isLightTheme }),
                        }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8 }} numberOfLines={1}>
                {ugcCardThemeLabel(themeKey, lang)}
              </Text>

              <Text style={labelStyle(t)}>{L('Иконка набора', 'Іконка набору', 'Icono del pack', 'Icone do pack', 'Biểu tượng bộ thẻ', 'Ikon paket', 'Paket ikonu', 'Ikona pakietu')}</Text>
              <View style={[styles.cardBackPickerPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <View style={styles.cardBackHeroRow}>
                  <TapScale
                    onPress={() => {
                      Keyboard.dismiss();
                      bumpCardBack(-1);
                    }}
                    style={styles.stepperHit}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-back" size={28} color={t.accent} />
                  </TapScale>

                  <View style={styles.cardBackHero}>
                    {selectedCardBackFan ? (
                      <Image
                        key={`fan-${cardBackKey}`}
                        source={selectedCardBackFan}
                        style={styles.cardBackHeroImage}
                        contentFit="contain"
                      />
                    ) : selectedCardBack ? (
                      <Image
                        key={`single-${cardBackKey}`}
                        source={selectedCardBack}
                        style={styles.cardBackHeroImage}
                        contentFit="contain"
                      />
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      bumpCardBack(1);
                    }}
                    style={styles.stepperHit}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-forward" size={28} color={t.accent} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cardBackPickerTitle, { color: t.textPrimary }]} numberOfLines={1}>
                  {ugcCardBackLabel(cardBackKey, lang)}
                </Text>

                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  directionalLockEnabled
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardBackThumbRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {UGC_CARD_BACK_IDS.map((id, idx) => {
                    const selected = id === cardBackKey;
                    const img = cardBackImage(id);
                    return (
                      <TouchableOpacity
                        key={id}
                        testID={`ugc-pack-back-${id}`}
                        onPress={() => {
                          Keyboard.dismiss();
                          setCardBackIdx(idx);
                        }}
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={ugcCardBackLabel(id, lang)}
                        style={[
                          styles.cardBackThumb,
                          {
                            borderColor: selected ? t.accent : t.border,
                            backgroundColor: selected ? t.bgSurface2 : t.bgSurface,
                          },
                        ]}
                      >
                        {img ? <Image source={img} style={styles.cardBackThumbImage} contentFit="contain" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
                </View>
              ) : null}

              <TouchableOpacity
                testID="ugc-pack-save"
                accessibilityRole="button"
                accessibilityLabel={L('Сохранить набор', 'Зберегти набір', 'Guardar el pack', 'Salvar o pacote', 'Lưu bộ thẻ', 'Simpan paket', 'Paketi kaydet', 'Zapisz zestaw')}
                onPress={() => {
                  Keyboard.dismiss();
                  void onSubmit();
                }}
                disabled={busy}
                activeOpacity={0.85}
                style={{
                  marginTop: 28,
                  paddingHorizontal: 16,
                  backgroundColor: busy ? t.border : t.accent,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body + 1 }}>
                  {L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                </Text>
              </TouchableOpacity>

              {/* Второстепенное действие — внизу экрана, а не в шапке (владелец, 2026-08-13). */}
              {!isEditMode && draftHydrated && localDraftLooksMeaningful ? (
                <TouchableOpacity
                  testID="ugc-pack-clear-draft"
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    onClearLocalDraftPrompt();
                  }}
                  style={{ alignSelf: 'center', marginTop: 20, paddingVertical: 8, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {L('Очистить черновик', 'Очистити чернетку', 'Borrar borrador', 'Apagar rascunho', 'Xóa bản nháp', 'Hapus draf', 'Taslağı temizle', 'Wyczyść szkic')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <ReportErrorButton
                  screen="community_pack_create"
                  dataId="community_pack_editor"
                  dataText={L('Создание набора', 'Створення набору', 'Crear pack', 'Criar pack', 'Tạo bộ thẻ', 'Buat paket', 'Paket oluşturma', 'Tworzenie pakietu')}
                />
              </View>
              </View>
            </ContentWrap>
          </BouncyScrollView>
        </KeyboardAvoidingView>
        <ThemedConfirmModal
          visible={clearDraftModalOpen}
          title={L('Очистить черновик?', 'Очистити чернетку?', '¿Borrar borrador?', 'Apagar rascunho?', 'Xóa bản nháp?', 'Hapus draf?', 'Taslak temizlensin mi?', 'Wyczyścić szkic?')}
          message={L(
            'Локальные данные этого набора будут удалены.',
            'Локальні дані цього набору буде видалено.',
            'Se borrarán los datos locales de este pack.',
            'Os dados locais deste pack serão apagados.',
            'Dữ liệu cục bộ của bộ thẻ này sẽ bị xóa.',
            'Data lokal paket ini akan dihapus.',
            'Bu paketin yerel verileri silinecek.',
            'Lokalne dane tego pakietu zostaną usunięte.',
          )}
          cancelLabel={L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
          confirmLabel={L('Очистить', 'Очистити', 'Borrar', 'Apagar', 'Xóa', 'Hapus', 'Temizle', 'Wyczyść')}
          confirmVariant="default"
          onCancel={() => setClearDraftModalOpen(false)}
          onConfirm={performClearLocalDraft}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}

function labelStyle(t: { textSecond: string }) {
  return {
    color: t.textSecond,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600' as const,
  };
}

function draftLabelStyle(t: { textMuted: string }) {
  return {
    color: t.textMuted,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    marginTop: 12,
    marginBottom: 6,
  };
}

function fieldInputStyle(t: { bgCard: string; textPrimary: string; border: string }) {
  return {
    backgroundColor: t.bgCard,
    borderWidth: 0,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: t.textPrimary,
    fontSize: 16,
  } as const;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  /** Side inset for form body (ContentWrap has no horizontal padding). */
  formHorizontalInset: { paddingHorizontal: 20, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700' },
  /** Блок полей новой карточки — отдельная плашка с внутренними отступами. */
  draftCardPanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 0,
  },
  stepperHit: { padding: 8, minWidth: 48, alignItems: 'center' },
  cardBackPickerPanel: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0,
  },
  cardBackHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardBackHero: {
    flex: 1,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackHeroImage: { width: '100%', height: '100%' },
  cardBackPickerTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardBackThumbRow: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 2,
  },
  cardBackThumb: {
    width: 64,
    height: 86,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardBackThumbImage: { width: 58, height: 80 },
});
