import React from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLang } from '../components/LangContext';
import { AvatarDNAEditor } from '../components/avatar-dna/AvatarDNAEditor';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';

export default function AvatarDNAStudioScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, paddingTop: insets.top }}><AvatarDNAEditor initialDNA={starterAvatarDNA('starter_warm_01')} lang={lang} onClose={() => router.back()} onSave={() => router.back()} /></View>;
}
