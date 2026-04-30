import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { actionToastTri, emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import {
  callCommunityGetPackRatingSummary,
  callCommunitySubmitPackRating,
  isCommunityPacksCloudEnabled,
} from './functionsClient';

type Props = {
  packId: string;
  lang: Lang;
  t: Theme;
  catalogRatingAvg: number;
  catalogRatingCount: number;
  onAggregateUpdated?: (avg: number, count: number) => void;
};

async function ensureSignedIn(): Promise<boolean> {
  if (auth().currentUser) return true;
  try {
    await auth().signInAnonymously();
    return true;
  } catch {
    return false;
  }
}

export default function CommunityPackRatingBar({
  packId,
  lang,
  t,
  catalogRatingAvg,
  catalogRatingCount,
  onAggregateUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [ratingAvg, setRatingAvg] = useState(catalogRatingAvg);
  const [ratingCount, setRatingCount] = useState(catalogRatingCount);
  const [myStars, setMyStars] = useState<number | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRatingAvg(catalogRatingAvg);
    setRatingCount(catalogRatingCount);
  }, [catalogRatingAvg, catalogRatingCount]);

  const refresh = useCallback(async () => {
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !isCommunityPacksCloudEnabled()) {
      setLoading(false);
      return;
    }
    const buyerStableId = await getCanonicalUserId().catch(() => null);
    if (!buyerStableId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ok = await ensureSignedIn();
      if (!ok) {
        setLoading(false);
        return;
      }
      const s = await callCommunityGetPackRatingSummary({ buyerStableId, packId });
      setRatingAvg(s.ratingAvg);
      setRatingCount(s.ratingCount);
      setMyStars(s.myStars);
      setCanRate(s.canRate);
      onAggregateUpdated?.(s.ratingAvg, s.ratingCount);
    } catch {
      setRatingAvg(catalogRatingAvg);
      setRatingCount(catalogRatingCount);
    } finally {
      setLoading(false);
    }
  }, [packId, catalogRatingAvg, catalogRatingCount, onAggregateUpdated]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onPickStars = useCallback(
    async (stars: number) => {
      if (!canRate || busy) return;
      const buyerStableId = await getCanonicalUserId().catch(() => null);
      if (!buyerStableId) return;
      const ok = await ensureSignedIn();
      if (!ok) {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Войдите в приложение (облако).',
            uk: 'Увійдіть у застосунок (хмара).',
            es: 'Inicia sesión en la app (nube).',
          }),
        );
        return;
      }
      setBusy(true);
      try {
        const r = await callCommunitySubmitPackRating({ buyerStableId, packId, stars });
        setRatingAvg(r.ratingAvg);
        setRatingCount(r.ratingCount);
        setMyStars(r.myStars);
        onAggregateUpdated?.(r.ratingAvg, r.ratingCount);
        emitAppEvent(
          'action_toast',
          actionToastTri('success', {
            ru: 'Спасибо за оценку.',
            uk: 'Дякуємо за оцінку.',
            es: 'Gracias por tu valoración.',
          }),
        );
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: msg.slice(0, 120) || 'Не удалось сохранить оценку.',
            uk: msg.slice(0, 120) || 'Не вдалося зберегти оцінку.',
            es: msg.slice(0, 120) || 'No se pudo guardar la valoración.',
          }),
        );
      } finally {
        setBusy(false);
      }
    },
    [canRate, busy, packId, onAggregateUpdated],
  );

  const label = triLang(lang, {
    ru: 'Оценка набора',
    uk: 'Оцінка набору',
    es: 'Valoración del pack',
  });
  const countLabel = triLang(lang, {
    ru: `на основе ${ratingCount} оценок`,
    uk: `на основі ${ratingCount} оцінок`,
    es: `según ${ratingCount} valoraciones`,
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.bgCard,
      }}
    >
      <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator color={t.accent} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: canRate ? 8 : 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>{ratingAvg.toFixed(1)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Math.round(ratingAvg) ? 'star' : 'star-outline'}
                  size={16}
                  color={n <= Math.round(ratingAvg) ? '#EAB308' : t.textGhost}
                  style={{ marginRight: 1 }}
                />
              ))}
            </View>
            <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '600' }}>{countLabel}</Text>
          </View>
          {canRate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '600', marginRight: 4 }}>
                {triLang(lang, { ru: 'Ваша оценка:', uk: 'Ваша оцінка:', es: 'Tu valoración:' })}
              </Text>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  disabled={busy}
                  onPress={() => void onPickStars(n)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityLabel={
                    triLang(lang, {
                      ru: `${n} из 5 звёзд`,
                      uk: `${n} з 5 зірок`,
                      es: `${n} de 5 estrellas`,
                    })
                  }
                >
                  <Ionicons
                    name={(myStars ?? 0) >= n ? 'star' : 'star-outline'}
                    size={26}
                    color={(myStars ?? 0) >= n ? '#EAB308' : t.textGhost}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
