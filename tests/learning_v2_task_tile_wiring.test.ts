// зачем (владелец 21.10, эталон экзамена): плитка ответа (Lv2Option) и блок разбора (Lv2Explain) берут вид ТОЛЬКО из общих токенов —
// иначе «Дизайн» и «Темы» снова разойдутся. Сторож смотрит исходник, не рендер.
import { readSource } from './helpers/read_source';

describe('Lv2Option / Lv2Explain на токенах эталона экзамена', () => {
  const src = readSource('components/learning-v2/LearningV2Glass.tsx');
  const option = src.slice(src.indexOf('export const Lv2Option'), src.indexOf('export const Lv2Cta'));
  const explain = src.slice(src.indexOf('export const Lv2Explain'), src.indexOf('const styles = StyleSheet.create'));

  it('плитка берёт заливку, цвет, линию и тень из lv2TaskTileLook', () => {
    expect(option).toContain('lv2TaskTileLook(g,');
    expect(option).toContain('boxShadow: look.boxShadow');
    expect(option).not.toContain('raisedBoxShadow');
    expect(option).not.toContain('g.badSoft');
    expect(option).not.toContain('g.plateFillFrom');
  });

  it('блок разбора — lv2TaskVerdictBlockLook, без рамки и без карточной тени', () => {
    expect(explain).toContain('lv2TaskVerdictBlockLook(g,');
    expect(explain).not.toContain('lv2CardStyle');
    expect(explain).not.toMatch(/borderWidth|borderColor/);
  });
});
