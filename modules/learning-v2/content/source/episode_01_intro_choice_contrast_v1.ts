export type Episode01IntroLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
export type Episode01IntroKind = 'concept' | 'formula' | 'trap';

/**
 * Adds an exact comparison of the three authored answers. This is not generic
 * feedback: every sentence names the concrete alternatives shown on that page.
 */
export function episode01IntroChoiceContrast(
  locale: Episode01IntroLocale,
  kind: Episode01IntroKind,
  choices: readonly [string, string, string],
): string {
  const [correct, wrongOne, wrongTwo] = choices;
  const copy: Record<Episode01IntroLocale, Record<Episode01IntroKind, string>> = {
    ru: {
      concept: `«${correct}» — точный факт; «${wrongOne}» — другая форма; «${wrongTwo}» — другие роли слов.`,
      formula: `«${correct}» — верно; «${wrongOne}» ломает форму; «${wrongTwo}» — порядок.`,
      trap: `«${correct}» — без ловушки; «${wrongOne}» и «${wrongTwo}» показывают две описанные ошибки.`,
    },
    uk: {
      concept: `«${correct}» — точний факт; «${wrongOne}» — інша форма; «${wrongTwo}» — інші ролі слів.`,
      formula: `«${correct}» — правильно; «${wrongOne}» ламає форму; «${wrongTwo}» — порядок.`,
      trap: `«${correct}» — без пастки; «${wrongOne}» і «${wrongTwo}» показують дві описані помилки.`,
    },
    es: {
      concept: `«${correct}»: hecho exacto; «${wrongOne}»: otra forma; «${wrongTwo}»: otra función.`,
      formula: `«${correct}»: correcto; «${wrongOne}»: forma rota; «${wrongTwo}»: orden roto.`,
      trap: `«${correct}»: sin trampa; «${wrongOne}» y «${wrongTwo}»: los dos errores descritos.`,
    },
    'pt-BR': {
      concept: `«${correct}»: fato exato; «${wrongOne}»: outra forma; «${wrongTwo}»: outra função.`,
      formula: `«${correct}»: correto; «${wrongOne}»: forma errada; «${wrongTwo}»: ordem errada.`,
      trap: `«${correct}»: sem armadilha; «${wrongOne}» e «${wrongTwo}»: os dois erros descritos.`,
    },
    vi: {
      concept: `“${correct}”: đúng sự việc; “${wrongOne}”: khác dạng; “${wrongTwo}”: khác vai trò.`,
      formula: `“${correct}”: đúng; “${wrongOne}”: sai dạng; “${wrongTwo}”: sai thứ tự.`,
      trap: `“${correct}”: tránh bẫy; “${wrongOne}” và “${wrongTwo}”: hai lỗi đã nêu.`,
    },
    id: {
      concept: `“${correct}”: fakta tepat; “${wrongOne}”: bentuk lain; “${wrongTwo}”: fungsi lain.`,
      formula: `“${correct}”: tepat; “${wrongOne}”: salah bentuk; “${wrongTwo}”: salah urutan.`,
      trap: `“${correct}”: bebas jebakan; “${wrongOne}” dan “${wrongTwo}”: dua kesalahan tadi.`,
    },
    tr: {
      concept: `«${correct}»: doğru olgu; «${wrongOne}»: başka biçim; «${wrongTwo}»: başka görev.`,
      formula: `«${correct}»: doğru; «${wrongOne}»: biçim hatası; «${wrongTwo}»: sıra hatası.`,
      trap: `«${correct}»: tuzaksız; «${wrongOne}» ve «${wrongTwo}»: açıklanan iki hata.`,
    },
    pl: {
      concept: `„${correct}”: właściwy fakt; „${wrongOne}”: inna forma; „${wrongTwo}”: inna rola.`,
      formula: `„${correct}”: dobrze; „${wrongOne}”: zła forma; „${wrongTwo}”: zły szyk.`,
      trap: `„${correct}”: bez pułapki; „${wrongOne}” i „${wrongTwo}”: dwa opisane błędy.`,
    },
  };
  return copy[locale][kind];
}
