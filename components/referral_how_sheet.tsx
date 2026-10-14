/**
 * ReferralHowSheet — шит «Как это работает» поверх экрана «Награда за друга».
 *
 * зачем: владелец убрал отдельный экран-объяснялку (/roulette_about) — три шага
 * и правила живут шитом по кнопке «?» на едином экране рефералов. Тексты
 * перенесены из roulette_about без изменения смысла (никаких обещаний
 * конкретных дней — «Plus от 1 дня до 365 дней»).
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: шит «Код от друга» на токенах стекла (overlays-more, ReferralCodeSheet)
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ReferralSheetShell from './referral_sheet_shell';

function makeL(lang: Lang) {
  return (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

interface ReferralHowSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReferralHowSheet({ visible, onClose }: ReferralHowSheetProps) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const steps: readonly { title: string; text: string }[] = [
    {
      title: L('Пригласи друга', 'Запроси друга', 'Invite a friend', 'Invita a un amigo', 'Convide um amigo', 'Mời một người bạn', 'Undang teman', 'Bir arkadaşını davet et', 'Zaproś znajomego'),
      text: L('Отправь другу свой код — он на этом экране.', 'Надішли другові свій код — він на цьому екрані.', 'Send your friend your code — it\'s on this screen.', 'Envía tu código a un amigo: está en esta pantalla.', 'Envie seu código a um amigo: está nesta tela.', 'Gửi mã của bạn cho bạn bè — mã ở ngay màn hình này.', 'Kirim kodemu ke teman — ada di layar ini.', 'Kodunu arkadaşına gönder — bu ekranda.', 'Wyślij znajomemu swój kod — jest na tym ekranie.'),
    },
    {
      title: L('Друг оформит Plus', 'Друг оформить Plus', 'Your friend subscribes to Plus', 'Tu amigo compra Plus', 'Seu amigo assina Plus', 'Bạn của bạn mua Plus', 'Temanmu membeli Plus', 'Arkadaşın Plus alır', 'Znajomy kupuje Plus'),
      text: L('Когда он введёт твой код и оформит Plus, ты получишь ключ.', 'Коли він введе твій код і оформить Plus, ти отримаєш ключ.', 'When they enter your code and subscribe to Plus, you get a key.', 'Cuando introduzca tu código y compre Plus, recibirás una llave.', 'Quando inserir seu código e assinar Plus, você recebe uma chave.', 'Khi họ nhập mã và mua Plus, bạn nhận một chìa khóa.', 'Saat memasukkan kodemu dan membeli Plus, kamu mendapat kunci.', 'Kodunu girip Plus satın aldığında bir anahtar kazanırsın.', 'Gdy wpisze twój kod i kupi Plus, dostaniesz klucz.'),
    },
    {
      title: L('Открой награду', 'Відкрий нагороду', 'Open the reward', 'Abre la recompensa', 'Abra a recompensa', 'Mở phần thưởng', 'Buka hadiah', 'Ödülü aç', 'Otwórz nagrodę'),
      text: L('Каждый ключ даёт Plus от 1 дня до 365 дней.', 'Кожен ключ дає Plus від 1 до 365 днів.', 'Each key gives Plus from 1 to 365 days.', 'Cada llave da entre 1 y 365 días de Plus.', 'Cada chave dá de 1 a 365 dias de Plus.', 'Mỗi chìa khóa nhận từ 1 đến 365 ngày Plus.', 'Setiap kunci memberi 1–365 hari Plus.', 'Her anahtar 1–365 gün Plus verir.', 'Każdy klucz daje od 1 do 365 dni Plus.'),
    },
  ];

  const rules: readonly string[] = [
    L('Сколько друзей оформит подписку — столько ключей ты получишь.', 'Скільки друзів оформить підписку — стільки ключів ти отримаєш.', 'You get one key for every friend who subscribes.', 'Recibes una llave por cada amigo que compre la suscripción.', 'Você recebe uma chave por cada amigo que assinar.', 'Bạn nhận một chìa khóa cho mỗi người bạn mua gói.', 'Kamu dapat satu kunci untuk setiap teman yang berlangganan.', 'Abone olan her arkadaş için bir anahtar kazanırsın.', 'Dostajesz klucz za każdego znajomego, który kupi subskrypcję.'),
    L('Выигрыш суммируется с текущим сроком Plus.', 'Виграш додається до поточного строку Plus.', 'The prize is added to your current Plus period.', 'El premio se suma a tu período Plus actual.', 'O prêmio é somado ao período Plus atual.', 'Phần thưởng được cộng vào thời hạn Plus hiện tại.', 'Hadiah ditambahkan ke masa Plus saat ini.', 'Ödül mevcut Plus sürene eklenir.', 'Nagroda dodaje się do obecnego okresu Plus.'),
    // зачем: владелец (2026-08-03) — «результат определяет сервер» читалось как
    // «крутилка ненастоящая, всё решено заранее». Смысл тот же (исход честный и
    // не подкручивается), но на языке игрока: приз выпадает случайно.
    L('Приз выпадает случайно — шанс есть у каждого ключа.', 'Приз випадає випадково — шанс є в кожного ключа.', 'The prize is random — every key has a chance.', 'El premio es aleatorio: cada llave tiene su oportunidad.', 'O prêmio é aleatório: cada chave tem sua chance.', 'Phần thưởng là ngẫu nhiên — mỗi chìa khóa đều có cơ hội.', 'Hadiah acak — setiap kunci punya peluang.', 'Ödül rastgele — her anahtarın şansı var.', 'Nagroda jest losowa — każdy klucz ma szansę.'),
  ];

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      testID="referral-how-sheet"
      title={L('Как это работает', 'Як це працює', 'How it works', 'Cómo funciona', 'Como funciona', 'Cách hoạt động', 'Cara kerjanya', 'Nasıl çalışır', 'Jak to działa')}
      closeLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
    >
      {/* зачем (overlays-more OM-REFERRAL-HOW): `.om-steps` — шаги через 14, кружок 28 с цифрой,
          название 16/700 и пояснение 13/18 (шкала D145); `.om-info` — плашка правил r16, 13/19. */}
      <View style={{ marginTop: 4 }}>
        <View style={{ gap: 14 }}>
          {steps.map((s, i) => (
            <View key={s.title} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.accent }}>
                <Text style={{ color: glass.accentInk, fontSize: 13, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: glass.text, fontSize: 16, lineHeight: 22, fontWeight: '700' }}>{s.title}</Text>
                <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400', marginTop: 3 }}>{s.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <View testID="referral-how-rules" style={{ marginTop: 13, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: glass.opaqueControl }}>
          <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 19, fontWeight: '400' }}>
            {rules.map((r) => `• ${r}`).join('\n')}
          </Text>
        </View>
      </View>
    </ReferralSheetShell>
  );
}
