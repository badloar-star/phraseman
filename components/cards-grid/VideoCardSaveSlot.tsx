import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';

import { useVideoCardSaved, type VideoCardSave } from '../../app/flashcards/use_video_card_save';
import type { CardItem } from '../../app/flashcards/types';
import { VideoCardSaveButton } from './VideoCardSaveButton';

/**
 * Кнопка «Сохранить» одной карточки из видео: «сохранено ли» читает подпиской по ключу этой карточки (Ревизор 4d65c8be5 (б)) —
 * сохранение соседней карточки эту не перерисовывает, а значение контекста для списка не меняется.
 */
export const VideoCardSaveSlot = memo(function VideoCardSaveSlot({ save, card, ink, savedInk, backgroundColor, boxShadow, testID, size, style }: Readonly<{
  save: VideoCardSave;
  card: CardItem;
  ink: string;
  savedInk?: string;
  backgroundColor: string;
  boxShadow?: ViewStyle['boxShadow'];
  testID?: string;
  size?: number;
  style?: ViewStyle;
}>) {
  const saved = useVideoCardSaved(save, card);
  return (
    <VideoCardSaveButton
      testID={testID}
      saved={saved}
      onPress={() => save.toggle(card)}
      saveLabel={save.labels.save}
      savedLabel={save.labels.saved}
      ink={ink}
      savedInk={savedInk}
      backgroundColor={backgroundColor}
      boxShadow={boxShadow}
      size={size}
      style={style}
    />
  );
});

export default VideoCardSaveSlot;
