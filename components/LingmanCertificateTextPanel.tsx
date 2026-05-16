import React from 'react';
import { Text, View } from 'react-native';
import { formatCertDate, type CertLang } from '../app/exam_certificate';

type Props = {
  name: string;
  score: number;
  total: number;
  pct: number;
  certId: string;
  completedAt: number;
  lang: CertLang;
  width?: number;
};

export default function LingmanCertificateTextPanel({
  name,
  score,
  total,
  pct,
  certId,
  completedAt,
  lang,
  width = 420,
}: Props) {
  const compact = width < 460;
  const safeName = name.trim() || 'Phraseman learner';

  return (
    <View
      style={{
        width,
        maxWidth: '100%',
        backgroundColor: '#0A1620',
        borderColor: '#D4A017',
        borderWidth: 1.2,
        borderRadius: 14,
        padding: compact ? 18 : 26,
        gap: compact ? 10 : 14,
      }}
    >
      <Text style={{ color: '#FDE68A', fontSize: compact ? 13 : 16, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' }}>
        PHRASEMAN B2
      </Text>
      <Text style={{ color: '#FFFFFF', fontSize: compact ? 22 : 30, fontWeight: '900', textAlign: 'center' }}>
        Certificate
      </Text>
      <Text style={{ color: '#D4A017', fontSize: compact ? 19 : 26, fontWeight: '900', textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>
        {safeName}
      </Text>
      <View style={{ height: 1, backgroundColor: 'rgba(212,160,23,0.45)', marginVertical: compact ? 2 : 6 }} />
      <Text style={{ color: '#E5E7EB', fontSize: compact ? 14 : 18, fontWeight: '700', textAlign: 'center' }}>
        Result: {score} / {total} ({pct}%)
      </Text>
      <Text style={{ color: '#9CA3AF', fontSize: compact ? 11 : 13, textAlign: 'center' }}>
        Completed: {formatCertDate(completedAt, lang)}
      </Text>
      <Text style={{ color: '#6B7280', fontSize: compact ? 9 : 11, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
        ID: {certId}
      </Text>
    </View>
  );
}
