// dialog_say_hints_copy.ts — подпись блока «Можно сказать…» на 9 языках.
// зачем (владелец 24.10): короткая подпись над фразами; ru — по слову владельца, остальные языки — черновик на вычитку 10 · ПЕРЕВОДЧИКУ.
type Lang9 = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const LABEL: Readonly<Record<Lang9, string>> = {
  ru: 'Можно сказать…',
  uk: 'Можна сказати…',
  en: 'You can say…',
  es: 'Puedes decir…',
  'pt-BR': 'Você pode dizer…',
  vi: 'Bạn có thể nói…',
  id: 'Kamu bisa bilang…',
  tr: 'Şunu diyebilirsin…',
  pl: 'Możesz powiedzieć…',
};

export function dialogSayHintsLabel(lang: string): string {
  return LABEL[lang as Lang9] ?? LABEL.en;
}
