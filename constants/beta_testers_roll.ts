/** Благодарственный список бета-тестеров — данные только, без RN. См. `app/beta_testers.tsx`. */
export type BetaTesterEntry = {
  name: string;
  bio: string;
  bio_uk: string;
  bio_es: string;
};

export const BETA_TESTERS: BetaTesterEntry[] = [
  {
    name: 'Nadya123@123',
    bio: 'Первый и лучший бета-тестер PhraseMan. Находила баги раньше всех, давала детальную обратную связь на каждом этапе и помогла сделать приложение таким, каким оно стало. Настоящий MVP команды тестирования — №1 навсегда 🏆',
    bio_uk: 'Перший і найкращий бета-тестер PhraseMan. Знаходила баги раніше за всіх, давала детальний зворотній зв\'язок і допомогла зробити застосунок таким, яким він є. Справжній MVP команди тестування — №1 назавжди 🏆',
    bio_es: 'Primera y mejor probadora beta de PhraseMan. Encontró errores antes que nadie, dio un feedback muy detallado en cada fase y ayudó a dejar la aplicación como la tienes hoy. La auténtica MVP del equipo de pruebas: número 1 para siempre 🏆',
  },
  {
    name: 'Abridattelija',
    bio: 'Одна из самых ценных участниц бета-тестирования. Генерировала свежие идеи и нестандартные предложения, многие из которых были реализованы в приложении. Огромное спасибо!',
    bio_uk: 'Одна з найцінніших учасниць бета-тестування. Генерувала свіжі ідеї та нестандартні пропозиції, багато з яких було реалізовано в застосунку. Величезна подяка!',
    bio_es: 'Una de las participantes más valiosas de la beta. Aportaba ideas nuevas y propuestas poco típicas, muchas de las cuales se incorporaron a la aplicación. ¡Muchísimas gracias!',
  },
  {
    name: 'Franssuaza',
    bio: 'Внимательный и тщательный тестер. Скрупулёзно проверяла функционал и помогала находить неочевидные проблемы. Отличный вклад в развитие PhraseMan!',
    bio_uk: 'Уважний і ретельний тестер. Скрупульозно перевіряла функціонал і допомагала знаходити неочевидні проблеми. Чудовий внесок у розвиток PhraseMan!',
    bio_es: 'Tester meticuloso y muy cuidadosa. Revisó el funcionamiento con rigor y ayudó a detectar fallos que no saltaban a la vista. ¡Una contribución muy valiosa para PhraseMan!',
  },
  {
    name: 'Roz',
    bio: 'Активно тестировал приложение и регулярно давал полезные отзывы. Помог улучшить несколько ключевых моментов в PhraseMan!',
    bio_uk: 'Активно тестував застосунок і регулярно давав корисні відгуки. Допоміг покращити кілька ключових моментів у PhraseMan!',
    bio_es: 'Probó la app de forma muy activa y compartía comentarios útiles de manera constante. Contribuyó a mejorar varios aspectos clave de PhraseMan.',
  },
  {
    name: 'Евгений',
    bio: 'Добросовестный тестер, который уделил время тщательной проверке приложения. Спасибо за участие и помощь в улучшении качества!',
    bio_uk: 'Сумлінний тестер, який приділив час ретельній перевірці застосунку. Дякуємо за участь і допомогу в покращенні якості!',
    bio_es: 'Tester muy responsable que dedicó tiempo a revisar la app a fondo. Gracias por participar y por ayudar a mejorar la calidad.',
  },
  {
    name: 'Nina',
    bio: 'Тестировала приложение и делилась наблюдениями о работе функций. Спасибо за помощь и внимательность!',
    bio_uk: 'Тестувала застосунок і ділилась спостереженнями щодо роботи функцій. Дякуємо за допомогу і уважність!',
    bio_es: 'Probó la aplicación y compartía observaciones sobre cómo funcionaban las herramientas. ¡Gracias por tu ayuda y por el detalle en los informes!',
  },
  {
    name: 'Вячеслав',
    bio: 'Участвовал в бета-тестировании и помогал проверять работу приложения на разных устройствах. Спасибо за время и участие в проекте!',
    bio_uk: 'Брав участь у бета-тестуванні і допомагав перевіряти роботу застосунку на різних пристроях. Дякуємо за час і участь у проєкті!',
    bio_es: 'Participó en la beta y ayudó a comprobar el comportamiento en distintos dispositivos. Gracias por el tiempo invertido en el proyecto.',
  },
  {
    name: 'Dmitry',
    bio: 'Присоединился к тестированию и помог проверить базовый функционал приложения. Ценим каждый вклад в развитие PhraseMan!',
    bio_uk: 'Приєднався до тестування і допоміг перевірити базовий функціонал застосунку. Цінуємо кожен внесок у розвиток PhraseMan!',
    bio_es: 'Se sumó al testing y ayudó a validar las funciones básicas de la aplicación. Valoramos mucho cada grano de arena para mejorar PhraseMan.',
  },
  {
    name: 'Ptsmitt',
    bio: 'Полезный участник бета-тестирования, который помогал выявлять проблемы и улучшать приложение. Спасибо за вклад в развитие PhraseMan!',
    bio_uk: 'Корисний учасник бета-тестування, який допомагав виявляти проблеми та покращувати застосунок. Дякуємо за внесок у розвиток PhraseMan!',
    bio_es: 'Gran apoyo durante la beta: ayudaba a encontrar fallos y a pulir la app. ¡Gracias por tu papel en hacer crecer PhraseMan!',
  },
];
