import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { StorySlideProps } from './StorySlides';
import { Art, FrameRoot, H1 } from './templates/story_template_kit';
import { Enter } from './templates/story_template_motion';
import { useStoryTemplatePalette } from './templates/story_template_palette';

export default function HomeActivityStorySlide({ event }: StorySlideProps) {
  const pal = useStoryTemplatePalette();
  const { status } = event.payload;
  if (typeof status !== 'string') return null;
  return (
    <FrameRoot testID="home-story-scene-status">
      <Art><Enter kind="pop" d={80}><Ionicons name="information-circle-outline" size={104} color={pal.accG} /></Enter></Art>
      <H1 text={status} d0={180} small />
    </FrameRoot>
  );
}
