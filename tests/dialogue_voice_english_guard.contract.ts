import assert from 'node:assert/strict';

import { assertDialogueEnglishVoiceFallbackGuarded } from './dialogue_voice_english_guard';

const guarded = `
const speakDialogue = (text) => {
  if (dialogueTarget === 'en') {
    legacySpeak(text, undefined, { language: dialogueSpeechLocale ?? 'en-US', voice: '' });
    return true;
  }
  return strictDialogueVoice.speakDialogue(text);
};
`;

assert.doesNotThrow(() => assertDialogueEnglishVoiceFallbackGuarded(guarded, 'fixture.tsx'));
for (const unsafe of [
  `legacySpeak(text, undefined, { language: 'en-US' });`,
  `if (dialogueTarget === 'de') { legacySpeak(text, undefined, { language: "en-US" }); }`,
  `if (dialogueTarget === 'en') { legacySpeak(text, undefined, { language: 'en-US' }); }
   legacySpeak(text, undefined, { language: \`en-US\` });`,
  `// ${guarded}\nlegacySpeak(text, undefined, { language: 'en-US' });`,
  `if (dialogueTarget === 'en') {
     legacySpeak(text, undefined, { language: 'en-US' });
     strictDialogueVoice.speakDialogue(text);
   }
   return legacySpeak(text, undefined, { language: dialogueSpeechLocale });`,
  `const speakDialogue = (text) => {
     if (dialogueTarget === 'en') {
       legacySpeak(text, undefined, { language: 'en-US' });
       return true;
     }
     return legacySpeak(text, undefined, { language: dialogueSpeechLocale });
   };
   const unused = () => strictDialogueVoice.speakDialogue('other');`,
  `const speakDialogue = (text) => {
     strictDialogueVoice.speakDialogue('unused');
     if (dialogueTarget === 'en') {
       legacySpeak(text, undefined, { language: 'en-US' });
       return true;
     }
     return legacySpeak(text, undefined, { language: dialogueSpeechLocale });
   };`,
  `const speakDialogue = (text) => {
     return strictDialogueVoice.speakDialogue(text);
     if (wrapper) {
       if (dialogueTarget === 'en') {
         legacySpeak(text, undefined, { language: 'en-US' });
         return true;
       }
     }
   };`,
]) {
  assert.throws(() => assertDialogueEnglishVoiceFallbackGuarded(unsafe, 'fixture.tsx'));
}

console.log('dialogue-voice-english-guard-contract: PASS');
