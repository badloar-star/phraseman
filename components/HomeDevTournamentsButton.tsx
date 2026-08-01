import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

/** Local-only test entry. Tournament mode remains unavailable in release builds. */
export default function HomeDevTournamentsButton() {
  const router = useRouter();

  if (!__DEV__) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Открыть тест турниров"
      onPress={() => router.push('/tournaments')}
      style={styles.button}
    >
      <Text style={styles.label}>Тест турниров</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#D5FF3F',
  },
  label: {
    color: '#07110A',
    fontSize: 13,
    fontWeight: '800',
  },
});
