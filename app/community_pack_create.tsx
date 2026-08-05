import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import auth from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {  AppState,
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
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { useTheme } from '../components/ThemeContext';
import { monoIcon } from '../constants/monoIcon';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { getCommunityUgcPackPaywallTheme } from './flashcards/cardPackPaywallTheme';
import { flashcardsCommunityPacksAvailableForTarget } from './flashcards_target_gate';
import {
  COMMUNITY_PACK_CARD_COUNT_MAX,
  COMMUNITY_PACK_CARD_COUNT_MIN,
  COMMUNITY_PACK_PRICE_SHARDS,
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
import {
  UGC_CARD_THEME_DEFAULT_ID,
  UGC_CARD_THEME_IDS,
  ugcCardThemeLabel,
  type UgcCardThemeId,
} from './community_packs/ugcCardThemePresets';
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
import { safeRouterBack } from './navigation_back';
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
  const [resubmitPackModalOpen, setResubmitPackModalOpen] = useState(false);

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
  /** Create mode: false until local draft load/clear finished (avoid overwriting AsyncStorage). */
  const [draftHydrated, setDraftHydrated] = useState(() => isEditMode || !canUse);

  const themeKey: UgcCardThemeId = (UGC_CARD_THEME_IDS[themeIdx] ?? UGC_CARD_THEME_DEFAULT_ID) as UgcCardThemeId;
  const cardBackKey: UgcCardBackId = (UGC_CARD_BACK_IDS[cardBackIdx] ?? UGC_CARD_BACK_DEFAULT_ID) as UgcCardBackId;
  const selectedCardBack = cardBackImage(cardBackKey);
  const selectedCardBackFan = cardBackFanImage(cardBackKey);
  const plannedDraftLocale = plannedCommunitySourceLocale(lang);

  const packVis = useMemo(
    () => getCommunityUgcPackPaywallTheme(themeKey, { themeMode, isLight: isLightTheme }),
    [themeKey, themeMode, isLightTheme],
  );
  const cardChrome = useMemo(() => {
    const c0 = packVis.ctaColors[0];
    const c1 = packVis.ctaColors[1];
    const fa = isLightTheme ? '20' : '3E';
    const ba = isLightTheme ? '18' : '32';
    return {
      borderAccent: packVis.borderAccent,
      frontGradient: [c0 + fa, t.bgCard] as const,
      backGradient: [c1 + ba, t.bgSurface] as const,
    };
  }, [packVis, isLightTheme, t.bgCard, t.bgSurface]);

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
        priceShards: COMMUNITY_PACK_PRICE_SHARDS,
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
          priceShards: COMMUNITY_PACK_PRICE_SHARDS,
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
        priceShards: COMMUNITY_PACK_PRICE_SHARDS,
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
      priceShards: COMMUNITY_PACK_PRICE_SHARDS,
      cards,
      cardThemeKey: themeKey,
      cardBackKey,
    };
    return p;
  }, [title, description, rows, themeKey, cardBackKey, lang, studyTarget]);

  const runSubmit = useCallback(
    async (updatePackId?: string) => {
      if (!canUse || !payload) return;
      const err = validateCommunityPackPayload(payload);
      if (err) {
        emitAppEvent('action_toast', actionToastTri('error', communityPackValidationToast(err, payload.cards.length)));
        return;
      }
      const authorStableId = await getCanonicalUserId();
      if (!authorStableId) {
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Нет стабильного id профиля.',
          uk: 'Немає стабільного id профілю.',
          es: 'No hay un ID de perfil estable.',
          'pt-BR': 'Não há um ID de perfil estável.',
          vi: 'Không có ID hồ sơ ổn định.',
          id: 'Tidak ada ID profil yang stabil.',
          tr: 'Sabit profil kimliği yok.',
          pl: 'Brak stabilnego ID profilu.',
        }));
        return;
      }
      if (!auth().currentUser) {
        try {
          await auth().signInAnonymously();
        } catch {
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Не удалось подтвердить аккаунт. Перезапусти раздел и попробуй снова.',
            uk: 'Не вдалося підтвердити акаунт. Перезапусти розділ і спробуй ще раз.',
            es: 'No se pudo confirmar la cuenta. Reabre la sección e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível confirmar a conta. Reabra a seção e tente novamente.',
            vi: 'Không thể xác nhận tài khoản. Mở lại mục này rồi thử lại.',
            id: 'Tidak dapat mengonfirmasi akun. Buka ulang bagian ini lalu coba lagi.',
            tr: 'Hesap doğrulanamadı. Bölümü yeniden açıp tekrar dene.',
            pl: 'Nie udało się potwierdzić konta. Otwórz sekcję ponownie i spróbuj jeszcze raz.',
          }));
          return;
        }
      }
      setBusy(true);
      try {
        const cloudPayload = buildCommunityPackPayloadForCloud(payload);
        if (!updatePackId) {
          emitAppEvent('action_toast', actionToastTri('info', {
            ru: 'Отправляем набор на проверку...',
            uk: 'Надсилаємо набір на перевірку...',
            es: 'Enviando pack para revisión...',
            'pt-BR': 'Enviando pacote para revisão...',
            vi: 'Đang gửi bộ thẻ để xét duyệt...',
            id: 'Mengirim paket untuk ditinjau...',
            tr: 'Paket incelemeye gönderiliyor...',
            pl: 'Wysyłamy zestaw do sprawdzenia...',
          }));
          safeRouterBack(router, '/flashcards' as any);
        }
        await callCommunitySubmitPackForReview({
          authorStableId,
          payload: cloudPayload,
          ...(updatePackId ? { updatePackId } : {}),
        });
        if (!updatePackId) {
          await clearCommunityPackCreateDraft(studyTarget, lang);
        }
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: updatePackId ? 'Изменения отправлены на проверку.' : 'Набор отправлен на проверку.',
          uk: updatePackId ? 'Зміни надіслано на перевірку.' : 'Набір надіслано на перевірку.',
          es: updatePackId
            ? 'Cambios enviados para revisión.'
            : 'Pack enviado para revisión.',
          'pt-BR': updatePackId ? 'Alterações enviadas para revisão.' : 'Pacote enviado para revisão.',
          vi: updatePackId ? 'Đã gửi thay đổi để xét duyệt.' : 'Đã gửi bộ thẻ để xét duyệt.',
          id: updatePackId ? 'Perubahan dikirim untuk ditinjau.' : 'Paket dikirim untuk ditinjau.',
          tr: updatePackId ? 'Değişiklikler incelemeye gönderildi.' : 'Paket incelemeye gönderildi.',
          pl: updatePackId ? 'Zmiany wysłane do sprawdzenia.' : 'Zestaw wysłany do sprawdzenia.',
        }));
        if (updatePackId) {
          safeRouterBack(router, '/flashcards' as any);
        }
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
        const short = msg.slice(0, 140);
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: short || 'Ошибка отправки.',
          uk: short || 'Помилка відправки.',
          es: short || 'Error al enviar.',
          'pt-BR': short || 'Erro ao enviar.',
          vi: short || 'Lỗi khi gửi.',
          id: short || 'Gagal mengirim.',
          tr: short || 'Gönderme hatası.',
          pl: short || 'Błąd wysyłania.',
        }));
      } finally {
        setBusy(false);
      }
    },
    [canUse, payload, router, studyTarget, lang],
  );

  const onSubmit = useCallback(() => {
    if (!canUse || !payload) return;
    const err = validateCommunityPackPayload(payload);
    if (err) {
      emitAppEvent('action_toast', actionToastTri('error', communityPackValidationToast(err, payload.cards.length)));
      return;
    }
    if (isEditMode) {
      setResubmitPackModalOpen(true);
      return;
    }
    void runSubmit();
  }, [canUse, payload, isEditMode, editPackId, runSubmit, lang]);

  const bumpTheme = useCallback((delta: number) => {
    setThemeIdx((i) => {
      const n = UGC_CARD_THEME_IDS.length;
      return (i + delta + n * 10) % n;
    });
  }, []);

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
              <Text style={{ color: monoIcon(themeMode, '#f87171'), marginTop: 20 }}>{loadErr}</Text>
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
              {false && isEditMode && rows.length === 0 ? (
                <View />
              ) : null}
              {!isEditMode && draftHydrated && localDraftLooksMeaningful ? (
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    onClearLocalDraftPrompt();
                  }}
                  style={{ alignSelf: 'flex-start', marginBottom: 8 }}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '600', textDecorationLine: 'underline' }}>
                    {L('Очистить сохранённый черновик', 'Очистити збережений чернетку', 'Borrar borrador guardado', 'Apagar rascunho salvo', 'Xóa bản nháp đã lưu', 'Hapus draf tersimpan', 'Kayıtlı taslağı temizle', 'Wyczyść zapisany szkic')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text
                style={{
                  color: t.textSecond,
                  fontSize: f.sub,
                  lineHeight: 20,
                  marginTop: 10,
                  marginBottom: 14,
                }}
              >
                {L(
                  'Место для твоего творчества. Если пак пройдёт проверку на адекватность, он попадёт в руки других юзеров. А ты получишь их жемчужины.',
                  'Місце для твоєї творчості. Якщо пак пройде перевірку на адекватність, він потрапить у руки інших юзерів. А ти отримаєш їх жемчужини.',
                  'Aquí puedes crear tu pack. Si supera la moderación, otros usuarios podrán usarlo y tú ganarás perlas.',
                  'Aqui você pode criar seu pack. Se passar pela moderação, outros usuários poderão usá-lo e você ganhará perlas.',
                  'Đây là nơi bạn tạo bộ thẻ của mình. Nếu vượt qua kiểm duyệt, người dùng khác có thể dùng nó và bạn sẽ nhận được xu.',
                  'Di sini kamu bisa membuat paketmu. Jika lolos moderasi, pengguna lain bisa memakainya dan kamu akan mendapatkan fragmen.',
                  'Burada kendi paketini oluşturabilirsin. Moderasyondan geçerse diğer kullanıcılar kullanabilir ve sen jeton kazanırsın.',
                  'Tutaj możesz stworzyć swój pakiet. Jeśli przejdzie moderację, inni użytkownicy będą mogli z niego korzystać, a ty zdobędziesz monety.',
                )}
              </Text>
              <Text
                accessibilityRole="text"
                style={{
                  color: t.textSecond,
                  fontSize: f.caption,
                  lineHeight: 18,
                  marginBottom: 14,
                  fontWeight: '600',
                }}
              >
                {L(
                  'Цена набора для всех: 10 жемчужин. Изменить её нельзя.',
                  'Ціна набору для всіх: 10 перлин. Її не можна змінити.',
                  'Precio fijo para todos: 10 perlas. No se puede cambiar.',
                  'Preço fixo para todos: 10 pérolas. Não pode ser alterado.',
                  'Giá cố định cho mọi người: 10 ngọc trai. Không thể thay đổi.',
                  'Harga tetap untuk semua: 10 mutiara. Tidak dapat diubah.',
                  'Herkes için sabit fiyat: 10 inci. Değiştirilemez.',
                  'Stała cena dla wszystkich: 10 pereł. Nie można jej zmienić.',
                )}
              </Text>
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

              <Text style={labelStyle(t)}>{L('Цвет карточек', 'Колір карток', 'Color de las tarjetas', 'Cor dos cartões', 'Màu thẻ', 'Warna kartu', 'Kart rengi', 'Kolor kart')}</Text>
              <View style={[styles.stepperPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <View style={styles.stepperRow}>
                  <TapScale
                    onPress={() => {
                      Keyboard.dismiss();
                      bumpTheme(-1);
                    }}
                    style={styles.stepperHit}
                  >
                    <Ionicons name="chevron-back" size={28} color={t.accent} />
                  </TapScale>
                  <Text style={[styles.stepperVal, { color: t.textPrimary, fontSize: 15 }]} numberOfLines={1}>
                    {ugcCardThemeLabel(themeKey, lang)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      bumpTheme(1);
                    }}
                    style={styles.stepperHit}
                  >
                    <Ionicons name="chevron-forward" size={28} color={t.accent} />
                  </TouchableOpacity>
                </View>
              </View>

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
                      <Image source={selectedCardBackFan} style={styles.cardBackHeroImage} contentFit="contain" />
                    ) : selectedCardBack ? (
                      <Image source={selectedCardBack} style={styles.cardBackHeroImage} contentFit="contain" />
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
                        onPress={() => {
                          Keyboard.dismiss();
                          setCardBackIdx(idx);
                        }}
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
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
                    {L('АНГЛИЙСКАЯ СТОРОНА', 'АНГЛІЙСЬКА СТОРОНА', 'LADO EN INGLÉS', 'LADO EM INGLÊS', 'MẶT TIẾNG ANH', 'SISI BAHASA INGGRIS', 'İNGİLİZCE TARAF', 'STRONA ANGIELSKA')}
                  </Text>
                  <TextInput
                    ref={draftEnInputRef}
                    accessibilityLabel={L('Английская сторона карточки', 'Англійська сторона картки', 'Cara en inglés de la tarjeta', 'Face em inglês do cartão', 'Mặt tiếng Anh của thẻ', 'Sisi bahasa Inggris kartu', 'Kartın İngilizce tarafı', 'Angielska strona karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftEn}
                    onChangeText={setDraftEn}
                    onFocus={bindScrollOnFocus(draftEnInputRef)}
                    placeholder={L('Введи английский текст…', 'Введи англійський текст…', 'Escribe el texto en inglés…', 'Digite o texto em inglês…', 'Nhập nội dung tiếng Anh…', 'Masukkan teks bahasa Inggris…', 'İngilizce metni gir…', 'Wpisz tekst po angielsku…')}
                    placeholderTextColor={t.textGhost}
                    style={[fieldInputStyle(t), { borderColor: t.accent }]}
                  />
                  <Text style={draftLabelStyle(t)}>{L('ПЕРЕВОД', 'ПЕРЕКЛАД', 'TRADUCCIÓN', 'TRADUÇÃO', 'BẢN DỊCH', 'TERJEMAHAN', 'ÇEVİRİ', 'TŁUMACZENIE')}</Text>
                  <TextInput
                    ref={draftTranslationInputRef}
                    accessibilityLabel={L('Перевод карточки', 'Переклад картки', 'Traducción de la tarjeta', 'Tradução do cartão', 'Bản dịch thẻ', 'Terjemahan kartu', 'Kart çevirisi', 'Tłumaczenie karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftTranslation}
                    onChangeText={setDraftTranslation}
                    onFocus={bindScrollOnFocus(draftTranslationInputRef)}
                    placeholder={L('Введи перевод…', 'Введи переклад…', 'Escribe la traducción…', 'Digite a tradução…', 'Nhập bản dịch…', 'Masukkan terjemahan…', 'Çeviriyi gir…', 'Wpisz tłumaczenie…')}
                    placeholderTextColor={t.textGhost}
                    style={fieldInputStyle(t)}
                  />
                  <Text style={draftLabelStyle(t)}>
                    {L('ОПИСАНИЕ (НЕОБЯЗАТЕЛЬНО)', 'ОПИС (НЕОБОВ\'ЯЗКОВО)', 'DESCRIPCIÓN (OPCIONAL)', 'DESCRIÇÃO (OPCIONAL)', 'MÔ TẢ (KHÔNG BẮT BUỘC)', 'DESKRIPSI (OPSIONAL)', 'AÇIKLAMA (İSTEĞE BAĞLI)', 'OPIS (OPCJONALNIE)')}
                  </Text>
                  <TextInput
                    ref={draftNoteInputRef}
                    accessibilityLabel={L('Описание или заметка к карточке', 'Опис або замітка до картки', 'Descripción o nota de la tarjeta', 'Descrição ou nota do cartão', 'Mô tả hoặc ghi chú thẻ', 'Deskripsi atau catatan kartu', 'Kart açıklaması veya notu', 'Opis lub notatka do karty')}
                    {...getTextInputSystemEditMenuProps()}
                    value={draftNote}
                    onChangeText={setDraftNote}
                    onFocus={bindScrollOnFocus(draftNoteInputRef)}
                    placeholder={L(
                      'Краткая заметка, контекст или подсказка…',
                      'Коротка замітка, контекст або підказка…',
                      'Nota breve, contexto o pista…',
                      'Nota breve, contexto ou dica…',
                      'Ghi chú ngắn, ngữ cảnh hoặc gợi ý…',
                      'Catatan singkat, konteks, atau petunjuk…',
                      'Kısa not, bağlam veya ipucu…',
                      'Krótka notatka, kontekst albo podpowiedź…',
                    )}
                    placeholderTextColor={t.textGhost}
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

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  void onSubmit();
                }}
                disabled={busy || (isEditMode && rows.length === 0)}
                style={{
                  marginTop: 28,
                  paddingHorizontal: 16,
                  backgroundColor: busy || (isEditMode && rows.length === 0) ? t.border : t.accent,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                {false && busy ? (<View />) : (
                  <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                    {isEditMode
                      ? L(
                          'Сохранить и отправить на проверку',
                          'Зберегти й надіслати на перевірку',
                          'Guardar y enviar a revisión',
                          'Salvar e enviar para revisão',
                          'Lưu và gửi để kiểm duyệt',
                          'Simpan dan kirim untuk ditinjau',
                          'Kaydet ve incelemeye gönder',
                          'Zapisz i wyślij do sprawdzenia',
                        )
                      : L('Отправить на проверку', 'Надіслати на перевірку', 'Enviar a revisión', 'Enviar para revisão', 'Gửi để kiểm duyệt', 'Kirim untuk ditinjau', 'İncelemeye gönder', 'Wyślij do sprawdzenia')}
                  </Text>
                )}
              </TouchableOpacity>
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
        <ThemedConfirmModal
          visible={resubmitPackModalOpen}
          title={L('Повторная проверка', 'Повторна перевірка', 'Nueva revisión', 'Nova revisão', 'Kiểm duyệt lại', 'Tinjauan ulang', 'Yeniden inceleme', 'Ponowne sprawdzenie')}
          message={L(
            'Набор исчезнет из продажи, пока не завершится проверка. Продолжить?',
            'Набір зникне з продажу, доки не завершиться перевірка. Продовжити?',
            'El pack dejará de estar a la venta hasta que termine la revisión. ¿Continuar?',
            'O pack sairá da venda até a revisão terminar. Continuar?',
            'Bộ thẻ sẽ tạm ẩn khỏi cửa hàng cho đến khi kiểm duyệt xong. Tiếp tục?',
            'Paket akan hilang dari penjualan sampai tinjauan selesai. Lanjutkan?',
            'İnceleme bitene kadar paket satıştan kalkacak. Devam edilsin mi?',
            'Pakiet zniknie ze sprzedaży do końca sprawdzenia. Kontynuować?',
          )}
          cancelLabel={L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
          confirmLabel={L('Отправить', 'Надіслати', 'Enviar', 'Enviar', 'Gửi', 'Kirim', 'Gönder', 'Wyślij')}
          onCancel={() => setResubmitPackModalOpen(false)}
          onConfirm={() => {
            setResubmitPackModalOpen(false);
            void runSubmit(editPackId);
          }}
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
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
    marginTop: 10,
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
  /** Округлая «плашка» вокруг степпера темы карточек. */
  stepperPanel: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  /** Блок полей новой карточки — отдельная плашка с внутренними отступами. */
  draftCardPanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 0,
  },
  stepperHit: { padding: 8, minWidth: 48, alignItems: 'center' },
  stepperVal: { fontSize: 22, fontWeight: '800', minWidth: 0, textAlign: 'center' },
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
