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
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ReferralSheetShell from './referral_sheet_shell';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

interface ReferralHowSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReferralHowSheet({ visible, onClose }: ReferralHowSheetProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const steps: readonly { title: string; text: string }[] = [
    {
      title: L('Пригласи друга', 'Запроси друга', 'Invita a un amigo', 'Convide um amigo', 'Mời một người bạn', 'Undang teman', 'Bir arkadaşını davet et', 'Zaproś znajomego'),
      text: L('Отправь другу свой код — он на этом экране.', 'Надішли другові свій код — він на цьому екрані.', 'Envía tu código a un amigo: está en esta pantalla.', 'Envie seu código a um amigo: está nesta tela.', 'Gửi mã của bạn cho bạn bè — mã ở ngay màn hình này.', 'Kirim kodemu ke teman — ada di layar ini.', 'Kodunu arkadaşına gönder — bu ekranda.', 'Wyślij znajomemu swój kod — jest na tym ekranie.'),
    },
    {
      title: L('Друг оформит Plus или Pro', 'Друг оформить Plus або Pro', 'Tu amigo compra Plus o Pro', 'Seu amigo assina Plus ou Pro', 'Bạn của bạn mua Plus hoặc Pro', 'Temanmu membeli Plus atau Pro', 'Arkadaşın Plus veya Pro alır', 'Znajomy kupuje Plus lub Pro'),
      text: L('Когда он введёт твой код и оформит Plus или Pro, ты получишь ключ.', 'Коли він введе твій код і оформить Plus або Pro, ти отримаєш ключ.', 'Cuando introduzca tu código y compre Plus o Pro, recibirás una llave.', 'Quando inserir seu código e assinar Plus ou Pro, você recebe uma chave.', 'Khi họ nhập mã và mua Plus hoặc Pro, bạn nhận một chìa khóa.', 'Saat memasukkan kodemu dan membeli Plus atau Pro, kamu mendapat kunci.', 'Kodunu girip Plus veya Pro satın aldığında bir anahtar kazanırsın.', 'Gdy wpisze twój kod i kupi Plus lub Pro, dostaniesz klucz.'),
    },
    {
      title: L('Открой награду', 'Відкрий нагороду', 'Abre la recompensa', 'Abra a recompensa', 'Mở phần thưởng', 'Buka hadiah', 'Ödülü aç', 'Otwórz nagrodę'),
      text: L('Каждый ключ даёт Plus от 1 дня до 365 дней.', 'Кожен ключ дає Plus від 1 до 365 днів.', 'Cada llave da entre 1 y 365 días de Plus.', 'Cada chave dá de 1 a 365 dias de Plus.', 'Mỗi chìa khóa nhận từ 1 đến 365 ngày Plus.', 'Setiap kunci memberi 1–365 hari Plus.', 'Her anahtar 1–365 gün Plus verir.', 'Każdy klucz daje od 1 do 365 dni Plus.'),
    },
  ];

  const rules: readonly string[] = [
    L('Сколько друзей оформит подписку — столько ключей ты получишь.', 'Скільки друзів оформить підписку — стільки ключів ти отримаєш.', 'Recibes una llave por cada amigo que compre la suscripción.', 'Você recebe uma chave por cada amigo que assinar.', 'Bạn nhận một chìa khóa cho mỗi người bạn mua gói.', 'Kamu dapat satu kunci untuk setiap teman yang berlangganan.', 'Abone olan her arkadaş için bir anahtar kazanırsın.', 'Dostajesz klucz za każdego znajomego, który kupi subskrypcję.'),
    L('Выигрыш суммируется с текущим сроком Plus.', 'Виграш додається до поточного строку Plus.', 'El premio se suma a tu período Plus actual.', 'O prêmio é somado ao período Plus atual.', 'Phần thưởng được cộng vào thời hạn Plus hiện tại.', 'Hadiah ditambahkan ke masa Plus saat ini.', 'Ödül mevcut Plus sürene eklenir.', 'Nagroda dodaje się do obecnego okresu Plus.'),
    // зачем: владелец (2026-08-03) — «результат определяет сервер» читалось как
    // «крутилка ненастоящая, всё решено заранее». Смысл тот же (исход честный и
    // не подкручивается), но на языке игрока: приз выпадает случайно.
    L('Приз выпадает случайно — шанс есть у каждого ключа.', 'Приз випадає випадково — шанс є в кожного ключа.', 'El premio es aleatorio: cada llave tiene su oportunidad.', 'O prêmio é aleatório: cada chave tem sua chance.', 'Phần thưởng là ngẫu nhiên — mỗi chìa khóa đều có cơ hội.', 'Hadiah acak — setiap kunci punya peluang.', 'Ödül rastgele — her anahtarın şansı var.', 'Nagroda jest losowa — każdy klucz ma szansę.'),
  ];

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      testID="referral-how-sheet"
      title={L('Как это работает', 'Як це працює', 'Cómo funciona', 'Como funciona', 'Cách hoạt động', 'Cara kerjanya', 'Nasıl çalışır', 'Jak to działa')}
      closeLabel={L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
    >
      <View style={{ gap: 14 }}>
        {steps.map((s, i) => (
          <View key={s.title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, marginTop: 1 }}>
              <Text style={{ color: t.correctText, fontSize: f.label ?? 12, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '700' }}>{s.title}</Text>
              <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, fontWeight: '400', marginTop: 2 }}>{s.text}</Text>
            </View>
          </View>
        ))}
        <View style={{ borderRadius: 14, padding: 12, gap: 6, backgroundColor: t.bgSurface }}>
          {rules.map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ color: t.accent, fontSize: f.sub ?? 13, fontWeight: '700' }}>•</Text>
              <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, fontWeight: '400', flex: 1 }}>{r}</Text>
            </View>
          ))}
        </View>
      </View>
    </ReferralSheetShell>
  );
}
