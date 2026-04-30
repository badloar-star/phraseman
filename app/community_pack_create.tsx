import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { getCommunityUgcPackPaywallTheme } from './flashcards/cardPackPaywallTheme';
import {
  COMMUNITY_PACK_CARD_COUNT_MAX,
  COMMUNITY_PACK_CARD_COUNT_MIN,
  COMMUNITY_PACK_PRICE_SHARDS_MAX,
  COMMUNITY_PACK_PRICE_SHARDS_MIN,
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
import { useAudio } from '../hooks/use-audio';
import { oskolokImageForPackShards } from './oskolok';
import { getCanonicalUserId } from './user_id_policy';
import { textInputSystemEditMenuProps } from './textInputSystemMenuProps';

type Row = { id: string; en: string; ru: string; uk: string };

const PRICE_STEP = 10;

function clampPrice(n: number): number {
  const x = Math.round(n / PRICE_STEP) * PRICE_STEP;
  return Math.min(COMMUNITY_PACK_PRICE_SHARDS_MAX, Math.max(COMMUNITY_PACK_PRICE_SHARDS_MIN, x));
}

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
        messageRu: 'Проверьте цену в допустимом диапазоне.',
        messageUk: 'Перевірте ціну в допустимому діапазоні.',
        messageEs: 'Revisa que el precio esté en el rango permitido.',
      };
    case 'card_fields':
      return {
        messageRu: 'У каждой карточки должны быть EN и RU.',
        messageUk: 'У кожної картки мають бути EN та RU.',
        messageEs: 'Cada tarjeta debe tener EN y RU.',
      };
    default:
      return {
        messageRu: 'Проверьте название, описание, цену и все карточки (EN/RU).',
        messageUk: 'Перевірте назву, опис, ціну та всі картки (EN/RU).',
        messageEs: 'Revisa el título, la descripción, el precio y todas las tarjetas (EN/RU).',
      };
  }
}

export default function CommunityPackCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ packId?: string; fresh?: string }>();
  const editPackId = typeof params.packId === 'string' ? params.packId.trim() : '';
  const freshStart = String(params.fresh ?? '') === '1';

  const { theme: t, f, themeMode, isDark } = useTheme();
  const { lang } = useLang();
  const { speak: speakAudio } = useAudio();
  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });
  const isLightTheme = !isDark;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceShards, setPriceShards] = useState(COMMUNITY_PACK_PRICE_SHARDS_MIN);
  const [themeIdx, setThemeIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [addCardFormOpen, setAddCardFormOpen] = useState(false);
  const [draftEn, setDraftEn] = useState('');
  const [draftRu, setDraftRu] = useState('');
  const [draftNote, setDraftNote] = useState('');
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
  const draftNoteInputRef = useRef<TextInput>(null);

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
      if (Platform.OS === 'android') {
        requestAnimationFrame(() => scrollFocusedInputIntoView(inputRef));
        setTimeout(() => scrollFocusedInputIntoView(inputRef), 120);
        setTimeout(() => scrollFocusedInputIntoView(inputRef), 320);
      }
    },
    [scrollFocusedInputIntoView],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
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
  }, [scrollFocusedInputIntoView]);

  useEffect(() => {
    if (!canUse) return;
    if (!isEditMode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const sid = await getCanonicalUserId();
      if (!sid) {
        setLoadErr(L('Нет id', 'Немає id', 'Sin ID'));
        return;
      }
      const snap = await fetchCommunityPackForAuthorEdit(editPackId, sid);
      if (cancelled) return;
      if (!snap) {
        setLoadErr(L('Набор недоступен для редактирования', 'Набір недоступний для редагування', 'El pack no está disponible para editar'));
        return;
      }
      setTitle(snap.title);
      setDescription(snap.description);
      setPriceShards(clampPrice(snap.priceShards));
      const ti = UGC_CARD_THEME_IDS.indexOf(snap.cardThemeKey as UgcCardThemeId);
      setThemeIdx(ti >= 0 ? ti : 0);
      setRows(
        snap.cards.map((c) => ({
          id: c.id,
          en: c.en,
          ru: c.ru,
          uk: c.uk,
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
        setPriceShards(clampPrice(d.priceShards));
        setThemeIdx(d.themeIdx);
        setRows(d.rows.map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })));
        setAddCardFormOpen(d.addCardFormOpen);
        setDraftEn(d.draftEn);
        setDraftRu(d.draftRu);
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
    const tmr = setTimeout(() => {
      void saveCommunityPackCreateDraft({
        title,
        description,
        priceShards,
        themeIdx,
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftNote,
      });
    }, 420);
    return () => clearTimeout(tmr);
  }, [
    draftHydrated,
    isEditMode,
    canUse,
    title,
    description,
    priceShards,
    themeIdx,
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftNote,
  ]);

  useEffect(() => {
    if (!draftHydrated || isEditMode || !canUse) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') {
        void saveCommunityPackCreateDraft({
          title,
          description,
          priceShards,
          themeIdx,
          rows,
          addCardFormOpen,
          draftEn,
          draftRu,
          draftNote,
        });
      }
    });
    return () => sub.remove();
  }, [
    draftHydrated,
    isEditMode,
    canUse,
    title,
    description,
    priceShards,
    themeIdx,
    rows,
    addCardFormOpen,
    draftEn,
    draftRu,
    draftNote,
  ]);

  const removeRow = useCallback((idx: number) => {
    setRows((r) => {
      if (r.length <= 0) return r;
      const next = r.filter((_, i) => i !== idx);
      return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
    });
  }, []);

  const draftValid = draftEn.trim().length > 0 && draftRu.trim().length > 0;

  const saveDraftCard = useCallback(() => {
    Keyboard.dismiss();
    const en = draftEn.trim();
    const ru = draftRu.trim();
    if (!en || !ru) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Заполните английский текст и перевод.',
        messageUk: 'Заповніть англійський текст і переклад.',
        messageEs: 'Completa el texto en inglés y la traducción.',
      });
      return;
    }
    setRows((r) => {
      if (r.length >= 50) return r;
      const note = draftNote.trim();
      const next = [...r, { id: `c${r.length + 1}`, en, ru, uk: note }];
      return next.map((row, i) => ({ ...row, id: `c${i + 1}` }));
    });
    setDraftEn('');
    setDraftRu('');
    setDraftNote('');
    setAddCardFormOpen(false);
  }, [draftEn, draftRu, draftNote]);

  const cancelDraftCard = useCallback(() => {
    Keyboard.dismiss();
    setDraftEn('');
    setDraftRu('');
    setDraftNote('');
    setAddCardFormOpen(false);
  }, []);

  const localDraftLooksMeaningful = useMemo(
    () =>
      communityPackCreateDraftIsMeaningful({
        v: 1,
        title,
        description,
        priceShards,
        themeIdx,
        rows,
        addCardFormOpen,
        draftEn,
        draftRu,
        draftNote,
      }),
    [title, description, priceShards, themeIdx, rows, addCardFormOpen, draftEn, draftRu, draftNote],
  );

  const performClearLocalDraft = useCallback(() => {
    setClearDraftModalOpen(false);
    void clearCommunityPackCreateDraft();
    setTitle('');
    setDescription('');
    setPriceShards(COMMUNITY_PACK_PRICE_SHARDS_MIN);
    setThemeIdx(0);
    setRows([]);
    setAddCardFormOpen(false);
    setDraftEn('');
    setDraftRu('');
    setDraftNote('');
  }, []);

  const onClearLocalDraftPrompt = useCallback(() => {
    setClearDraftModalOpen(true);
  }, []);

  const payload = useMemo((): CommunityPackSubmissionPayload | null => {
    const cards = rows.map((row) => ({
      id: row.id,
      en: row.en.trim(),
      ru: row.ru.trim(),
      uk: row.uk.trim() || undefined,
    }));
    const p: CommunityPackSubmissionPayload = {
      title: title.trim(),
      description: description.trim(),
      priceShards,
      cards,
      cardThemeKey: themeKey,
    };
    return p;
  }, [title, description, priceShards, rows, themeKey]);

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
                {L('Создание наборов с облаком недоступно в этой сборке.', 'Створення наборів з хмарою недоступне в цьому білді.', 'Crear packs con la nube no está disponible en esta versión.')}
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
              {L('Редактирование', 'Редагування', 'Edición')}
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

  const priceHint = L('Цена', 'Ціна', 'Precio');

  return (
    <ScreenGradient>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                ? L('Редактировать набор', 'Редагувати набір', 'Editar pack')
                : L('Новый набор', 'Новий набір', 'Nuevo pack')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 32 + keyboardBottomInset }}
            showsVerticalScrollIndicator={false}
          >
            <ContentWrap>
              <View style={styles.formHorizontalInset}>
              {isEditMode && rows.length === 0 ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={t.accent} />
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
                    {L('Очистить сохранённый черновик', 'Очистити збережений чернетку', 'Borrar borrador guardado')}
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
                )}
              </Text>
              <Text style={labelStyle(t)}>{L('Название', 'Назва', 'Título')} *</Text>
              <TextInput
                ref={titleInputRef}
                {...textInputSystemEditMenuProps}
                value={title}
                onChangeText={setTitle}
                onFocus={bindScrollOnFocus(titleInputRef)}
                placeholder={L('Название набора', 'Назва набору', 'Título del pack')}
                placeholderTextColor={t.textGhost}
                style={fieldInputStyle(t)}
              />
              <Text style={labelStyle(t)}>{L('Описание', 'Опис', 'Descripción')} *</Text>
              <TextInput
                ref={descriptionInputRef}
                {...textInputSystemEditMenuProps}
                value={description}
                onChangeText={setDescription}
                onFocus={bindScrollOnFocus(descriptionInputRef)}
                placeholder={L('Кратко о наборе', 'Коротко про набір', 'Breve descripción del pack')}
                placeholderTextColor={t.textGhost}
                multiline
                style={[fieldInputStyle(t), { minHeight: 88, textAlignVertical: 'top' }]}
              />

              <Text style={labelStyle(t)}>{priceHint}</Text>
              <View style={[styles.stepperPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setPriceShards((p) => clampPrice(p - PRICE_STEP));
                    }}
                    disabled={priceShards <= COMMUNITY_PACK_PRICE_SHARDS_MIN}
                    style={styles.stepperHit}
                  >
                    <Ionicons name="chevron-back" size={28} color={priceShards <= COMMUNITY_PACK_PRICE_SHARDS_MIN ? t.textGhost : t.accent} />
                  </TouchableOpacity>
                  <View style={styles.priceStepperValueRow}>
                    <Image
                      source={oskolokImageForPackShards(priceShards)}
                      style={styles.priceShardIcon}
                      contentFit="contain"
                    />
                    <Text style={[styles.stepperVal, { color: t.textPrimary }]}>{priceShards}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setPriceShards((p) => clampPrice(p + PRICE_STEP));
                    }}
                    disabled={priceShards >= COMMUNITY_PACK_PRICE_SHARDS_MAX}
                    style={styles.stepperHit}
                  >
                    <Ionicons name="chevron-forward" size={28} color={priceShards >= COMMUNITY_PACK_PRICE_SHARDS_MAX ? t.textGhost : t.accent} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={labelStyle(t)}>{L('Цвет карточек', 'Колір карток', 'Color de las tarjetas')}</Text>
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
                disabled={rows.length >= 50}
                style={{
                  marginTop: 20,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: t.accent,
                  alignItems: 'center',
                  opacity: rows.length >= 50 ? 0.45 : 1,
                }}
              >
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: f.body }}>
                  {L('+ Добавить карточку', '+ Додати картку', '+ Añadir tarjeta')}
                </Text>
              </TouchableOpacity>

              {addCardFormOpen ? (
                <View style={[styles.draftCardPanel, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                  <Text style={[draftLabelStyle(t), { marginTop: 0 }]}>
                    {L('АНГЛИЙСКАЯ СТОРОНА', 'АНГЛІЙСЬКА СТОРОНА', 'LADO EN INGLÉS')}
                  </Text>
                  <TextInput
                    ref={draftEnInputRef}
                    {...textInputSystemEditMenuProps}
                    value={draftEn}
                    onChangeText={setDraftEn}
                    onFocus={bindScrollOnFocus(draftEnInputRef)}
                    placeholder={L('Введи английский текст…', 'Введи англійський текст…', 'Escribe el texto en inglés…')}
                    placeholderTextColor={t.textGhost}
                    style={[fieldInputStyle(t), { borderColor: t.accent }]}
                  />
                  <Text style={draftLabelStyle(t)}>{L('ПЕРЕВОД', 'ПЕРЕКЛАД', 'TRADUCCIÓN')}</Text>
                  <TextInput
                    ref={draftRuInputRef}
                    {...textInputSystemEditMenuProps}
                    value={draftRu}
                    onChangeText={setDraftRu}
                    onFocus={bindScrollOnFocus(draftRuInputRef)}
                    placeholder={L('Введи перевод…', 'Введи переклад…', 'Escribe la traducción…')}
                    placeholderTextColor={t.textGhost}
                    style={fieldInputStyle(t)}
                  />
                  <Text style={draftLabelStyle(t)}>
                    {L('ОПИСАНИЕ (НЕОБЯЗАТЕЛЬНО)', 'ОПИС (НЕОБОВ’ЯЗКОВО)', 'DESCRIPCIÓN (OPCIONAL)')}
                  </Text>
                  <TextInput
                    ref={draftNoteInputRef}
                    {...textInputSystemEditMenuProps}
                    value={draftNote}
                    onChangeText={setDraftNote}
                    onFocus={bindScrollOnFocus(draftNoteInputRef)}
                    placeholder={L(
                      'Краткая заметка, контекст или подсказка…',
                      'Коротка замітка, контекст або підказка…',
                      'Nota breve, contexto o pista…',
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
                        {L('Отмена', 'Скасувати', 'Cancelar')}
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
                        {triLang(lang, { ru: 'Сохранить', uk: 'Зберегти', es: 'Guardar' })}
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
                  frontGradient={cardChrome.frontGradient}
                  backGradient={cardChrome.backGradient}
                  borderAccent={cardChrome.borderAccent}
                  canRemove
                  onRemove={() => removeRow(idx)}
                  onSpeakEn={speakAudio}
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
                {busy ? (
                  <ActivityIndicator color={t.correctText} />
                ) : (
                  <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                    {isEditMode
                      ? L(
                          'Сохранить и отправить на проверку',
                          'Зберегти й надіслати на перевірку',
                          'Guardar y enviar a revisión',
                        )
                      : L('Отправить на проверку', 'Надіслати на перевірку', 'Enviar a revisión')}
                  </Text>
                )}
              </TouchableOpacity>
              </View>
            </ContentWrap>
          </ScrollView>
        </KeyboardAvoidingView>
        <ThemedConfirmModal
          visible={clearDraftModalOpen}
          title={L('Очистить черновик?', 'Очистити чернетку?', '¿Borrar borrador?')}
          message={L(
            'Локальные данные этого набора будут удалены.',
            'Локальні дані цього набору буде видалено.',
            'Se borrarán los datos locales de este pack.',
          )}
          cancelLabel={L('Отмена', 'Скасувати', 'Cancelar')}
          confirmLabel={L('Очистить', 'Очистити', 'Borrar')}
          confirmVariant="default"
          onCancel={() => setClearDraftModalOpen(false)}
          onConfirm={performClearLocalDraft}
        />
        <ThemedConfirmModal
          visible={resubmitPackModalOpen}
          title={L('Повторная проверка', 'Повторна перевірка', 'Nueva revisión')}
          message={L(
            'Набор исчезнет из продажи, пока не завершится проверка. Продолжить?',
            'Набір зникне з продажу, доки не завершиться перевірка. Продовжити?',
            'El pack dejará de estar a la venta hasta que termine la revisión. ¿Continuar?',
          )}
          cancelLabel={L('Отмена', 'Скасувати', 'Cancelar')}
          confirmLabel={L('Отправить', 'Надіслати', 'Enviar')}
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
  /** Округлая «плашка» вокруг степпера цены / темы карточек. */
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
  /** Число цены + иконка осколков по центру степпера. */
  priceStepperValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 100,
  },
  priceShardIcon: { width: 24, height: 24 },
  stepperVal: { fontSize: 22, fontWeight: '800', minWidth: 0, textAlign: 'center' },
});
