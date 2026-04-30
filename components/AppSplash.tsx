import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { DARK } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Floating phrase cards shown in background
const PHRASES = [
  'look up', 'give in', 'turn off',
  'break out', 'carry on', 'put up',
  'take on', 'fall for', 'go over',
];

interface FloatingCardProps {
  phrase: string;
  delay: number;
  x: number;
  startY: number;
}

function FloatingCard({ phrase, delay, x, startY }: FloatingCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(startY)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: startY - 80,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: startY,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, startY, translateY]);

  return (
    <Animated.View style={[styles.card, { left: x, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.cardText}>{phrase}</Text>
    </Animated.View>
  );
}

interface Props {
  isVisible: boolean;
}

export default function AppSplash({ isVisible }: Props) {
  // Main content: fade + scale in
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.8)).current;
  const studioTextOpacity = useRef(new Animated.Value(0)).current;
  // Container fade out when hiding
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(studioTextOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [containerOpacity, studioTextOpacity, logoOpacity, logoScale]);

  useEffect(() => {
    if (!isVisible) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [containerOpacity, isVisible]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Floating background cards */}
      {PHRASES.map((phrase, i) => (
        <FloatingCard
          key={phrase}
          phrase={phrase}
          delay={i * 400}
          x={(width / PHRASES.length) * i - 10}
          startY={height * 0.55 + (i % 3) * 40}
        />
      ))}

      {/* Glow blob behind logo */}
      <View style={styles.glowBlob} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={styles.logoP}>P</Text>
        <View>
          <Text style={styles.logoMain}>hrase</Text>
          <Text style={styles.logoMain}>Man</Text>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: logoOpacity }]}>
        Speak fluently. Think freely.
      </Animated.Text>

      {/* Studio name */}
      <Animated.View style={[styles.studioWrap, { opacity: studioTextOpacity }]}>
        <Text style={styles.studioBy}>by</Text>
        <Text style={styles.studioName}>PHRASEMAN</Text>
        <Text style={styles.studioYear}>· 2026</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  glowBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: DARK.accent,
    opacity: 0.08,
    top: height * 0.30,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoP: {
    fontSize: 88,
    fontWeight: '900',
    color: DARK.gold,
    lineHeight: 96,
    marginRight: 2,
    textShadowColor: DARK.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  logoMain: {
    fontSize: 42,
    fontWeight: '800',
    color: DARK.textPrimary,
    lineHeight: 46,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: DARK.textMuted,
    letterSpacing: 1.5,
    marginBottom: 60,
    textTransform: 'uppercase',
  },
  studioWrap: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  studioBy: {
    fontSize: 11,
    color: DARK.textGhost,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  studioName: {
    fontSize: 13,
    color: DARK.textSecond,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  studioYear: {
    fontSize: 11,
    color: DARK.textGhost,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  card: {
    position: 'absolute',
    backgroundColor: DARK.correctBg,
    borderWidth: 1,
    borderColor: DARK.borderHighlight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardText: {
    color: DARK.accent,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
});
