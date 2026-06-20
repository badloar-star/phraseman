// Секция QA-панели: модалки получения карточки «Сокровищницы» (дроп в коллекцию).
// Открывает CollectibleDropModal с мок-outcome по каждой редкости + случай
// «сет собран» (секретка + бонус-осколки). Только превью: ничего не начисляет,
// claim-запросы не уходят — собираем outcome из каталога локально.
import React, { useMemo, useState } from 'react';
import { useLang } from '../../LangContext';
import CollectibleDropModal from '../../CollectibleDropModal';
import {
  COLLECTIBLE_RARITY_LABEL_RU,
  COLLECTIBLE_RARITY_LABELS,
  COLLECTIBLE_RARITY_ORDER,
  COLLECTIBLE_SETS,
  collectibleSetTitleForLang,
  type CollectibleRarity,
} from '../../../app/collectibles/catalog';
import { triLang } from '../../../constants/i18n';
import type { CollectibleDropOutcome } from '../../../app/collectibles/storage';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

type DropPreset = {
  key: string;
  icon: string;
  label: string;
  sub: string;
  outcome: CollectibleDropOutcome;
};

/** Первая карточка указанной редкости + её сет (для мок-outcome дропа). */
function findFirstCardByRarity(rarity: CollectibleRarity): { setId: string; cardId: string } | null {
  for (const set of COLLECTIBLE_SETS) {
    const card = set.cards.find((c) => c.rarity === rarity);
    if (card) return { setId: set.setId, cardId: card.id };
  }
  return null;
}

const RARITY_ICON: Record<CollectibleRarity, string> = {
  common: 'ellipse-outline',
  rare: 'water-outline',
  epic: 'diamond-outline',
  legendary: 'star-outline',
};

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function CollectibleDropModalsSection({ open, onToggle }: Props) {
  const { lang } = useLang();
  const [outcome, setOutcome] = useState<CollectibleDropOutcome | null>(null);

  const presets = useMemo<DropPreset[]>(() => {
    const list: DropPreset[] = [];

    for (const rarity of COLLECTIBLE_RARITY_ORDER) {
      const hit = findFirstCardByRarity(rarity);
      if (!hit) continue;
      const rarityLabelRu = COLLECTIBLE_RARITY_LABEL_RU[rarity];
      const labelEs = COLLECTIBLE_RARITY_LABELS[rarity]?.es ?? rarityLabelRu;
      const rarityLabel = String(COLLECTIBLE_RARITY_LABELS[rarity]?.[lang] ?? labelEs);
      list.push({
        key: `drop_${rarity}`,
        icon: RARITY_ICON[rarity],
        label: triLang(lang, {
          ru: `Карточка — ${rarityLabelRu}`,
          uk: `Картка — ${rarityLabel}`,
          es: `Carta — ${rarityLabel}`,
          'pt-BR': `Carta — ${rarityLabel}`,
          vi: `Thẻ — ${rarityLabel}`,
          id: `Kartu — ${rarityLabel}`,
          tr: `Kart — ${rarityLabel}`,
          pl: `Karta — ${rarityLabel}`,
        }),
        sub: triLang(lang, {
          ru: `Обычный дроп редкости «${rarity}» с анимацией яруса.`,
          uk: `Звичайний дроп рідкості «${rarity}» з анімацією ярусу.`,
          es: `Drop normal de rareza «${rarity}» con animación de nivel.`,
          'pt-BR': `Drop normal de raridade «${rarity}» com animação de camada.`,
          vi: `Drop thường của độ hiếm «${rarity}» với hoạt ảnh theo tầng.`,
          id: `Drop biasa untuk kelangkaan «${rarity}» dengan animasi tier.`,
          tr: `«${rarity}» nadirliğinde normal drop ve kademe animasyonu.`,
          pl: `Zwykły drop rzadkości «${rarity}» z animacją poziomu.`,
        }),
        outcome: {
          cardId: hit.cardId,
          setId: hit.setId,
          rarity,
          setCompleted: false,
          secretCardId: null,
          bonusShards: 0,
        },
      });
    }

    // Случай «сет собран»: последняя карточка сета закрывает набор, открывается
    // секретка и капают бонус-осколки — особый блок внутри модалки.
    const setWithSecret = COLLECTIBLE_SETS.find((s) => s.cards.length > 0 && s.secret);
    if (setWithSecret) {
      const lastCard = setWithSecret.cards[setWithSecret.cards.length - 1];
      const setTitle = collectibleSetTitleForLang(setWithSecret, lang);
      list.push({
        key: 'drop_set_completed',
        icon: 'trophy-outline',
        label: triLang(lang, {
          ru: 'Сет собран + секретка',
          uk: 'Сет зібрано + секретка',
          es: 'Set completo + carta secreta',
          'pt-BR': 'Conjunto completo + carta secreta',
          vi: 'Đủ bộ + thẻ bí mật',
          id: 'Set lengkap + kartu rahasia',
          tr: 'Set tamam + gizli kart',
          pl: 'Komplet + sekretna karta',
        }),
        sub: triLang(lang, {
          ru: `«${setWithSecret.titleRu}» закрыт: блок «Сет собран», секретная карточка, +15 осколков.`,
          uk: `«${setTitle}» закрито: блок «Сет зібрано», секретна картка, +15 уламків.`,
          es: `«${setTitle}» completado: bloque «Set completo», carta secreta, +15 fragmentos.`,
          'pt-BR': `«${setTitle}» concluído: bloco «Conjunto completo», carta secreta, +15 fragmentos.`,
          vi: `«${setTitle}» đã hoàn tất: khối «Đủ bộ», thẻ bí mật, +15 mảnh.`,
          id: `«${setTitle}» selesai: blok «Set lengkap», kartu rahasia, +15 pecahan.`,
          tr: `«${setTitle}» tamamlandı: «Set tamam» bloğu, gizli kart, +15 parça.`,
          pl: `«${setTitle}» zamknięty: blok «Komplet», sekretna karta, +15 odłamków.`,
        }),
        outcome: {
          cardId: lastCard.id,
          setId: setWithSecret.setId,
          rarity: lastCard.rarity,
          setCompleted: true,
          secretCardId: setWithSecret.secret.id,
          bonusShards: 15,
        },
      });
    }

    return list;
  }, [lang]);

  return (
    <AccordionSection
      id="collectible_drop_modals"
      icon="albums-outline"
      title={triLang(lang, {
        ru: 'Модалки получения карточки (коллекция)',
        uk: 'Модалки отримання картки (колекція)',
        es: 'Modales de carta recibida (colección)',
        'pt-BR': 'Modais de carta recebida (coleção)',
        vi: 'Modal nhận thẻ (bộ sưu tập)',
        id: 'Modal kartu didapat (koleksi)',
        tr: 'Kart kazanma modalları (koleksiyon)',
        pl: 'Modale zdobycia karty (kolekcja)',
      })}
      badge={presets.length}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        {triLang(lang, {
          ru: 'Окно «Новая карточка!» Сокровищницы — сюрприз после активности. Превью каждой редкости и случай «сет собран». Только просмотр: карточка в коллекцию не пишется, осколки не начисляются.',
          uk: 'Вікно «Нова картка!» Скарбниці — сюрприз після активності. Превʼю кожної рідкості й випадок «сет зібрано». Лише перегляд: картка в колекцію не пишеться, уламки не нараховуються.',
          es: 'La ventana «¡Nueva carta!» de la Tesorería aparece como sorpresa después de la actividad. Vista previa de cada rareza y del caso «set completo». Solo vista: no se guarda la carta ni se añaden fragmentos.',
          'pt-BR': 'A janela «Nova carta!» da Tesouraria aparece como surpresa depois da atividade. Prévia de cada raridade e do caso «conjunto completo». Só visualização: a carta não é salva e os fragmentos não são creditados.',
          vi: 'Cửa sổ «Thẻ mới!» của Kho báu là phần bất ngờ sau hoạt động. Xem trước từng độ hiếm và trường hợp «đủ bộ». Chỉ xem trước: thẻ không được ghi vào bộ sưu tập, mảnh không được cộng.',
          id: 'Jendela «Kartu baru!» dari Perbendaharaan adalah kejutan setelah aktivitas. Pratinjau tiap kelangkaan dan kasus «set lengkap». Hanya pratinjau: kartu tidak ditulis ke koleksi, pecahan tidak ditambahkan.',
          tr: 'Hazine’deki «Yeni kart!» penceresi etkinlikten sonra çıkan sürprizdir. Her nadirlik ve «set tamam» durumu önizlenir. Sadece önizleme: kart koleksiyona yazılmaz, parçalar eklenmez.',
          pl: 'Okno «Nowa karta!» ze Skarbca to niespodzianka po aktywności. Podgląd każdej rzadkości i przypadku «komplet». Tylko podgląd: karta nie trafia do kolekcji, odłamki nie są naliczane.',
        })}
      </AdminHint>
      {presets.map((preset) => (
        <ButtonRow
          key={preset.key}
          testID={`admin-collectible-${preset.key}`}
          icon={preset.icon}
          label={preset.label}
          sub={preset.sub}
          onPress={() => setOutcome(preset.outcome)}
        />
      ))}

      <CollectibleDropModal
        outcome={outcome}
        onClose={() => setOutcome(null)}
        onOpenCollection={() => {
          setOutcome(null);
          qaToast('info', triLang(lang, {
            ru: 'Переход «В коллекцию» — отключён в превью',
            uk: 'Перехід «До колекції» — вимкнений у превʼю',
            es: 'La acción «A la colección» está desactivada en la vista previa',
            'pt-BR': 'A ação «Para a coleção» está desativada na prévia',
            vi: 'Thao tác «Vào bộ sưu tập» bị tắt trong bản xem trước',
            id: 'Aksi «Ke koleksi» dinonaktifkan di pratinjau',
            tr: '«Koleksiyona git» işlemi önizlemede kapalı',
            pl: 'Akcja «Do kolekcji» jest wyłączona w podglądzie',
          }));
        }}
      />
    </AccordionSection>
  );
}
