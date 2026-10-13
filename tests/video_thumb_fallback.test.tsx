// зачем (координатор 12.10, cards-028; 13.10 вариант «а», d2127130e): (1) dev-фикстура роликов (devDemoVid0…4) показывает превью настоящих роликов канала, а не несуществующий devDemoVid-адрес; (2) при ошибке загрузки превью плитка не остаётся серой пустой:
// запасной вид (тон темы, ▶, на крупной плитке — название), лог [THUMB] fallback reason=…, без повторных запросов.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
}));
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  return { Image: (props: Record<string, unknown>) => ReactLocal.createElement('Image', { ...props, testID: 'thumb-image' }) };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../assets/images/home_last_lesson/home-last-lesson-aurora.webp', () => 1, { virtual: true });
jest.mock('../assets/images/home_last_lesson/home-last-lesson-ember.webp', () => 2, { virtual: true });
jest.mock('../assets/images/home_last_lesson/home-last-lesson-forest.webp', () => 3, { virtual: true });
jest.mock('../assets/images/home_last_lesson/home-last-lesson-gold.webp', () => 4, { virtual: true });
jest.mock('../assets/images/home_last_lesson/home-last-lesson-indigo.webp', () => 5, { virtual: true });

import { VideoThumb, devDemoThumbSource } from '../app/flashcards/VideoThumb';

const g = { opaqueControl: '#222', accentText: '#7EF0C8', text: '#fff' } as never;

describe('VideoThumb', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('dev fixture ids map to real channel previews, real ids and store builds do not', () => {
    expect(devDemoThumbSource('devDemoVid0')).not.toBeNull();
    expect(devDemoThumbSource('devDemoVid4')).not.toBeNull();
    expect(devDemoThumbSource('dQw4w9WgXcQ')).toBeNull();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(devDemoThumbSource('devDemoVid0')).toBeNull();
  });

  it('fixture id renders a real channel video preview, never the fake devDemoVid url', async () => {
    await render(<VideoThumb surface="video_pack_card" id="video:devDemoVid1" videoId="devDemoVid1" thumbUrl="https://i.ytimg.com/vi/devDemoVid1/hqdefault.jpg" title="T" g={g} showTitle />);
    const image = screen.getByTestId('thumb-image');
    const uri = (image.props.source as { uri?: string }).uri ?? '';
    expect(uri).toMatch(/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/);
    expect(uri).not.toContain('devDemoVid');
    expect(screen.queryByTestId('video-thumb-fallback-video:devDemoVid1')).toBeNull();
  });

  it('on a load error shows the fallback (play icon + title on the large tile) and logs the reason once', async () => {
    await render(<VideoThumb surface="video_pack_card" id="video:abc" videoId="abcdefghijk" thumbUrl="https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg" title="Название ролика" g={g} showTitle />);
    expect(screen.queryByTestId('video-thumb-fallback-video:abc')).toBeNull();
    await act(async () => { screen.getByTestId('thumb-image').props.onError({ error: 'Failed to load resource' }); });
    expect(screen.getByTestId('video-thumb-fallback-video:abc')).toBeTruthy();
    expect(screen.queryByTestId('thumb-image')).toBeNull(); // повторного запроса нет
    expect(screen.getByText('Название ролика')).toBeTruthy();
    const warns = (console.warn as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(warns.filter((l) => l.includes('[THUMB] fallback') && l.includes('reason=load_error'))).toHaveLength(1);
  });

  it('empty videoId shows the fallback without the title on the narrow tile', async () => {
    await render(<VideoThumb surface="video_pack_plain" id="video:x" videoId="" thumbUrl={null} title="Скрытое название" g={g} showTitle={false} />);
    expect(screen.getByTestId('video-thumb-fallback-video:x')).toBeTruthy();
    expect(screen.queryByText('Скрытое название')).toBeNull();
    const warns = (console.warn as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(warns.some((l) => l.includes('reason=no_video_id'))).toBe(true);
  });

  it('Home rail tile: fallback on the rail plate (transparent), no second play icon, title shown', async () => {
    await render(<VideoThumb surface="home_video_rail" id="rail1" videoId="rail1" thumbUrl="https://i.ytimg.com/vi/rail1/hqdefault.jpg" title="Видео ленты" g={g} showTitle showPlay={false} fallbackBackground="transparent" />);
    await act(async () => { screen.getByTestId('thumb-image').props.onError({ error: 'x' }); });
    const fallback = screen.getByTestId('video-thumb-fallback-rail1');
    expect(JSON.stringify(fallback.props.style)).toContain('transparent');
    expect(screen.queryByText('Видео ленты')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain('Ionicons');
  });

  it('the component adds no network code of its own', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'VideoThumb.tsx'), 'utf8');
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|axios/);
  });
});
