// зачем (владелец 04.11: «кто-то убрал комментарии в наборах»): код комментариев не удалялся — пропала ЗАМЕТНОСТЬ (серая ссылка без значка и числа).
// Сторож OWNER_LOCKS «комментарии наборов видимы»: вход в обсуждение на экране набора — значок + основной цвет + счётчик, цель ≥48 dp, и он подключён во всех вариантах.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('комментарии наборов видимы', () => {
  const scene = read('components/packs/CommunityPackScene.tsx');
  const preview = read('app/flashcards/CommunityPackPreview.tsx');
  it('сцена набора: кнопка с значком 💬, цветом g.text (не g.secondary) и счётчиком при N>0', () => {
    const line = scene.slice(scene.indexOf('testID="pack-scene-comments"'), scene.indexOf('testID="pack-scene-comments"') + 900);
    expect(line).toContain('chatbubble-outline');
    expect(line).toContain('minHeight: 48');
    expect(line).toContain('commentsCount > 0');
    expect(line).not.toContain('g.secondary');
  });
  it('при нуле отзывов кнопка не прячется и зовёт «Оставить отклик» на 9 языках (строки Переводчика)', () => {
    expect(scene).toContain("commentsCount > 0 ? triLang(lang, { ru: 'Обсуждение набора'");
    expect(scene).toContain("ru: 'Оставить отклик', uk: 'Залишити відгук', en: 'Leave feedback', es: 'Dejar un comentario', 'pt-BR': 'Deixar um comentário', vi: 'Để lại phản hồi', id: 'Beri tanggapan', tr: 'Yorum bırak', pl: 'Zostaw opinię'");
  });
  it('превью передаёт и обработчик, и живой счётчик в сцену', () => {
    expect(preview).toContain('onComments={onOpenComments} commentsCount={liveComments}');
  });
  it('видео-вариант сохраняет кнопку «💬 N» с обработчиком открытия', () => {
    expect(preview).toContain('testID={`pack-comments-${pack.id}`}');
    expect(preview).toContain('onPress={() => onOpenComments()}');
  });
  it('шторка и вход в неё живы: PackCommentsSheet подключён из экрана набора', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'app/community_packs/PackCommentsSheet.tsx'))).toBe(true);
    expect(read('app/community_packs/CommunityPackSocialBar.tsx')).toContain('onOpenComments(pack.id)');
  });
});
