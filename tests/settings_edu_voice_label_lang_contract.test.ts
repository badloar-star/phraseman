// зачем (координатор 12.10, 🟡 Ядра по 59ba4d58d): подпись голоса озвучки в «Обучении» зависит от ЯЗЫКА ИНТЕРФЕЙСА и списка голосов (voiceTitle).
// useFocusEffect с пустыми deps читал `lang` один раз при входе — после смены языка при открытом экране подпись оставалась старой до следующего открытия.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_edu.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('settings_edu: подпись голоса пересчитывается при смене языка интерфейса', () => {
  it('загрузка подписи — отдельный колбэк с зависимостью только от языка интерфейса', () => {
    expect(src).toContain('const loadVoiceValue = useCallback((reason: \'focus\' | \'lang_changed\') => {');
    expect(src).toContain('  }, [lang]);\n  const loadVoiceValueRef = useRef(loadVoiceValue);');
    // settings-gap-034 (13.10): компактная подпись — язык уже в названии строки «(EN)»
    expect(src).toContain('const next = match ? voiceTitle(match, lang, voices, { compact: true }) : null;');
  });

  it('фокус-эффект остаётся с пустыми deps: смена языка не перечитывает настройки и переключатели', () => {
    const start = src.indexOf('useFocusEffect(');
    const body = src.slice(start, src.indexOf('  // зачем (🟡 Ядра): язык интерфейса сменился', start));
    expect(body).toContain("loadVoiceValueRef.current('focus');");
    expect(body).toContain('    }, []),\n  );');
    expect(body).not.toContain('getVoicePrefs');
  });

  it('смена языка запускает пересчёт отдельным эффектом; на первом входе повтора нет (язык уже загружен фокус-эффектом)', () => {
    expect(src).toContain('if (voiceLoadedLangRef.current === lang) return;');
    expect(src).toContain("loadVoiceValue('lang_changed');\n  }, [lang, loadVoiceValue]);");
  });

  it('поздний ответ не затирает свежий: номер запроса; уход с экрана снимает ожидающий ответ; значение не меняет ссылку без нужды', () => {
    expect(src).toContain('const request = ++voiceRequestRef.current;');
    expect(src).toContain('if (request !== voiceRequestRef.current)');
    expect(src).toContain('voiceRequestRef.current += 1;');
    expect(src).toContain('setVoiceValue((prev) => (prev === next ? prev : next));');
  });

  it('журнал [SETTINGS-EDU]: причина загрузки, язык, число голосов, совпадение и итоговое значение; ошибки не немые', () => {
    expect(src).toContain('voice_value:load reason=${reason} lang=${lang} request=${request}');
    expect(src).toContain('voice_value:shown reason=${reason} lang=${lang} voices=${voices.length} matched=${match ? \'yes\' : \'no\'} value=${next ?? \'system\'}');
    expect(src).toContain('voice_value_load_failed');
  });
});
