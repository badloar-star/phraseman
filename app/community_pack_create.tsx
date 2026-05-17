import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
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
import { triLang } from '../constants/i18n';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { getCommunityUgcPackPaywallTheme } from './flashcards/cardPackPaywallTheme';
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
import { getCanonicalUserId } from './user_id_policy';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { getTextInputSystemEditMenuProps } from './textInputSystemMenuProps';

type Row = { id: string; en: string; ru: string; uk: string; es?: string };

function communityPackValidationToast(
  err: string,
  cardsLen: number,
): { messageRu: string; messageUk: string; messageEs: string } {
  switch (err) {
    case 'card_count':
      if (cardsLen < COMMUNITY_PACK_CARD_COUNT_MIN) {
        return {
          messageRu: `Минимум ${COMMUNITY_PACK_CARD_COUNT_MIN} карточек.`,
          messageUk: `Мінімум ${COMMUNITY_PACK_CARD_COUNT_MIN} карток.`,
          messageEs: `Al menos ${COMMUNITY_PACK_CARD_COUNT_MIN} tarjetas.`,
        };
      }
      return {
        messageRu: `Не более ${COMMUNITY_PACK_CARD_COUNT_MAX} карточек.`,
        messageUk: `Не більше ${COMMUNITY_PACK_CARD_COUNT_MAX} карток.`,
        messageEs: `Como máximo, ${COMMUNITY_PACK_CARD_COUNT_MAX} tarjetas.`,
      };
    case 'title_or_desc':
      return {
        messageRu: 'Укажите название и описание набора.',
        messageUk: 'Вкажіть назву й опис набору.',
        messageEs: 'Indica el título y la descripción del pack.',
      };
    case 'price':
      return {
        messageRu: 'Что-то пошло не так с отправкой набора — попробуйте ещё раз.',
        messageUk: 'Щось пішло не так з надсиланням набору — спробуйте ще раз.',
        messageEs: 'Algo salió mal al enviar el pack — inténtalo otra vez.',
      };
    case 'card_fields':
      return {
        messageRu: 'У каждой карточки должны быть EN и перевод.',
        messageUk: 'У кожної картки мають бути EN і переклад.',
        messageEs: 'Cada tarjeta debe tener EN y traducción.',
      };
    default:
      return {
        messageRu: 'Проверьте название, описание, цену и все карточки.',
        messageUk: 'Перевірте назву, опис, ціну та всі картки.',
        messageEs: 'Revisa el título, la descripción, el precio y todas las tarjetas.',
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
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [addCardFormOpen, setAddCardFormOpen] = useState(false);
  const [draftEn, setDraftEn] = useState('');
  const [draftRu, setDraftRu] = useState('');
  const [draftEs, setDraftEs] = useState('');
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
  const draftNoteInputRef = useRef<TextInput>(null);
  const draftPanelRef = useRef<View>(null);

  const canUse = CLOUD_SYNC_ENABLED && !IS_EXPO_GO && isCommunityPacksCloudEnabled();
  const isEditMode = !!editPackId;
  /** Create mode: false until local draft load/clear finished (avoid overwriting AsyncStorage). */
  const [draftHydrated, setDraftHydrated] = useState(() => isEditMode || !canUse);

  const themeKey: UgcCardThemeId = (UGC_CARD_THEME_IDS[themeIdx] ?? UGC_CARD_THEME_DEFAULT_ID) as UgcCardThemeId;

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
      const snap = await fetchCommunityPackForAuthorEdit(editPackId, sid);
      if (cancelled) return;
      if (!snap) {
        setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'El pack no está disponible para editar', 'O pack não está disponível para edição', 'Bộ thẻ không khả dụng để chỉnh sửa', 'Paket tidak tersedia untuk diedit', 'Paket düzenleme için kullanılamıyor', 'Pakiet nie jest dostępny do edycji'));
        return;
      }
      setTitle(snap.title);
      setDescription(snap.description);
      const ti = UGC_CARD_THEME_IDS.indexOf(snap.cardThemeKey as UgcCardThemeId);
      setThemeIdx(ti >= 0 ? ti : 0);
      setRows(
        snap.cards.map((c) => ({
          id: c.id,
          en: c.en,
          ru: c.ru,
          uk: c.uk,
          es: c.es,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse, isEditMode, editPackId, lang]);

  useEffect(() => {
    if (!canUse || isEditMode) {
      setDraftHydrated(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (freshStart) {
        await clearCommunityPackCreateDraft();
        if (!cancelled) setDraftHydrated(true);
        return;
      }
      const d = await loadCommunityPackCreateDraft();
      if (cancelled) return;
      if (d) {
        setTitle(d.title);
        setDescription(d.description);
        setThemeIdx(d.themeIdx);
        setRows(d.rows.map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })));
        setAddCardFormOpen(d.addCardFormOpen);
        setDraftEn(d.draftEn);
        setDraftRu(d.draftRu);
        setDraftEs(d.draftEs);
        setDraftNote(d.draftNote);
      }
      setDraftHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse, isEditMode, freshStart]);

  useEffect(() => {
    if (!draftHydrated || isEditMode || !canUse) return;
    if (editingIdx != null) return;
    const tmr = setTimeout(() => {
      void saveCommunityPackCreateDraft({
        title,
        description,
        priceShards: COMMUNITY_PACK_PRICE_SHARDS,
        themeIdx,
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftEs,
        draftNote,
      });
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
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftEs,
    draftNote,
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
          rows,
          addCardFormOpen,
          draftEn,
          draftRu,
          draftEs,
          draftNote,
        });
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
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftEs,
    draftNote,
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
      setDraftNote(row.uk);
      setAddCardFormOpen(true);
      setEditingIdx(idx);
    },
    [rows],
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

  const draftTranslation = lang === 'es' ? draftEs : draftRu;
  const setDraftTranslation = lang === 'es' ? setDraftEs : setDraftRu;
  const draftTranslationInputRef = lang === 'es' ? draftEsInputRef : draftRuInputRef;
  const draftValid = draftEn.trim().length > 0 && draftTranslation.trim().length > 0;
  const isEditingCard = editingIdx != null;

  const saveDraftCard = useCallback(() => {
    Keyboard.dismiss();
    const en = draftEn.trim();
    const translation = draftTranslation.trim();
    if (!en || !translation) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Заполните английский текст и перевод.',
        messageUk: 'Заповніть англійський текст і переклад.',
        messageEs: 'Completa el texto en inglés y la traducción.',
      });
      return;
    }
    const ru = lang === 'es' ? draftRu.trim() : translation;
    const es = lang === 'es' ? translation : draftEs.trim();
    const note = draftNote.trim();
    if (editingIdx != null) {
      setRows((r) =>
        r.map((row, i) =>
          i === editingIdx ? { ...row, en, ru, es: es || undefined, uk: note } : row,
        ),
      );
    } else {
      setRows((r) => {
        if (r.length >= 50) return r;
        const next = [...r, { id: `c${r.length + 1}`, en, ru, es: es || undefined, uk: note }];
        return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
      });
    }
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftNote('');
    setAddCardFormOpen(false);
    setEditingIdx(null);
  }, [draftEn, draftRu, draftEs, draftTranslation, draftNote, editingIdx, lang]);

  const cancelDraftCard = useCallback(() => {
    Keyboard.dismiss();
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
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
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftEs,
        draftNote,
      }),
    [title, description, themeIdx, rows, addCardFormOpen, draftEn, draftRu, draftEs, draftNote],
  );

  const performClearLocalDraft = useCallback(() => {
    setClearDraftModalOpen(false);
    void clearCommunityPackCreateDraft();
    setTitle('');
    setDescription('');
    setThemeIdx(0);
    setRows([]);
    setAddCardFormOpen(false);
    setDraftEn('');
    setDraftRu('');
    setDraftEs('');
    setDraftNote('');
  }, []);

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
    }));
    const p: CommunityPackSubmissionPayload = {
      title: title.trim(),
      description: description.trim(),
      sourceLang: lang,
      priceShards: COMMUNITY_PACK_PRICE_SHARDS,
      cards,
      cardThemeKey: themeKey,
    };
    return p;
  }, [title, description, rows, themeKey, lang]);

  const runSubmit = useCallback(
    async (updatePackId?: string) => {
      if (!canUse || !payload) return;
      const err = validateCommunityPackPayload(payload);
      if (err) {
        emitAppEvent('action_toast', { type: 'error', ...communityPackValidationToast(err, payload.cards.length) });
        return;
      }
      const authorStableId = await getCanonicalUserId();
      if (!authorStableId) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Нет стабильного id профиля.',
          messageUk: 'Немає стабільного id профілю.',
          messageEs: 'No hay un ID de perfil estable.',
        });
        return;
      }
      if (!auth().currentUser) {
        try {
          await auth().signInAnonymously();
        } catch {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Войдите в приложение (облако).',
            messageUk: 'Увійдіть у застосунок (хмара).',
            messageEs: 'Inicia sesión en la app (nube).',
          });
          return;
        }
      }
      setBusy(true);
      try {
        const cloudPayload = buildCommunityPackPayloadForCloud(payload);
        await callCommunitySubmitPackForReview({
          authorStableId,
          payload: cloudPayload,
          ...(updatePackId ? { updatePackId } : {}),
        });
        if (!updatePackId) {
          await clearCommunityPackCreateDraft();
        }
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: updatePackId ? 'Изменения отправлены на проверку.' : 'Набор отправлен на проверку.',
          messageUk: updatePackId ? 'Зміни надіслано на перевірку.' : 'Набір надіслано на перевірку.',
          messageEs: updatePackId
            ? 'Cambios enviados para revisión.'
            : 'Pack enviado para revisión.',
        });
        router.back();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: msg.slice(0, 140) || 'Ошибка отправки.',
          messageUk: msg.slice(0, 140) || 'Помилка відправки.',
          messageEs: msg.slice(0, 140) || 'Error al enviar.',
        });
      } finally {
        setBusy(false);
      }
    },
    [canUse, payload, router, lang],
  );

  const onSubmit = useCallback(() => {
    if (!canUse || !payload) return;
    const err = validateCommunityPackPayload(payload);
    if (err) {
      emitAppEvent('action_toast', { type: 'error', ...communityPackValidationToast(err, payload.cards.length) });
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

  if (!canUse) {
    return (
      <ScreenGradient>
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                router.back();
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
          <ContentWrap>
            <View style={styles.formHorizontalInset}>
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 24 }}>
                {L('Создание наборов с облаком недоступно в этой сборке.', 'Створення наборів з хмарою недоступне в цьому білді.', 'Crear packs con la nube no está disponible en esta versión.', 'A criação de packs com nuvem não está disponível nesta versão.', 'Tính năng tạo bộ thẻ bằng đám mây không khả dụng trong bản dựng này.', 'Pembuatan paket dengan cloud tidak tersedia di build ini.', 'Bulutla paket oluşturma bu sürümde kullanılamıyor.', 'Tworzenie pakietów z chmurą nie jest dostępne w tej wersji.')}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (isEditMode && loadErr) {
    return (
      <ScreenGradient>
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
          <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                router.back();
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
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

  return (
    <ScreenGradient>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={effectiveOs === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={64}
        >
          <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                router.back();
              }}
              hitSlop={12}
              style={{ width: 40 }}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
              {isEditMode
                ? L('Редактировать набор', 'Редагувати набір', 'Editar pack', 'Editar pack', 'Chỉnh sửa bộ thẻ', 'Edit paket', 'Paketi düzenle', 'Edytuj pakiet')
                : L('Новый набор', 'Новий набір', 'Nuevo pack', 'Novo pack', 'Bộ thẻ mới', 'Paket baru', 'Yeni paket', 'Nowy pakiet')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
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
                  'Место для твоего творчества. Если пак пройдёт проверку на адекватность, он попадёт в руки других юзеров. А ты получишь их осколки.',
                  'Місце для твоєї творчості. Якщо пак пройде перевірку на адекватність, він потрапить у руки інших юзерів. А ти отримаєш їх осколки.',
                  'Aquí puedes crear tu pack. Si supera la moderación, otros usuarios podrán usarlo y tú ganarás fragmentos.',
                  'Aqui você pode criar seu pack. Se passar pela moderação, outros usuários poderão usá-lo e você ganhará fragmentos.',
                  'Đây là nơi bạn tạo bộ thẻ của mình. Nếu vượt qua kiểm duyệt, người dùng khác có thể dùng nó và bạn sẽ nhận được mảnh.',
                  'Di sini kamu bisa membuat paketmu. Jika lolos moderasi, pengguna lain bisa memakainya dan kamu akan mendapatkan fragmen.',
                  'Burada kendi paketini oluşturabilirsin. Moderasyondan geçerse diğer kullanıcılar kullanabilir ve sen parça kazanırsın.',
                  'Tutaj możesz stworzyć swój pakiet. Jeśli przejdzie moderację, inni użytkownicy będą mogli z niego korzystać, a ty zdobędziesz odłamki.',
                )}
              </Text>
              <Text style={labelStyle(t)}>{L('Название', 'Назва', 'Título', 'Título', 'Tên', 'Judul', 'Başlık', 'Tytuł')} *</Text>
              <TextInput
                ref={titleInputRef}
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
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      bumpTheme(-1);
                    }}
                    style={styles.stepperHit}
                  >
                    <Ionicons name="chevron-back" size={28} color={t.accent} />
                  </TouchableOpacity>
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
                  borderWidth: 1,
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
                        borderWidth: 1,
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
          </ScrollView>
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
  },
  stepperHit: { padding: 8, minWidth: 48, alignItems: 'center' },
  stepperVal: { fontSize: 22, fontWeight: '800', minWidth: 0, textAlign: 'center' },
});
