import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import BouncyScrollView from '../components/BouncyScrollView';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { submitUserIdea, type IdeaCategory } from './ideas_client';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';

const CATEGORIES: { key: IdeaCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'feature', icon: 'sparkles-outline' },
  { key: 'improvement', icon: 'trending-up-outline' },
  { key: 'monetization', icon: 'diamond-outline' },
  { key: 'content', icon: 'library-outline' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function IdeasSubmitScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [benefit, setBenefit] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [busy, setBusy] = useState(false);

  const categoryLabel = useCallback(
    (key: IdeaCategory): string => {
      switch (key) {
        case 'feature':
          return L('Новая фича', 'Нова фіча', 'Nueva función');
        case 'improvement':
          return L('Улучшение', 'Покращення', 'Mejora');
        case 'monetization':
          return L('Монетизация', 'Монетизація', 'Monetización');
        case 'content':
          return L('Контент', 'Контент', 'Contenido');
        default:
          return L('Другое', 'Інше', 'Otro');
      }
    },
    [lang],
  );

  const canSend = useMemo(
    () => title.trim().length >= 3 && description.trim().length >= 10 && !busy,
    [title, description, busy],
  );

  const onSend = useCallback(async () => {
    if (!canSend) return;
    Keyboard.dismiss();
    hapticTap();
    setBusy(true);
    try {
      await submitUserIdea({
        title: title.trim(),
        description: description.trim(),
        benefit: benefit.trim(),
        category,
        lang,
      });
      await enqueueThemedBlockingInfoAlert(
        L('Идея отправлена 🚀', 'Ідею надіслано 🚀', 'Idea enviada 🚀'),
        L(
          'Спасибо! Мы прочитаем твою идею. Если возьмём её в работу — откроем тебе полный доступ на год.',
          'Дякуємо! Ми прочитаємо твою ідею. Якщо візьмемо її в роботу — відкриємо тобі повний доступ на рік.',
          '¡Gracias! Leeremos tu idea. Si la tomamos, te abriremos acceso completo por un año.',
        ),
        L('Понятно', 'Зрозуміло', 'Entendido'),
      );
      safeRouterBack(router, '/(tabs)/settings' as any);
    } catch (e: unknown) {
      const code = (e as { code?: string; message?: string })?.code || '';
      const msg = (e as { message?: string })?.message || '';
      const limited = code.includes('resource-exhausted') || msg.includes('rate_limited');
      await enqueueThemedBlockingInfoAlert(
        limited
          ? L('Уже приняли идею сегодня', 'Вже прийняли ідею сьогодні', 'Ya recibimos una idea hoy')
          : L('Что-то пошло не так', 'Щось пішло не так', 'Algo salió mal'),
        limited
          ? L(
              'Одна идея в день — чтобы каждая получила внимание. Возвращайся завтра со следующей.',
              'Одна ідея на день — щоб кожна отримала увагу. Повертайся завтра з наступною.',
              'Una idea al día para dar atención a cada una. Vuelve mañana con la siguiente.',
            )
          : L(
              'Не получилось отправить идею. Проверь связь и попробуй снова.',
              'Не вдалося надіслати ідею. Перевір зв’язок і спробуй знову.',
              'No se pudo enviar la idea. Revisa la conexión e inténtalo de nuevo.',
            ),
        L('Понятно', 'Зрозуміло', 'Entendido'),
      );
    } finally {
      setBusy(false);
    }
  }, [canSend, title, description, benefit, category, lang, router]);

  const inputStyle = {
    backgroundColor: t.bgCard,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: t.textPrimary,
    fontSize: f.body,
  } as const;
  const labelStyle = {
    color: t.textPrimary,
    fontSize: f.body,
    fontWeight: '700' as const,
    marginBottom: 8,
    marginTop: 18,
  };
  const hintStyle = { color: t.textSecond, fontSize: f.caption, marginTop: 6 };

  const scrollBottomPad = 120 + Math.max(insets.bottom, 16);

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/settings' as any);
            }}
            style={{ marginRight: 12, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }}
            numberOfLines={1}
          >
            {L('Идеи', 'Ідеї', 'Ideas')}
          </Text>
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* Hero — Стиль ТРЕНЕР + ИГРА (Библия Phraseman) */}
          <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 10 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: t.correctBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: t.correct,
                marginBottom: 14,
              }}
            >
              <Ionicons name="bulb" size={44} color={t.correct} />
            </View>
            <Text
              style={{
                color: t.textPrimary,
                fontSize: f.h2,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: f.h2 * 1.25,
                marginBottom: 8,
              }}
            >
              {L('Твоя идея —\nгод полного доступа', 'Твоя ідея —\nрік повного доступу', 'Tu idea —\nun año de acceso')}
            </Text>
            <Text
              style={{
                color: t.textSecond,
                fontSize: f.body,
                textAlign: 'center',
                lineHeight: f.body * 1.4,
              }}
            >
              {L(
                'Придумал, как сделать Phraseman лучше? Опиши идею. Возьмём её в работу — откроем тебе полный доступ на целый год.',
                'Придумав, як зробити Phraseman кращим? Опиши ідею. Візьмемо її в роботу — відкриємо тобі повний доступ на цілий рік.',
                '¿Tienes una idea para mejorar Phraseman? Descríbela. Si la tomamos, te abrimos acceso completo por un año.',
              )}
            </Text>
          </View>

          {/* Графа 1 — Название */}
          <Text style={labelStyle}>{L('Название идеи', 'Назва ідеї', 'Título de la idea')} *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={L('Коротко, в одну строку', 'Коротко, в один рядок', 'Breve, en una línea')}
            placeholderTextColor={t.textGhost}
            maxLength={120}
            style={inputStyle}
          />

          {/* Графа 2 — Что это и как работает */}
          <Text style={labelStyle}>{L('Что это и как работает', 'Що це і як працює', 'Qué es y cómo funciona')} *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={L(
              'Опиши идею подробно: что увидит пользователь и как этим пользоваться.',
              'Опиши ідею докладно: що побачить користувач і як цим користуватися.',
              'Describe la idea: qué verá el usuario y cómo se usa.',
            )}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={2000}
            style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
          />

          {/* Графа 3 — Чем поможет приложению */}
          <Text style={labelStyle}>{L('Чем это поможет приложению', 'Чим це допоможе застосунку', 'Cómo ayuda a la app')}</Text>
          <TextInput
            value={benefit}
            onChangeText={setBenefit}
            placeholder={L(
              'Зачем это нужно: что станет удобнее, интереснее или выгоднее.',
              'Навіщо це потрібно: що стане зручніше, цікавіше або вигідніше.',
              'Para qué sirve: qué será más cómodo, interesante o rentable.',
            )}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={1000}
            style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
          />

          {/* Графа 4 — Категория */}
          <Text style={labelStyle}>{L('Категория', 'Категорія', 'Categoría')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => {
                    hapticTap();
                    setCategory(c.key);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? t.correct : t.border,
                    backgroundColor: active ? t.correctBg : t.bgCard,
                  }}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={active ? t.correct : t.textSecond}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: active ? t.textPrimary : t.textSecond,
                      fontSize: f.caption,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {categoryLabel(c.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={hintStyle}>
            {L('Одна идея в день. Решение придёт прямо в приложение.', 'Одна ідея на день. Рішення прийде прямо в застосунок.', 'Una idea al día. La decisión llega a la app.')}
          </Text>

          {/* CTA — Стиль ИНВЕСТОР (глагол + ценность) */}
          <TouchableOpacity
            onPress={onSend}
            disabled={!canSend}
            activeOpacity={0.85}
            style={{
              marginTop: 22,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canSend ? t.accent : t.bgCard,
              borderWidth: canSend ? 0 : 1,
              borderColor: t.border,
              opacity: canSend ? 1 : 0.7,
            }}
          >
            {busy ? (
              <ActivityIndicator color={canSend ? '#fff' : t.textSecond} />
            ) : (
              <Text
                style={{
                  color: canSend ? '#fff' : t.textSecond,
                  fontSize: f.body,
                  fontWeight: '800',
                }}
              >
                {L('Отправить идею', 'Надіслати ідею', 'Enviar idea')}
              </Text>
            )}
          </TouchableOpacity>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
