// зачем (координатор 05.11 ~22:20): тексты шторки «Цвет под себя — с Plus» (макет theme_sliders_exact.html) на 9 языках — чистый модуль без React,
// чтобы страж проверял их без отрисовки. Читает AppearancePlusSheet.tsx.
export const APPEARANCE_PLUS_SHEET_TEXT = {
  title: { ru: 'Цвет под себя — с Plus', uk: 'Колір під себе — з Plus', en: 'Your own color — with Plus', es: 'Tu propio color — con Plus', 'pt-BR': 'Sua própria cor — com Plus', vi: 'Màu theo ý bạn — với Plus', id: 'Warna sesukamu — dengan Plus', tr: 'Kendi rengin — Plus ile', pl: 'Własny kolor — z Plus' },
  body: { ru: 'Оттенок и насыщенность меняют сцену, фон, карточки и кнопки.', uk: 'Відтінок і насиченість змінюють сцену, фон, картки й кнопки.', en: 'Hue and saturation change the scene, background, cards and buttons.', es: 'El tono y la saturación cambian la escena, el fondo, las tarjetas y los botones.', 'pt-BR': 'Matiz e saturação mudam a cena, o fundo, os cartões e os botões.', vi: 'Sắc độ và độ bão hòa thay đổi cảnh, nền, thẻ và nút.', id: 'Rona dan saturasi mengubah adegan, latar, kartu, dan tombol.', tr: 'Ton ve doygunluk sahneyi, arka planı, kartları ve düğmeleri değiştirir.', pl: 'Odcień i nasycenie zmieniają scenę, tło, karty i przyciski.' },
  cta: { ru: 'Открыть Plus', uk: 'Відкрити Plus', en: 'Open Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: "Plus'ı aç", pl: 'Otwórz Plus' },
  dismiss: { ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz' },
} as const;
