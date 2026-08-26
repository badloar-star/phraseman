import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import { AvatarDNAEditor } from '../components/avatar-dna/AvatarDNAEditor';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { captureAccountGeneration } from './account_generation';
import { avatarDNACopy, AVATAR_DNA_COPY } from './avatar_dna_copy';
import { completeAvatarDNAInvitation } from './avatar_dna_invitation';
import { emitAppEvent, onAppEvent } from './events';
import { isAvatarDNAEnabled } from './remote_flags';
import { avatarCatalog, starterAvatarDNA } from '../modules/avatar-dna/catalog';
import type { AvatarDNA } from '../modules/avatar-dna/contracts';
import { saveCurrentAvatarDNA } from '../modules/avatar-dna/save_flow';
import { readAvatarDNAState } from '../modules/avatar-dna/storage';

const saveFailurePayload = () => ({
  type: 'error' as const,
  messageRu: AVATAR_DNA_COPY.ru.saveFailed,
  messageUk: AVATAR_DNA_COPY.uk.saveFailed,
  messageEs: AVATAR_DNA_COPY.es.saveFailed,
  messagePtBr: AVATAR_DNA_COPY['pt-BR'].saveFailed,
  messageVi: AVATAR_DNA_COPY.vi.saveFailed,
  messageId: AVATAR_DNA_COPY.id.saveFailed,
  messageTr: AVATAR_DNA_COPY.tr.saveFailed,
  messagePl: AVATAR_DNA_COPY.pl.saveFailed,
});

export default function AvatarDNAStudioScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const copy = useMemo(() => avatarDNACopy(lang), [lang]);
  const account = useMemo(() => captureAccountGeneration(), []);
  const [initialDNA, setInitialDNA] = useState<AvatarDNA | null>(null);
  const [draft, setDraft] = useState<AvatarDNA>(() => starterAvatarDNA('starter_warm_01'));
  const [dirty, setDirty] = useState(false);
  const [showDirtyExit, setShowDirtyExit] = useState(false);
  const enabled = isAvatarDNAEnabled(account.stableId);

  useEffect(() => {
    if (!enabled || !account.stableId || account.phase !== 'active') {
      safeRouterBack(router, '/avatar_select' as never);
      return;
    }
    let cancelled = false;
    void readAvatarDNAState(account.stableId, account.generation).then((stored) => {
      if (cancelled) return;
      const next = stored?.confirmedDNA ?? starterAvatarDNA('starter_warm_01');
      setDraft(next);
      setInitialDNA(next);
    });
    const remoteSub = onAppEvent('remote_config_changed', () => {
      if (!isAvatarDNAEnabled(account.stableId)) safeRouterBack(router, '/avatar_select' as never);
    });
    return () => {
      cancelled = true;
      remoteSub.remove();
    };
  }, [account.generation, account.phase, account.stableId, enabled, router]);

  const close = useCallback(() => {
    if (dirty) setShowDirtyExit(true);
    else safeRouterBack(router, '/avatar_select' as never);
  }, [dirty, router]);

  const save = useCallback(async (dna: AvatarDNA) => {
    try {
      const result = await saveCurrentAvatarDNA(dna);
      if (result.status !== 'committed') throw new Error('avatar_dna_stale_account');
      if (account.stableId) {
        void completeAvatarDNAInvitation(account.stableId, account.generation);
        emitAppEvent('avatar_dna_saved', { ownerStableId: account.stableId });
      }
      setDirty(false);
      setShowDirtyExit(false);
      safeRouterBack(router, '/avatar_select' as never);
    } catch {
      setShowDirtyExit(false);
      emitAppEvent('action_toast', saveFailurePayload());
    }
  }, [account.generation, account.stableId, router]);

  if (!enabled || !initialDNA) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgPrimary }}>
        <ActivityIndicator color={t.accent} />
        {enabled ? <Text style={{ marginTop: 12, color: t.textSecond }}>{copy.loading}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <AvatarDNAEditor initialDNA={initialDNA} lang={lang} reduceMotion={reduceMotion} onClose={close} onSave={save} onDirtyChange={setDirty} onDraftChange={setDraft} />
      <ThemedChoiceModal
        visible={showDirtyExit}
        title={copy.unsavedTitle}
        message={copy.unsavedMessage}
        onRequestClose={() => setShowDirtyExit(false)}
        choices={[
          { label: copy.saveAndClose, onPress: () => { void save(draft); } },
          { label: copy.continueEditing, variant: 'secondary', onPress: () => setShowDirtyExit(false) },
          { label: copy.discardChanges, variant: 'secondary', onPress: () => safeRouterBack(router, '/avatar_select' as never) },
        ]}
      />
      <View testID="avatar-dna-manifest-version" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}><Text>{avatarCatalog.manifestVersion}</Text></View>
    </View>
  );
}
