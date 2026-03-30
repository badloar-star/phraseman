import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName: { color: '#C8FF00', fontSize: 15, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 40, lineHeight: 34 },

  // Option buttons
  optionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,0,0.12)',
    gap: 14,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(200,255,0,0.1)',
    borderColor: '#C8FF00',
  },
  optionEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  optionLabel: {
    color: '#A8A8A8',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#C8FF00',
    fontWeight: '700',
  },

  // Buttons
  continueBtn: { width: '100%', backgroundColor: '#C8FF00', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  continueBtnText: { color: '#1A2400', fontSize: 18, fontWeight: '700' },
});
