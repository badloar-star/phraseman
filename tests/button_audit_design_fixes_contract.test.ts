// зачем (аудит кнопок Карточки + Видео, 15.10, зона Дизайна; R43): ни одна кнопка не «мёртвая» и не молчаливая. Сторож по исходникам — каждый пункт аудита закреплён своей проверкой.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('аудит кнопок: Карточки', () => {
  it('R43: микрофон Карточек в ожидании доступа показывает индикатор и «занято» для читалки', () => {
    const src = read('app/flashcards/SpeakMicButton.tsx');
    expect(src).toContain('const awaiting = voiceGate.awaitingAccess;');
    expect(src).toContain('<ActivityIndicator testID={`${testID}-awaiting`}');
    expect(src).toContain('busy: awaiting');
  });

  it('#4: «Вернуть» локального набора снимает карточку со списка скрытых', () => {
    const src = read('app/flashcards_collection.tsx');
    expect(src).toContain('setPackUndo({ key, snapshot, cardId: card.id })');
    expect(src).toMatch(/else if \(entry\.cardId\) unhidePackCard\(entry\.cardId\)/);
  });

  it('#5: долгое нажатие по плитке открывает шторку, только если в ней есть строки', () => {
    const src = read('app/flashcards/CollectionGalleryView.tsx');
    expect(src).toContain('onLongPress={selectionMode ? undefined : onLongPressTile}');
    expect(src).toContain('isEditableCustomCard(card) || !card.isSystem');
  });

  it('#6: «Пополнить» без магазина не показывается — обработчик необязателен, коллекция его не передаёт', () => {
    expect(read('app/flashcards/CardPackShardPaywallModal.tsx')).toContain('onGoToShards?: () => void;');
    expect(read('app/flashcards/CardPackShardPaywallModal.tsx')).toContain('{onGoToShards ? (');
    expect(read('app/flashcards_collection.tsx')).not.toContain('onGoToShards=');
  });

  it('#16/#17: у Plus нет «N/30» ни на хабе, ни в настройке тренировки', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(hub).toContain('const trainingLimitShown = !hasPremiumAccess;');
    expect(hub).toContain("quotaPreview.status === 'waiting' || !trainingLimitShown ? null");
    expect(hub).toContain("quotaPreview.status === 'allowed' && trainingLimitShown");
    expect(read('app/flashcards_training_setup.tsx')).toContain("quotaPreview.status === 'waiting' || hasPremiumAccess ? null");
  });

  it('#20: итог «Верно/неверно» монтирует окно «нет энергии» — «Следующий раунд» при нуле открывает его', () => {
    const src = read('app/flashcards_swipe.tsx');
    expect(src).toMatch(/testID="flashcards-swipe-result"[\s\S]{0,300}<NoEnergyModal variant="learn" visible=\{noEnergyOpen\}/);
  });

  it('#21/#22: у «Говорения», «Блица» и «Верно/неверно» есть выход из загрузки и «не открылась»', () => {
    const speaking = read('app/flashcards_speaking_session.tsx');
    expect(speaking).toContain('onPress={leave}');
    expect(speaking).not.toContain('onPress={interactive ? leave : undefined}');
    expect(speaking).toMatch(/fc-speak-quota-unavailable"[\s\S]{0,400}\{header\(false\)\}/);
    expect(read('app/flashcards_blitz_session.tsx')).toMatch(/fc-blitz-quota-unavailable"[\s\S]{0,500}testID="fc-blitz-back"/);
    expect(read('app/flashcards_swipe.tsx')).toContain('testID="flashcards-swipe-quickstart-back"');
  });
});

describe('аудит кнопок: Видео', () => {
  it('#23/#24: плейлист и сетка плейлистов берут полный список канала, а не снимок на 20/8', () => {
    const src = read('app/all_channel_videos_source.ts');
    expect(src).toContain('playlists: (catalog.playlists ?? []).map(compactPlaylistItem)');
    expect(src).toContain('cached.playlists && manifest.activeVersion === cached.version');
    const playlist = read('app/lingman_playlist.tsx');
    expect(playlist).toContain('useAllChannelVideos(channelId, { playlistId, sort:');
    expect(playlist).toContain('videosSettledEmpty');
    expect(playlist).toContain('testID="youtube-playlist-empty"');
    const videos = read('app/lingman_videos.tsx');
    expect(videos).toContain('data={playlistsForGrid}');
  });

  it('#25: 0 роликов — «На этом языке пока нет роликов» и «Повторить», не вечный скелет', () => {
    const src = read('app/lingman_videos.tsx');
    expect(src).toContain("ru: 'На этом языке пока нет роликов'");
    expect(src).toContain('testID="youtube-no-videos-retry"');
    expect(src).toContain('catalog && !refreshing && allVideos.length === 0 && allChannel.playlists.length === 0');
  });

  it('#26: канал строго по тегу языка (как на Главной), английским не подменяем', () => {
    const src = read('app/lingman_videos.tsx');
    expect(src).toContain('resolveVideoChannelForStudyTarget(manifest.channels, studyTarget as LearningLanguageTarget)');
    expect(src).toContain("channelId = requestedChannelId || routeChannel || strictChannel?.id || '';");
    expect(src).toContain('noChannel && !catalog');
  });

  it('#27: отказ напоминания называет причину; кнопка «Настройки» переведена', () => {
    const src = read('app/lingman_videos.tsx');
    expect(src).not.toContain("text: 'Settings'");
    expect(src).toContain('copy.notifBlocked');
    expect(src).toContain('copy.notifDenied');
    expect(src).toContain('copy.premiereStarted');
  });
});

describe('аудит кнопок: Видео, добавки Макетов R57/R59 (15.10)', () => {
  it('плейлисты без роликов скрыты из сетки, счётчик «N видео» — из загруженного списка', () => {
    const videos = read('app/lingman_videos.tsx');
    expect(videos).toContain("if (allChannel.status !== 'ready') return base;");
    expect(videos).toContain('.filter((playlist) => (counts.get(playlist.id) ?? 0) > 0).map((playlist) => ({ ...playlist, itemCount: counts.get(playlist.id) ?? 0 }))');
    const playlist = read('app/lingman_playlist.tsx');
    expect(playlist).toContain("const shownCount = allChannel.status === 'ready' ? videos.length : playlist?.itemCount ?? 0;");
  });

  it('закладка в сетке держит прокрутку: строка «Сохранённые» сдвигает список на свою высоту', () => {
    const videos = read('app/lingman_videos.tsx');
    expect(videos).toContain('const hasSavedRow = !savedOnly && savedVideos.length > 0;');
    expect(videos).toContain('scrollToOffset({ offset: scrollYRef.current + h + SAVED_ROW_MARGIN, animated: false })');
    expect(videos).toContain('onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}');
  });
});
