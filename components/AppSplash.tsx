import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

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
  }, []);

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
  const knowlyOpacity = useRef(new Animated.Value(0)).current;
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
      Animated.timing(knowlyOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

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
      <Animated.Text style={[styles.studio, { opacity: knowlyOpacity }]}>
        KNOWLY
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#06141B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  glowBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#F5A623',
    opacity: 0.07,
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
    color: '#F5A623',
    lineHeight: 96,
    marginRight: 2,
    textShadowColor: '#F5A623',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  logoMain: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#6B8CA0',
    letterSpacing: 1.5,
    marginBottom: 60,
    textTransform: 'uppercase',
  },
  studio: {
    position: 'absolute',
    bottom: 52,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  card: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardText: {
    color: '#F5A623',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
});
