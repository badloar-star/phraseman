(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var KNOWLY_I18N = {
    'Knowly': {
      es: 'Knowly',
      'pt-BR': 'Knowly',
      vi: 'Knowly',
      id: 'Knowly',
      tr: 'Knowly',
      pl: 'Knowly',
    },
    'estudio móvil': {
      es: 'estudio móvil',
      'pt-BR': 'estúdio móvel',
      vi: 'studio di động',
      id: 'studio seluler',
      tr: 'mobil stüdyo',
      pl: 'studio mobilne',
    },
    'Principal': {
      es: 'Principal',
      'pt-BR': 'Principal',
      vi: 'Chính',
      id: 'Utama',
      tr: 'Ana',
      pl: 'Główne',
    },
    'Inicio': {
      es: 'Inicio',
      'pt-BR': 'Início',
      vi: 'Trang chủ',
      id: 'Beranda',
      tr: 'Ana sayfa',
      pl: 'Strona główna',
    },
    'Apps ▾': {
      es: 'Apps ▾',
      'pt-BR': 'Apps ▾',
      vi: 'Ứng dụng ▾',
      id: 'Aplikasi ▾',
      tr: 'Uygulamalar ▾',
      pl: 'Aplikacje ▾',
    },
    'Apps': {
      es: 'Apps',
      'pt-BR': 'Apps',
      vi: 'Ứng dụng',
      id: 'Aplikasi',
      tr: 'Uygulamalar',
      pl: 'Aplikacje',
    },
    'PhraseMan — descarga': {
      es: 'PhraseMan — descarga',
      'pt-BR': 'PhraseMan — download',
      vi: 'PhraseMan — tải xuống',
      id: 'PhraseMan — unduh',
      tr: 'PhraseMan — indir',
      pl: 'PhraseMan — pobierz',
    },
    'PhraseMan — descargar': {
      es: 'PhraseMan — descargar',
      'pt-BR': 'PhraseMan — baixar',
      vi: 'PhraseMan — tải xuống',
      id: 'PhraseMan — unduh',
      tr: 'PhraseMan — indir',
      pl: 'PhraseMan — pobierz',
    },
    'Descargar PhraseMan': {
      es: 'Descargar PhraseMan',
      'pt-BR': 'Baixar PhraseMan',
      vi: 'Tải PhraseMan',
      id: 'Unduh PhraseMan',
      tr: 'PhraseMan’i indir',
      pl: 'Pobierz PhraseMan',
    },
    'Privacidad': {
      es: 'Privacidad',
      'pt-BR': 'Privacidade',
      vi: 'Quyền riêng tư',
      id: 'Privasi',
      tr: 'Gizlilik',
      pl: 'Prywatność',
    },
    'Términos': {
      es: 'Términos',
      'pt-BR': 'Termos',
      vi: 'Điều khoản',
      id: 'Ketentuan',
      tr: 'Şartlar',
      pl: 'Regulamin',
    },
    'Contacto': {
      es: 'Contacto',
      'pt-BR': 'Contato',
      vi: 'Liên hệ',
      id: 'Kontak',
      tr: 'İletişim',
      pl: 'Kontakt',
    },
    'Contacto para apps': {
      es: 'Contacto para apps',
      'pt-BR': 'Contato para apps',
      vi: 'Liên hệ về ứng dụng',
      id: 'Kontak untuk aplikasi',
      tr: 'Uygulamalar için iletişim',
      pl: 'Kontakt w sprawie aplikacji',
    },
    'Ir a la tienda': {
      es: 'Ir a la tienda',
      'pt-BR': 'Ir para a loja',
      vi: 'Mở cửa hàng',
      id: 'Buka toko',
      tr: 'Mağazaya git',
      pl: 'Przejdź do sklepu',
    },
    'Menú': {
      es: 'Menú',
      'pt-BR': 'Menu',
      vi: 'Menu',
      id: 'Menu',
      tr: 'Menü',
      pl: 'Menu',
    },
    'Documentos': {
      es: 'Documentos',
      'pt-BR': 'Documentos',
      vi: 'Tài liệu',
      id: 'Dokumen',
      tr: 'Belgeler',
      pl: 'Dokumenty',
    },
    'Más': {
      es: 'Más',
      'pt-BR': 'Mais',
      vi: 'Thêm',
      id: 'Lainnya',
      tr: 'Diğer',
      pl: 'Więcej',
    },
    'Más apps próximamente': {
      es: 'Más apps próximamente',
      'pt-BR': 'Mais apps em breve',
      vi: 'Sắp có thêm ứng dụng',
      id: 'Aplikasi lain segera hadir',
      tr: 'Yakında daha fazla uygulama',
      pl: 'Więcej aplikacji wkrótce',
    },
    'Noticias': {
      es: 'Noticias',
      'pt-BR': 'Notícias',
      vi: 'Tin tức',
      id: 'Berita',
      tr: 'Haberler',
      pl: 'Aktualności',
    },
    'Contactar': {
      es: 'Contactar',
      'pt-BR': 'Entrar em contato',
      vi: 'Liên hệ',
      id: 'Hubungi',
      tr: 'İletişime geç',
      pl: 'Skontaktuj się',
    },
    'Descargar PhraseMan — iOS y Android': {
      es: 'Descargar PhraseMan — iOS y Android',
      'pt-BR': 'Baixar PhraseMan — iOS e Android',
      vi: 'Tải PhraseMan — iOS và Android',
      id: 'Unduh PhraseMan — iOS dan Android',
      tr: 'PhraseMan’i indir — iOS ve Android',
      pl: 'Pobierz PhraseMan — iOS i Android',
    },
    'Descarga': {
      es: 'Descarga',
      'pt-BR': 'Download',
      vi: 'Tải xuống',
      id: 'Unduhan',
      tr: 'İndir',
      pl: 'Pobierz',
    },
    'Descargar': {
      es: 'Descargar',
      'pt-BR': 'Baixar',
      vi: 'Tải xuống',
      id: 'Unduh',
      tr: 'İndir',
      pl: 'Pobierz',
    },
    'La app de Knowly para iPhone y Android.': {
      es: 'La app de Knowly para iPhone y Android.',
      'pt-BR': 'O app da Knowly para iPhone e Android.',
      vi: 'Ứng dụng của Knowly cho iPhone và Android.',
      id: 'Aplikasi Knowly untuk iPhone dan Android.',
      tr: 'Knowly’nin iPhone ve Android uygulaması.',
      pl: 'Aplikacja Knowly na iPhone’a i Androida.',
    },
    'Descargar en App Store': {
      es: 'Descargar en App Store',
      'pt-BR': 'Baixar na App Store',
      vi: 'Tải về trên App Store',
      id: 'Unduh di App Store',
      tr: 'App Store’dan indir',
      pl: 'Pobierz z App Store',
    },
    'Disponible en Google Play': {
      es: 'Disponible en Google Play',
      'pt-BR': 'Disponível no Google Play',
      vi: 'Có trên Google Play',
      id: 'Tersedia di Google Play',
      tr: 'Google Play’de mevcut',
      pl: 'Dostępne w Google Play',
    },
    'Código QR de la página de descarga': {
      es: 'Código QR de la página de descarga',
      'pt-BR': 'Código QR da página de download',
      vi: 'Mã QR của trang tải xuống',
      id: 'Kode QR halaman unduhan',
      tr: 'İndirme sayfasının QR kodu',
      pl: 'Kod QR strony pobierania',
    },
    'Código QR del enlace de descarga': {
      es: 'Código QR del enlace de descarga',
      'pt-BR': 'Código QR do link de download',
      vi: 'Mã QR của liên kết tải xuống',
      id: 'Kode QR tautan unduhan',
      tr: 'İndirme bağlantısının QR kodu',
      pl: 'Kod QR linku pobierania',
    },
    'Abrir la página': {
      es: 'Abrir la página',
      'pt-BR': 'Abrir a página',
      vi: 'Mở trang',
      id: 'Buka halaman',
      tr: 'Sayfayı aç',
      pl: 'Otwórz stronę',
    },
    'Contacto y comentarios — Knowly · PhraseMan': {
      es: 'Contacto y comentarios — Knowly · PhraseMan',
      'pt-BR': 'Contato e feedback — Knowly · PhraseMan',
      vi: 'Liên hệ và góp ý — Knowly · PhraseMan',
      id: 'Kontak dan masukan — Knowly · PhraseMan',
      tr: 'İletişim ve geri bildirim — Knowly · PhraseMan',
      pl: 'Kontakt i opinie — Knowly · PhraseMan',
    },
    'Contacto y comentarios': {
      es: 'Contacto y comentarios',
      'pt-BR': 'Contato e feedback',
      vi: 'Liên hệ và góp ý',
      id: 'Kontak dan masukan',
      tr: 'İletişim ve geri bildirim',
      pl: 'Kontakt i opinie',
    },
    'Escribe qué quieres contarnos o preguntar y deja un email de respuesta. Leeremos el mensaje y nos pondremos en contacto contigo.': {
      es: 'Escribe qué quieres contarnos o preguntar y deja un email de respuesta. Leeremos el mensaje y nos pondremos en contacto contigo.',
      'pt-BR': 'Escreva o que você quer nos contar ou perguntar e deixe um email para resposta. Vamos ler a mensagem e entrar em contato.',
      vi: 'Hãy viết điều bạn muốn chia sẻ hoặc hỏi và để lại email để chúng tôi trả lời. Chúng tôi sẽ đọc tin nhắn và liên hệ lại với bạn.',
      id: 'Tulis hal yang ingin Anda sampaikan atau tanyakan dan tinggalkan email untuk balasan. Kami akan membaca pesan dan menghubungi Anda.',
      tr: 'Bize ne söylemek ya da sormak istediğinizi yazın ve yanıt için bir e-posta bırakın. Mesajı okuyup sizinle iletişime geçeceğiz.',
      pl: 'Napisz, co chcesz nam przekazać lub o co zapytać, i zostaw e-mail do odpowiedzi. Przeczytamy wiadomość i skontaktujemy się z Tobą.',
    },
    'Empresa': {
      es: 'Empresa',
      'pt-BR': 'Empresa',
      vi: 'Công ty',
      id: 'Perusahaan',
      tr: 'Şirket',
      pl: 'Firma',
    },
    'Nombre (opcional)': {
      es: 'Nombre (opcional)',
      'pt-BR': 'Nome (opcional)',
      vi: 'Tên (không bắt buộc)',
      id: 'Nama (opsional)',
      tr: 'Ad (isteğe bağlı)',
      pl: 'Imię (opcjonalnie)',
    },
    'Email para responder *': {
      es: 'Email para responder *',
      'pt-BR': 'Email para resposta *',
      vi: 'Email để trả lời *',
      id: 'Email untuk balasan *',
      tr: 'Yanıt için e-posta *',
      pl: 'E-mail do odpowiedzi *',
    },
    'Tema': {
      es: 'Tema',
      'pt-BR': 'Assunto',
      vi: 'Chủ đề',
      id: 'Topik',
      tr: 'Konu',
      pl: 'Temat',
    },
    'Soporte': {
      es: 'Soporte',
      'pt-BR': 'Suporte',
      vi: 'Hỗ trợ',
      id: 'Dukungan',
      tr: 'Destek',
      pl: 'Pomoc',
    },
    'Comentario': {
      es: 'Comentario',
      'pt-BR': 'Feedback',
      vi: 'Góp ý',
      id: 'Masukan',
      tr: 'Geri bildirim',
      pl: 'Opinia',
    },
    'Pregunta legal': {
      es: 'Pregunta legal',
      'pt-BR': 'Pergunta jurídica',
      vi: 'Câu hỏi pháp lý',
      id: 'Pertanyaan hukum',
      tr: 'Hukuki soru',
      pl: 'Pytanie prawne',
    },
    'Otro': {
      es: 'Otro',
      'pt-BR': 'Outro',
      vi: 'Khác',
      id: 'Lainnya',
      tr: 'Diğer',
      pl: 'Inne',
    },
    'Mensaje *': {
      es: 'Mensaje *',
      'pt-BR': 'Mensagem *',
      vi: 'Tin nhắn *',
      id: 'Pesan *',
      tr: 'Mesaj *',
      pl: 'Wiadomość *',
    },
    'Describe tu pregunta o idea (al menos 10 caracteres)': {
      es: 'Describe tu pregunta o idea (al menos 10 caracteres)',
      'pt-BR': 'Descreva sua pergunta ou ideia (pelo menos 10 caracteres)',
      vi: 'Mô tả câu hỏi hoặc ý tưởng của bạn (ít nhất 10 ký tự)',
      id: 'Jelaskan pertanyaan atau ide Anda (minimal 10 karakter)',
      tr: 'Sorunuzu veya fikrinizi açıklayın (en az 10 karakter)',
      pl: 'Opisz pytanie lub pomysł (co najmniej 10 znaków)',
    },
    'Enviar': {
      es: 'Enviar',
      'pt-BR': 'Enviar',
      vi: 'Gửi',
      id: 'Kirim',
      tr: 'Gönder',
      pl: 'Wyślij',
    },
    'Knowly — estudio · formulario de contacto para apps': {
      es: 'Knowly — estudio · formulario de contacto para apps',
      'pt-BR': 'Knowly — estúdio · formulário de contato para apps',
      vi: 'Knowly — studio · biểu mẫu liên hệ cho ứng dụng',
      id: 'Knowly — studio · formulir kontak aplikasi',
      tr: 'Knowly — stüdyo · uygulamalar için iletişim formu',
      pl: 'Knowly — studio · formularz kontaktowy aplikacji',
    },
    'Estudio móvil.': {
      es: 'Estudio móvil.',
      'pt-BR': 'Estúdio móvel.',
      vi: 'Studio di động.',
      id: 'Studio seluler.',
      tr: 'Mobil stüdyo.',
      pl: 'Studio mobilne.',
    },
    'claridad · honestidad · personas': {
      es: 'claridad · honestidad · personas',
      'pt-BR': 'clareza · honestidade · pessoas',
      vi: 'rõ ràng · trung thực · con người',
      id: 'kejelasan · kejujuran · manusia',
      tr: 'açıklık · dürüstlük · insanlar',
      pl: 'jasność · uczciwość · ludzie',
    },
    'Código QR y todos los enlaces': {
      es: 'Código QR y todos los enlaces',
      'pt-BR': 'Código QR e todos os links',
      vi: 'Mã QR và tất cả liên kết',
      id: 'Kode QR dan semua tautan',
      tr: 'QR kodu ve tüm bağlantılar',
      pl: 'Kod QR i wszystkie linki',
    },
    'Formulario de contacto': {
      es: 'Formulario de contacto',
      'pt-BR': 'Formulário de contato',
      vi: 'Biểu mẫu liên hệ',
      id: 'Formulir kontak',
      tr: 'İletişim formu',
      pl: 'Formularz kontaktowy',
    },
    'Menú inferior': {
      es: 'Menú inferior',
      'pt-BR': 'Menu inferior',
      vi: 'Menu dưới',
      id: 'Menu bawah',
      tr: 'Alt menü',
      pl: 'Dolne menu',
    },
  };

  function resolveLocale() {
    var locale = new URLSearchParams(window.location.search).get('lang') || navigator.language || '';
    var normalized = String(locale).toLowerCase();
    if (normalized.startsWith('pt')) return 'pt-BR';
    if (normalized.startsWith('vi')) return 'vi';
    if (normalized.startsWith('id')) return 'id';
    if (normalized.startsWith('tr')) return 'tr';
    if (normalized.startsWith('pl')) return 'pl';
    if (normalized.startsWith('es')) return 'es';
    return '';
  }

  function translate(value, lang) {
    var row = KNOWLY_I18N[value];
    return (row && row[lang]) || value;
  }

  function applyHtmlLocale() {
    var lang = resolveLocale();
    if (!lang) return;
    document.documentElement.lang = lang;
    qsa('[data-i18n-es]').forEach(function (node) {
      var value = node.getAttribute('data-i18n-es') || node.textContent;
      value = translate(value, lang);
      if (node.hasAttribute('placeholder')) {
        node.setAttribute('placeholder', value);
        return;
      }
      node.textContent = value;
    });
    qsa('[data-i18n-es-aria]').forEach(function (node) {
      var value = node.getAttribute('data-i18n-es-aria') || node.getAttribute('aria-label') || '';
      node.setAttribute('aria-label', translate(value, lang));
    });
    qsa('[data-i18n-es-alt]').forEach(function (node) {
      var value = node.getAttribute('data-i18n-es-alt') || node.getAttribute('alt') || '';
      node.setAttribute('alt', translate(value, lang));
    });
  }

  applyHtmlLocale();

  /** PhraseMan dropdown (desktop) */
  var dd = qs('.km-dd');
  var ddBtn = qs('.km-dd-btn');
  if (dd && ddBtn) {
    ddBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      dd.classList.remove('open');
    });
    qsa('.km-dd-panel a').forEach(function (a) {
      a.addEventListener('click', function () {
        dd.classList.remove('open');
      });
    });
  }

  var overlay = qs('#km-overlay');
  var drawer = qs('#km-drawer');
  var burger = qs('#km-burger');

  function closeDrawer() {
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
  function openDrawer() {
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (drawer && drawer.classList.contains('open')) closeDrawer();
      else openDrawer();
    });
  }
  if (overlay) overlay.addEventListener('click', closeDrawer);

  qsa('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });
})();
