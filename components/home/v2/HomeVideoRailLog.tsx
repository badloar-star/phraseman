// зачем (🔴 координатор 05.11: «ленты видео всё ещё нет между плитками и „Фразой дня“»; закон «сперва логи»): одна строка [HOME-VIDEO-RAIL] — почему лента показана или скрыта и что пришло в неё.
// Ничего не рисует; пишет только при смене значений. Смотреть: grep HOME-VIDEO-RAIL в .expo/metro-console.log или adb logcat.
import { useEffect } from 'react';

type Props = Readonly<{
  buttonEnabled: boolean;
  videosVisible: boolean;
  rankLocked: boolean;
  noChannel: boolean;
  langHidden: boolean;
  videosCount: number;
  status: string;
  studyTarget: string;
  ownerActive: boolean;
}>;

export default function HomeVideoRailLog(p: Props): null {
  const shown = p.buttonEnabled && p.videosVisible && !p.rankLocked && !p.noChannel && !p.langHidden;
  // решающее значение — первое ложное условие в порядке проверки на экране
  const reason = !p.buttonEnabled ? 'video_button_disabled'
    : !p.videosVisible ? 'homeVideosVisible=false'
      : p.rankLocked ? 'rank_locked'
        : p.noChannel ? 'no_channel_for_target'
          : p.langHidden ? 'lang_hidden'
            : 'shown';
  useEffect(() => {
    console.log('[HOME-VIDEO-RAIL]', JSON.stringify({ shown, reason, videos: p.videosCount, status: p.status, studyTarget: p.studyTarget, ownerActive: p.ownerActive, buttonEnabled: p.buttonEnabled, videosVisible: p.videosVisible, rankLocked: p.rankLocked, noChannel: p.noChannel, langHidden: p.langHidden })); // guard-ok: одна строка на смену решения
  }, [shown, reason, p.videosCount, p.status, p.studyTarget, p.ownerActive, p.buttonEnabled, p.videosVisible, p.rankLocked, p.noChannel, p.langHidden]);
  return null;
}
