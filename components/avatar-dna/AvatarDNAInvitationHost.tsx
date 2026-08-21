import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useLang } from '../LangContext';
import ThemedChoiceModal from '../ThemedChoiceModal';
import { captureAccountGeneration, type AccountGenerationToken } from '../../app/account_generation';
import { avatarDNACopy } from '../../app/avatar_dna_copy';
import { dismissAvatarDNAInvitation } from '../../app/avatar_dna_invitation';
import { onAppEvent } from '../../app/events';

export function AvatarDNAInvitationHost() {
  const router = useRouter();
  const { lang } = useLang();
  const copy = useMemo(() => avatarDNACopy(lang), [lang]);
  const [account, setAccount] = useState<AccountGenerationToken | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const subscription = onAppEvent('avatar_dna_invitation_requested', () => {
      const current = captureAccountGeneration();
      if (current.phase !== 'active' || !current.stableId) return;
      setAccount(current);
      setVisible(true);
    });
    return () => subscription.remove();
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (account?.stableId) {
      void dismissAvatarDNAInvitation(account.stableId, account.generation);
    }
  };

  return (
    <ThemedChoiceModal
      visible={visible}
      title={copy.inviteTitle}
      message={copy.inviteMessage}
      onRequestClose={dismiss}
      choices={[
        {
          label: copy.inviteStart,
          onPress: () => {
            setVisible(false);
            router.push('/avatar_dna_studio' as never);
          },
        },
        { label: copy.inviteLater, variant: 'secondary', onPress: dismiss },
      ]}
    />
  );
}
