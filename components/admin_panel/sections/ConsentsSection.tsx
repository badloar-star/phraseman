// Секция админ-панели: «Согласия пользователей» (GDPR accountability).
//
// Читает коллекцию Firestore `user_consents` (пишется из онбординга, модала
// повторного согласия и тумблера в Настройках → Приватность) и показывает по
// каждому пользователю: возраст-bracket, статус согласия на аналитику и даты
// выдачи/отзыва. Доступ к коллекции на чтение есть только у admin
// (см. firestore.rules → match /user_consents/{userId}).
//
// Только для DEV/админ-сборки: весь граф отсекается гейтом settings_testers.tsx.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AccordionSection,
  AdminHint,
  ACCENT,
  ACCENT_DARK,
  ADMIN_TEXT,
  ADMIN_TEXT_MUTED,
  ACCENT_BORDER_SOFT,
} from '../ui';
import { IS_EXPO_GO } from '../../../app/config';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

interface ConsentRow {
  id: string;
  birthYear: number | null;
  ageBracket: string;
  analyticsConsent: string;
  legalAccepted: boolean;
  legalAcceptedAt: number | null;
  platform: string;
  updatedAt: number | null;
  consentGrantedAt: number | null;
  consentRevokedAt: number | null;
}

const FETCH_LIMIT = 200;

function getFirestore(): any | null {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function fmtDate(ms: number | null): string {
  if (!ms) return '—';
  try {
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
  } catch {
    return '—';
  }
}

function consentLabel(state: string): { text: string; color: string } {
  if (state === 'granted') return { text: 'Согласие ✓', color: '#7CC58A' };
  if (state === 'denied') return { text: 'Отозвано ✕', color: '#D9A04A' };
  return { text: 'Не выбрано', color: ADMIN_TEXT_MUTED };
}

export default function ConsentsSection({ open, onToggle }: Props) {
  const [rows, setRows] = useState<ConsentRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const db = getFirestore();
    if (!db) {
      setError('Firestore недоступен (Expo Go или нет нативного модуля).');
      setLoading(false);
      return;
    }
    try {
      const snap = await db
        .collection('user_consents')
        .orderBy('updatedAt', 'desc')
        .limit(FETCH_LIMIT)
        .get();
      const out: ConsentRow[] = [];
      for (const doc of (snap?.docs ?? []) as Array<{ id: string; data: () => Record<string, unknown> }>) {
        const d = doc.data() ?? {};
        out.push({
          id: doc.id,
          birthYear: num(d.birthYear),
          ageBracket: str(d.ageBracket) || 'unknown',
          analyticsConsent: str(d.analyticsConsent) || 'unset',
          legalAccepted: d.legalAccepted === true,
          legalAcceptedAt: num(d.legalAcceptedAt),
          platform: str(d.platform) || '—',
          updatedAt: num(d.updatedAt),
          consentGrantedAt: num(d.consentGrantedAt),
          consentRevokedAt: num(d.consentRevokedAt),
        });
      }
      setRows(out);
    } catch (e) {
      setError('Не удалось загрузить. Нужны права admin и индекс по updatedAt.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ленивая загрузка при первом раскрытии секции.
  const handleToggle = useCallback(
    (id: string) => {
      onToggle(id);
      if (!open && rows === null && !loading) void load();
    },
    [onToggle, open, rows, loading, load],
  );

  return (
    <AccordionSection
      id="user_consents"
      icon="shield-checkmark-outline"
      title="Согласия пользователей (GDPR)"
      badge={rows?.length}
      open={open}
      onToggle={handleToggle}
    >
      <AdminHint>
        Возраст, принятие Terms/Privacy и согласие на аналитику из коллекции
        user_consents. Дата выдачи и дата отзыва — по отдельности. Чтение
        доступно только admin.
      </AdminHint>

      <TouchableOpacity
        testID="admin-consents-refresh"
        onPress={() => { void load(); }}
        disabled={loading}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 16, paddingVertical: 12,
        }}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : (
          <Ionicons name="refresh-outline" size={18} color={ACCENT} />
        )}
        <Text style={{ color: ADMIN_TEXT, fontSize: 14, fontWeight: '600' }}>
          {loading ? 'Загрузка…' : rows === null ? 'Загрузить список' : 'Обновить'}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: '#D9A04A', fontSize: 12, lineHeight: 17, paddingHorizontal: 16, paddingBottom: 12 }}>
          {error}
        </Text>
      )}

      {rows !== null && !loading && rows.length === 0 && !error && (
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 13, paddingHorizontal: 16, paddingBottom: 14 }}>
          Записей пока нет.
        </Text>
      )}

      {rows?.map((r) => {
        const c = consentLabel(r.analyticsConsent);
        return (
          <View
            key={r.id}
            style={{
              paddingHorizontal: 16, paddingVertical: 12,
              borderTopWidth: 0.5, borderTopColor: ACCENT_BORDER_SOFT,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ flex: 1, color: ADMIN_TEXT, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                {r.id.slice(0, 14)}…
              </Text>
              <View style={{ backgroundColor: ACCENT_DARK, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: c.color, fontSize: 11, fontWeight: '700' }}>{c.text}</Text>
              </View>
            </View>
            <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 17 }}>
              {`Возраст: ${r.ageBracket}${r.birthYear ? ` · ${r.birthYear} г.` : ''} · ${r.platform}`}
            </Text>
            <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 17 }}>
              {`Terms/Privacy: ${r.legalAccepted ? `приняты ✓ (${fmtDate(r.legalAcceptedAt)})` : '—'}`}
            </Text>
            <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 17 }}>
              {`Дал: ${fmtDate(r.consentGrantedAt)}`}
            </Text>
            <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 17 }}>
              {`Отозвал: ${fmtDate(r.consentRevokedAt)}`}
            </Text>
            <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 17 }}>
              {`Изменено: ${fmtDate(r.updatedAt)}`}
            </Text>
          </View>
        );
      })}
    </AccordionSection>
  );
}
