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
  CardsGlassRoundButton,
  CardsGlassScreen,
  CardsGlassStateBlock,
  CardsGlassSurface,
  useCardsGlass,
} from './flashcards/CardsGlassKit';
import { PackCardRow, PackMenuRow, PackPopoverMenu, PackSwitch } from './community_packs/PackCreateGlassParts';
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
  const params = useLocalSearchParams<{ packId?: string; fresh?: string; stage?: string; packLanguage?: string }>();
  const editPackId = typeof params.packId === 'string' ? params.packId.trim() : '';
  const freshStart = String(params.fresh ?? '') === '1';
  const stageKey = typeof params.stage === 'string' ? params.stage.trim() : '';

  // зачем: Liquid Glass — токены активной темы (cards.html #23–24, #65–74).
  const { t, g } = useCardsGlass();
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
  const [themeIdx, setThemeIdx] = useState(0);
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => normalizePackLanguage(params.packLanguage ?? studyTarget));
  const [publishToCommunity, setPublishToCommunity] = useState(false);
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
          setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'The pack is not available for editing', 'El pack no está disponible para editar', 'O pack não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Pakiet nie jest dostępny do edycji'));
          return;
        }
        setTitle(local.title);
        savedPackIdRef.current = local.id;
        originalStudyTargetRef.current = local.studyTarget ?? studyTarget;
        setDescription(local.description);
        setPackLanguage(normalizePackLanguage(local.packLanguage));
        setPublishToCommunity(local.isPublic !== false);
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
        setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'The pack is not available for editing', 'El pack no está disponible para editar', 'O pack não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Pakiet nie jest dostępny do edycji'));
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
      studyTarget,
      title: title.trim(),
      description: description.trim(),
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
  }, [title, description, rows, themeKey, lang, packLanguage, publishToCommunity, studyTarget]);

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
    submitInFlightRef.current = true;
    void (async () => {
      setBusy(true);
      try {
        const authorStableId = await getCanonicalUserId().catch(() => null);
        const cloudEdit = isEditMode && !isLocalAuthorPackId(editPackId);
        const localId = savedPackIdRef.current ?? (isEditMode ? (cloudEdit ? `local_pack_${editPackId}` : editPackId) : undefined);
        const previous = localId ? (await loadLocalAuthorPacks()).find(pack => pack.id === localId) : undefined;
        if (!payload.publishToCommunity && previous) await withdrawLocalAuthorPack(previous.id);
        // Persist the author's latest version even while the public version is awaiting review.
        const savedId = await saveLocalAuthorPack(payload, {
          packId: localId,
          authorStableId: authorStableId ?? undefined,
          studyTarget: originalStudyTargetRef.current,
          cloudPackId: cloudEdit && !previous ? editPackId : undefined,
          isPremium: hasPremiumAccess,
        });
        savedPackIdRef.current = savedId;
        if (!payload.publishToCommunity && cloudEdit && !previous) await withdrawLocalAuthorPack(savedId);
        if (!isEditMode) await clearCommunityPackCreateDraft(studyTarget, lang, packLanguage);
        const publishResult = payload.publishToCommunity
          ? await publishLocalAuthorPack(savedId, lang, studyTarget)
          : 'submitted';
        if (publishResult === 'daily_limit') {
          // зачем: Q55 — набор сохранён на устройстве, но сервер пускает не больше 3
          // новых публикаций в сутки; говорим об этом прямо, а не «при подключении».
          emitAppEvent('action_toast', actionToastTri('error', PACK_PUBLISH_DAILY_LIMIT_COPY));
          return;
        }
        if (publishResult !== 'submitted') {
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Набор сохранён на устройстве. Публикация не завершена — нажмите «Сохранить» ещё раз при подключении.',
            uk: 'Набір збережено на пристрої. Для публікації натисніть «Зберегти» ще раз після підключення.',
            en: 'Saved on this device. Publication is pending — save again when connected.',
            es: 'Guardado en este dispositivo. Vuelve a guardar con conexión para publicarlo.',
          }));
          return;
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
  const headerTitleStyle = { flex: 1, textAlign: 'center' as const, color: g.text, fontSize: 20, lineHeight: 26, fontWeight: '700' as const };
  const renderHeader = (title: string, right?: React.ReactNode) => (
    <View style={styles.headerRow}>
      <CardsGlassRoundButton g={g} testID="ugc-pack-back" label={backLabel} icon="arrow-back" onPress={goBack} />
      <Text style={headerTitleStyle}>{title}</Text>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
  const newPackTitle = L('Новый набор', 'Новий набір', 'New pack', 'Nuevo pack', 'Novo pack', 'Bộ thẻ mới', 'Paket baru', 'Yeni paket', 'Nowy pakiet');
  const glassInput = { color: g.text, fontSize: 18, lineHeight: 24, paddingHorizontal: 0, paddingVertical: 0, marginTop: 6 } as const;
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
                  ? L('Создание наборов недоступно в этой сборке.', 'Створення наборів недоступне в цьому білді.', 'Creating packs is not available in this build.', 'Crear packs no está disponible en esta versión.', 'A criação de packs não está disponível nesta versão.', 'Tính năng tạo bộ thẻ không khả dụng trong bản dựng này.', 'Pembuatan paket tidak tersedia di build ini.', 'Paket oluşturma bu sürümde kullanılamıyor.', 'Tworzenie pakietów nie jest dostępne w tej wersji.')
                  : L('Community-наборы для French закрыты до отдельной проверки источников.', 'Community-набори для French закриті до окремої перевірки джерел.', 'Community packs for French are closed pending a separate source review.', 'Los packs community para French están bloqueados hasta una revisión de fuentes.', 'Os packs community para French estão bloqueados até uma revisão de fontes.', 'Các gói community cho French đang bị khóa cho đến khi kiểm tra nguồn riêng.', 'Paket community untuk French dikunci sampai pemeriksaan sumber terpisah.', 'French için community paketleri ayrı kaynak kontrolüne kadar kapalı.', 'Pakiety community dla French są zablokowane do osobnej kontroli źródeł.')}
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
              icon="lock-closed"
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

  return (
    <CardsGlassScreen g={g}>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={effectiveOs === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={64}
        >
          {renderHeader(
            isEditMode
              ? L('Редактировать набор', 'Редагувати набір', 'Edit pack', 'Editar pack', 'Editar pack', 'Chỉnh sửa bộ thẻ', 'Edit paket', 'Paketi düzenle', 'Edytuj pakiet')
              : newPackTitle,
            <CardsGlassRoundButton
              g={g}
              testID="ugc-pack-menu"
              label={menuLabel}
              icon="ellipsis-horizontal"
              onPress={() => setPackMenuOpen(true)}
            />,
          )}
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
            contentContainerStyle={{ paddingBottom: 120 + keyboardBottomInset }}
            showsVerticalScrollIndicator={false}
          >
            <ContentWrap>
              <View style={[styles.formHorizontalInset, { paddingTop: 10 }]}>
              <CardsGlassSurface g={g} style={styles.fieldSurface}>
                <Text style={fieldLabel}>{L('Название', 'Назва', 'Title', 'Título', 'Título', 'Tên', 'Judul', 'Başlık', 'Tytuł')} *</Text>
                <TextInput
                  ref={titleInputRef}
                  accessibilityLabel={L('Название набора', 'Назва набору', 'Pack title', 'Título del pack', 'Título do pack', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł pakietu')}
                  {...getTextInputSystemEditMenuProps()}
                  value={title}
                  onChangeText={setTitle}
                  onFocus={bindScrollOnFocus(titleInputRef)}
                  placeholder={L('Название набора', 'Назва набору', 'Pack title', 'Título del pack', 'Título do pack', 'Tên bộ thẻ', 'Judul paket', 'Paket başlığı', 'Tytuł pakietu')}
                  placeholderTextColor={g.mutedText}
                  style={glassInput}
                />
              </CardsGlassSurface>
              <CardsGlassSurface g={g} style={[styles.fieldSurface, { marginTop: 10 }]}>
                <Text style={fieldLabel}>{L('Описание', 'Опис', 'Description', 'Descripción', 'Descrição', 'Mô tả', 'Deskripsi', 'Açıklama', 'Opis')} *</Text>
                <TextInput
                  ref={descriptionInputRef}
                  accessibilityLabel={L('Описание набора', 'Опис набору', 'Pack description', 'Descripción del pack', 'Descrição do pack', 'Mô tả bộ thẻ', 'Deskripsi paket', 'Paket açıklaması', 'Opis pakietu')}
                  {...getTextInputSystemEditMenuProps()}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={bindScrollOnFocus(descriptionInputRef)}
                  placeholder={L('Кратко о наборе', 'Коротко про набір', 'Briefly about the pack', 'Breve descripción del pack', 'Resumo do pack', 'Mô tả ngắn về bộ thẻ', 'Ringkasan paket', 'Paket hakkında kısa bilgi', 'Krótko o pakiecie')}
                  placeholderTextColor={g.mutedText}
                  multiline
                  style={[glassInput, { fontSize: 16, lineHeight: 22, minHeight: 66, textAlignVertical: 'top' }]}
                />
              </CardsGlassSurface>

              <CardsGlassSurface g={g} style={[styles.rowSurface, { marginTop: 10 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                    {L('Язык набора', 'Мова набору', 'Pack language', 'Idioma del pack', 'Idioma do pacote', 'Ngôn ngữ bộ thẻ', 'Bahasa paket', 'Paket dili', 'Język pakietu')}
                  </Text>
                  <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
                    {/* зачем (D127): «Без языка» меняет поведение набора — объясняем, что он без озвучки и виден при любом языке. */}
                    {packLanguage === NO_PACK_LANGUAGE
                      ? L('Без озвучки. Набор виден при любом языке.', 'Без озвучення. Набір видно за будь-якої мови.', 'No audio. The pack shows up for every language.', 'Sin audio. El pack aparece en cualquier idioma.', 'Sem áudio. O pacote aparece em qualquer idioma.', 'Không có âm thanh. Bộ thẻ hiện ở mọi ngôn ngữ.', 'Tanpa audio. Paket muncul di semua bahasa.', 'Seslendirme yok. Paket her dilde görünür.', 'Bez dźwięku. Pakiet widać przy każdym języku.')
                      : L('Карточки будут показаны в выбранном разделе языка.', 'Картки будуть показані у вибраному мовному розділі.', 'Cards will appear in the selected language section.', 'Las tarjetas aparecerán en el idioma elegido.', 'Os cartões aparecerão no idioma escolhido.', 'Thẻ sẽ xuất hiện trong mục ngôn ngữ đã chọn.', 'Kartu akan muncul di bagian bahasa yang dipilih.', 'Kartlar seçilen dil bölümünde görünür.', 'Karty pojawią się w wybranej sekcji językowej.')}
                  </Text>
                </View>
                <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={setPackLanguage} allowNone liquidGlass />
              </CardsGlassSurface>

              <TouchableOpacity
                testID="ugc-pack-public-toggle"
                accessibilityRole="switch"
                accessibilityLabel={L('Опубликовать набор в сообществе', 'Опублікувати набір у спільноті', 'Publish the pack to the community', 'Publicar el pack en la comunidad', 'Publicar o pacote na comunidade', 'Đăng bộ thẻ lên cộng đồng', 'Publikasikan paket ke komunitas', 'Paketi toplulukta yayınla', 'Opublikuj zestaw w społeczności')}
                accessibilityState={{ checked: publishToCommunity, disabled: cloudEditLocked }}
                onPress={() => setPublishToCommunity((value) => !value)}
                activeOpacity={0.85}
                style={{ marginTop: 10 }}
              >
                <CardsGlassSurface g={g} style={styles.rowSurface}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                      {publishToCommunity
                        ? L('Публичный набор', 'Публічний набір', 'Public pack', 'Pack público', 'Pacote público', 'Bộ thẻ công khai', 'Paket publik', 'Herkese açık paket', 'Zestaw publiczny')
                        : L('Только для меня', 'Лише для мене', 'Private on this device', 'Privado en este dispositivo', 'Privado neste dispositivo', 'Riêng tư trên thiết bị này', 'Pribadi di perangkat ini', 'Bu cihazda özel', 'Prywatny na tym urządzeniu')}
                    </Text>
                    <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
                      {publishToCommunity
                        // зачем ветка cloudEdit (аудит 2026-09-17): правка УЖЕ
                        // опубликованного набора публикуется сразу, без очереди на
                        // модерацию (owner-решение 17.09.2026) — старый текст «после
                        // проверки» здесь был бы прямой ложью пользователю.
                        ? (cloudEditLocked
                          ? L('Изменения станут видны всем сразу после сохранения.', 'Зміни стануть видимими всім одразу після збереження.', 'Changes become visible to everyone as soon as you save.', 'Los cambios se verán para todos en cuanto guardes.', 'As mudanças ficam visíveis para todos assim que você salvar.', 'Thay đổi sẽ hiển thị cho mọi người ngay sau khi lưu.', 'Perubahan langsung terlihat oleh semua orang setelah disimpan.', 'Değişiklikler kaydeder kaydetmez herkese görünür olur.', 'Zmiany będą widoczne dla wszystkich zaraz po zapisaniu.')
                          : L('Набор появится в каталоге после проверки.', 'Набір з’явиться в каталозі після перевірки.', 'The pack will appear in the catalog after review.', 'El pack aparecerá en el catálogo tras la revisión.', 'O pacote aparecerá no catálogo após a revisão.', 'Bộ thẻ sẽ xuất hiện trong danh mục sau khi duyệt.', 'Paket akan muncul di katalog setelah ditinjau.', 'Paket incelemeden sonra katalogda görünür.', 'Zestaw pojawi się w katalogu po sprawdzeniu.'))
                        : L('Он сохранится только у тебя.', 'Він збережеться лише у тебе.', 'It will stay on your device.', 'Se quedará en tu dispositivo.', 'Ele ficará no seu dispositivo.', 'Bộ thẻ chỉ lưu trên thiết bị của bạn.', 'Paket hanya tersimpan di perangkatmu.', 'Yalnızca cihazında kalır.', 'Zostanie tylko na Twoim urządzeniu.')}
                    </Text>
                  </View>
                  <PackSwitch g={g} on={publishToCommunity} disabled={cloudEditLocked} />
                </CardsGlassSurface>
              </TouchableOpacity>

              {/* зачем здесь НЕТ цены (владелец 2026-09-21: «убери чтобы никто
                  не смог сделать набор платным»): блок цены с ползунком снят
                  целиком, наборы бесплатны. Отменяет решение 2026-09-17. Сервер
                  по прямому запрету владельца НЕ трогали — механизм начисления
                  автору цел и оживёт, если цену вернут. */}
              <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ color: g.text, fontSize: 18, lineHeight: 24, fontWeight: '700' }}>
                  {L('Карточки', 'Картки', 'Cards', 'Tarjetas', 'Cartões', 'Thẻ', 'Kartu', 'Kartlar', 'Karty')}
                </Text>
                <Text testID="ugc-pack-cards-count" style={{ color: g.mutedText, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>
                  {cardsCountText}
                </Text>
              </View>

              <View style={{ marginTop: 12, gap: 10 }}>
                {rows.map((row, idx) => (
                  <PackCardRow
                    key={row.id + String(idx)}
                    g={g}
                    testID={`ugc-pack-card-${idx}`}
                    front={row.en}
                    back={cardBackText(row)}
                    editing={editingIdx === idx}
                    moreLabel={menuLabel}
                    onPress={() => {
                      if (!isEditingCard) editRow(idx);
                    }}
                    onMore={() => {
                      Keyboard.dismiss();
                      if (!isEditingCard) setRowMenuIdx(idx);
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity
                testID="ugc-pack-add-card"
                accessibilityRole="button"
                onPress={openAddCard}
                disabled={isEditingCard}
                activeOpacity={0.8}
                style={{
                  marginTop: 14,
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 8,
                  opacity: isEditingCard ? 0.45 : 1,
                }}
              >
                <Ionicons name="add" size={20} color={g.text} />
                <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
                  {L('Добавить карточку', 'Додати картку', 'Add card', 'Añadir tarjeta', 'Adicionar cartão', 'Thêm thẻ', 'Tambah kartu', 'Kart ekle', 'Dodaj kartę')}
                </Text>
              </TouchableOpacity>

              {addCardFormOpen ? (
                <View
                  ref={draftPanelRef}
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 24,
                    backgroundColor: g.opaqueSheet,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: g.glassEdge,
                  }}
                >
                  <Text style={{ color: g.text, fontSize: 22, lineHeight: 28, fontWeight: '700', paddingHorizontal: 4 }}>
                    {isEditingCard
                      ? L('Редактирование карточки', 'Редагування картки', 'Editing the card', 'Editar tarjeta', 'Editar cartão', 'Chỉnh sửa thẻ', 'Edit kartu', 'Kartı düzenle', 'Edytuj kartę')
                      : L('Новая карточка', 'Нова картка', 'New card', 'Nueva tarjeta', 'Novo cartão', 'Thẻ mới', 'Kartu baru', 'Yeni kart', 'Nowa karta')}
                  </Text>
                  <CardsGlassSurface g={g} raised focused style={[styles.fieldSurface, { marginTop: 16 }]}>
                    <Text style={fieldLabel}>
                      {L('Передняя сторона', 'Передня сторона', 'Front side', 'Cara delantera', 'Frente', 'Mặt trước', 'Sisi depan', 'Ön yüz', 'Przednia strona')}
                    </Text>
                    <TextInput
                      ref={draftEnInputRef}
                      accessibilityLabel={L('Передняя сторона карточки', 'Передня сторона картки', 'Front side of the card', 'Cara delantera de la tarjeta', 'Frente do cartão', 'Mặt trước của thẻ', 'Sisi depan kartu', 'Kartın ön yüzü', 'Przednia strona karty')}
                      {...getTextInputSystemEditMenuProps()}
                      value={draftEn}
                      onChangeText={setDraftEn}
                      onFocus={bindScrollOnFocus(draftEnInputRef)}
                      placeholderTextColor={g.mutedText}
                      style={glassInput}
                    />
                  </CardsGlassSurface>
                  <CardsGlassSurface g={g} raised style={[styles.fieldSurface, { marginTop: 10 }]}>
                    <Text style={fieldLabel}>
                      {L('Задняя сторона', 'Зворотна сторона', 'Back side', 'Cara trasera', 'Verso', 'Mặt sau', 'Sisi belakang', 'Arka yüz', 'Tylna strona')}
                    </Text>
                    <TextInput
                      ref={draftTranslationInputRef}
                      accessibilityLabel={L('Задняя сторона карточки', 'Зворотна сторона картки', 'Back side of the card', 'Cara trasera de la tarjeta', 'Verso do cartão', 'Mặt sau của thẻ', 'Sisi belakang kartu', 'Kartın arka yüzü', 'Tylna strona karty')}
                      {...getTextInputSystemEditMenuProps()}
                      value={draftTranslation}
                      onChangeText={setDraftTranslation}
                      onFocus={bindScrollOnFocus(draftTranslationInputRef)}
                      placeholderTextColor={g.mutedText}
                      style={glassInput}
                    />
                  </CardsGlassSurface>
                  <CardsGlassSurface g={g} raised style={[styles.fieldSurface, { marginTop: 10 }]}>
                    <Text style={fieldLabel}>
                      {L('Подсказка (необязательно)', 'Підказка (необов\'язково)', 'Hint (optional)', 'Nota (opcional)', 'Nota (opcional)', 'Ghi chú (không bắt buộc)', 'Catatan (opsional)', 'Not (isteğe bağlı)', 'Notatka (opcjonalnie)')}
                    </Text>
                    <TextInput
                      ref={draftNoteInputRef}
                      accessibilityLabel={L('Описание или заметка к карточке', 'Опис або замітка до картки', 'Description or note for the card', 'Descripción o nota de la tarjeta', 'Descrição ou nota do cartão', 'Mô tả hoặc ghi chú thẻ', 'Deskripsi atau catatan kartu', 'Kart açıklaması veya notu', 'Opis lub notatka do karty')}
                      {...getTextInputSystemEditMenuProps()}
                      value={draftNote}
                      onChangeText={setDraftNote}
                      onFocus={bindScrollOnFocus(draftNoteInputRef)}
                      placeholderTextColor={g.mutedText}
                      multiline
                      style={[glassInput, { fontSize: 16, lineHeight: 22, minHeight: 44, textAlignVertical: 'top' }]}
                    />
                  </CardsGlassSurface>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                    <CardsGlassPrimaryButton g={g} variant="ghost" label={cancelLabel} onPress={cancelDraftCard} style={{ flex: 1 }} />
                    <CardsGlassPrimaryButton
                      g={g}
                      label={isEditingCard
                        ? L('Обновить', 'Оновити', 'Update', 'Actualizar', 'Atualizar', 'Cập nhật', 'Perbarui', 'Güncelle', 'Zaktualizuj')
                        : L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                      onPress={saveDraftCard}
                      disabled={!draftValid || cardLimitReached}
                      style={{ flex: 1.4 }}
                    />
                  </View>
                </View>
              ) : null}

              {/* Все пользовательские наборы используют единое оформление; старый
                  picker цветов/рубашек удалён из активного UI (PM-065). */}
              </View>
            </ContentWrap>
          </BouncyScrollView>

          {/* Сохранить набор — закреплена внизу (макет #23). Кнопка активна и при
              <10 карточек: тап показывает тост «Минимум 10 карточек» (макет #69);
              проверки — прежние, в onSubmit. */}
          <CardsGlassBottomBar g={g} bottomInset={keyboardBottomInset > 0 ? 0 : insets.bottom}>
            <CardsGlassPrimaryButton
              g={g}
              testID="ugc-pack-save"
              label={L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
              disabled={busy}
              onPress={() => {
                Keyboard.dismiss();
                void onSubmit();
              }}
            />
          </CardsGlassBottomBar>
        </KeyboardAvoidingView>

        {/* Меню шапки (макет #67): очистка черновика и сообщение об ошибке. */}
        <PackPopoverMenu g={g} visible={packMenuOpen} onClose={() => setPackMenuOpen(false)} top={68} closeLabel={cancelLabel}>
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
              dataText={L('Создание набора', 'Створення набору', 'Creating a pack', 'Crear pack', 'Criar pack', 'Tạo bộ thẻ', 'Buat paket', 'Paket oluşturma', 'Tworzenie pakietu')}
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
              <Text style={{ color: g.text, fontSize: 18, lineHeight: 24, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 8 }}>
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
                  if (idx != null) removeRow(idx);
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
            'Os dados locais deste pack serão apagados.',
            'Dữ liệu cục bộ của bộ thẻ này sẽ bị xóa.',
            'Data lokal paket ini akan dihapus.',
            'Bu paketin yerel verileri silinecek.',
            'Lokalne dane tego pakietu zostaną usunięte.',
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

const styles = StyleSheet.create({
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
