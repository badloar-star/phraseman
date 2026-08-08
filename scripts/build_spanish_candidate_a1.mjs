import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank');
const WRITE = process.argv.includes('--write');
const POSITIONS = [
  0, 1, 2, 0, 3, 1, 3, 2, 0, 2,
  1, 3, 1, 0, 2, 0, 3, 1, 2, 3,
  2, 0, 3, 1, 0, 2, 1, 3, 2, 0,
  3, 1, 1, 3, 0, 2, 3, 0, 2, 1,
];

const d = (text, reasonRu) => ({ text, reasonRu });
const q = (skill, format, scenario, scenarioRu, prompt, instructionRu, stimulus, answer, distractors, explanation, explanationRu, targetConstruct, canDoRu) => ({
  skill, format, scenario, scenarioRu, prompt, instructionRu, stimulus, answer, distractors,
  explanation, explanationRu, targetConstruct, canDoRu,
});

const SPECS = [
  q('pragmatics', 'multiple-choice', 'Ordering a drink in a café', 'Заказ напитка в кафе', 'Choose the natural reply to the waiter.', 'Выберите естественный ответ официанту.', '—Buenos días. ¿Qué desea? —______', 'Un café, por favor.', [d('Son las nueve.', 'Фраза сообщает время и не называет заказ.'), d('Vivo cerca de aquí.', 'Фраза сообщает место жительства и не отвечает официанту.'), d('No tengo hermanos.', 'Фраза сообщает о семье и не относится к заказу.')], 'The polite order directly answers what the customer wants.', 'Вежливый заказ прямо сообщает, чего хочет посетитель.', 'polite ordering in a basic service encounter', 'Может вежливо заказать простой напиток в кафе.'),
  q('grammar', 'gap-fill', 'Stating your age', 'Сообщение своего возраста', 'Choose the form used to state age.', 'Выберите форму для сообщения возраста.', 'Marina dice: «______ veintidós años».', 'Tengo', [d('Soy', 'Глагол ser не употребляется с количеством лет.'), d('Estoy', 'Глагол estar не образует конструкцию возраста.'), d('Hay', 'Безличное hay сообщает о наличии, а не о возрасте человека.')], 'Spanish states age with tener plus a number of years.', 'В испанском возраст выражают глаголом tener и количеством лет.', 'present indicative of tener for age', 'Может правильно назвать свой возраст.'),
  q('vocabulary', 'multiple-choice', 'Naming a family relationship', 'Обозначение родственных отношений', 'Choose the family word that fits.', 'Выберите подходящее слово о семье.', 'La hija de mi hermano es mi ______.', 'sobrina', [d('tía', 'Tía — это сестра родителя, а не дочь брата.'), d('madre', 'Madre означает мать говорящего и не подходит к описанию.'), d('abuela', 'Abuela означает бабушку, а не племянницу.')], 'A brother’s daughter is a sobrina.', 'Дочь брата по-испански называется sobrina.', 'basic family vocabulary: sobrina', 'Может назвать близкое родственное отношение.'),
  q('reading', 'multiple-choice', 'Reading pharmacy opening hours', 'Чтение расписания аптеки', 'Read the sign and choose when it is open.', 'Прочитайте вывеску и выберите время работы.', 'Farmacia: lunes–sábado, 9:00–20:00. Domingo: cerrado. ¿Cuándo está abierta?', 'El martes a las diez.', [d('El domingo al mediodía.', 'В воскресенье аптека закрыта весь день.'), d('El sábado a las nueve de la noche.', 'В девять вечера уже позже указанного закрытия.'), d('El lunes a las ocho de la mañana.', 'В восемь утра аптека ещё не открылась.')], 'Tuesday at ten falls inside the stated opening hours.', 'Во вторник в десять аптека работает по указанному расписанию.', 'reading basic opening hours', 'Может понять дни и часы работы на простой вывеске.'),
  q('grammar', 'gap-fill', 'Describing furniture in a room', 'Описание мебели в комнате', 'Choose the article that agrees with mesa.', 'Выберите артикль, согласованный со словом mesa.', 'En la habitación hay ______ mesa y dos sillas.', 'una', [d('un', 'Форма un относится к существительным мужского рода.'), d('unas', 'Форма unas обозначает множественное число, а mesa стоит в единственном.'), d('unos', 'Форма unos не совпадает ни по роду, ни по числу.')], 'Mesa is feminine singular, so it takes una.', 'Mesa — существительное женского рода в единственном числе, поэтому нужно una.', 'indefinite article agreement', 'Может согласовать простой неопределённый артикль с существительным.'),
  q('pragmatics', 'multiple-choice', 'Meeting someone for the first time', 'Первое знакомство', 'Choose the natural introduction.', 'Выберите естественную реплику при знакомстве.', '—Hola, me llamo Ana. —______', 'Encantado, me llamo Luis.', [d('Hasta mañana, Ana.', 'Это прощание, а собеседники только начинают знакомство.'), d('No sé qué hora es.', 'Ответ о времени не поддерживает ситуацию знакомства.'), d('La cuenta, por favor.', 'Просьба о счёте относится к ресторану, а не к знакомству.')], 'The reply returns the introduction and expresses pleasure at meeting.', 'Ответ представляется в ответ и выражает радость от знакомства.', 'reciprocal greeting and self-introduction', 'Может представиться и ответить при первом знакомстве.'),
  q('vocabulary', 'multiple-choice', 'Describing the midday sky', 'Описание цвета полуденного неба', 'Choose the correct colour word.', 'Выберите подходящее название цвета.', 'Es mediodía y no hay nubes. El cielo es ______.', 'azul', [d('verde', 'Verde обозначает зелёный цвет и не описывает ясное небо.'), d('negro', 'Negro означает чёрный и не соответствует ясному небу в полдень.'), d('rosa', 'Rosa означает розовый и не является обычным цветом ясного полуденного неба.')], 'A cloudless sky at midday is normally described as azul.', 'Безоблачное небо в полдень обычно описывают словом azul.', 'basic colour vocabulary in an explicit daytime context', 'Может назвать распространённый цвет знакомого предмета.'),
  q('grammar', 'gap-fill', 'Giving someone’s profession', 'Сообщение профессии человека', 'Choose the correct present form of ser.', 'Выберите правильную форму ser.', 'Lucía ______ médica.', 'es', [d('está', 'Estar не используется для нейтрального обозначения профессии.'), d('tiene', 'Tener означает иметь и не связывает человека с профессией.'), d('hay', 'Безличное hay нельзя согласовать с конкретным человеком.')], 'Professions are identified with ser: Lucía es médica.', 'Профессию называют с помощью ser: Lucía es médica.', 'third-person singular of ser for profession', 'Может сообщить профессию другого человека.'),
  q('reading', 'multiple-choice', 'Reading a bus direction notice', 'Чтение направления автобусного маршрута', 'Read the route and choose its destination.', 'Прочитайте маршрут и выберите конечный пункт.', 'Autobús 12: Centro → Hospital. No pasa por la estación. ¿Adónde va este autobús?', 'Al hospital.', [d('A la estación.', 'В объявлении прямо сказано, что автобус не идёт через станцию.'), d('Al aeropuerto.', 'Аэропорт в маршруте автобуса не указан.'), d('A la universidad.', 'Университет не назван среди пунктов маршрута.')], 'The arrow explicitly marks Hospital as the destination.', 'Стрелка прямо указывает больницу как конечный пункт.', 'reading an explicitly directed public-transport route', 'Может найти конечный пункт в коротком объявлении транспорта.'),
  q('vocabulary', 'multiple-choice', 'Recognising a type of food', 'Определение вида продукта', 'Choose the word that names a fruit.', 'Выберите слово, обозначающее фрукт.', '¿Cuál de estas palabras es una fruta?', 'manzana', [d('queso', 'Queso означает сыр и относится к молочным продуктам.'), d('pan', 'Pan означает хлеб, а не фрукт.'), d('arroz', 'Arroz означает рис и не относится к фруктам.')], 'Manzana is the only fruit in the list.', 'Manzana — единственное название фрукта в списке.', 'basic food category vocabulary', 'Может распознать названия основных продуктов.'),
  q('grammar', 'gap-fill', 'Describing local shops', 'Описание магазинов рядом с домом', 'Choose the form that expresses existence.', 'Выберите форму со значением наличия.', 'En mi barrio ______ dos supermercados.', 'hay', [d('es', 'Es связывает подлежащее с признаком и не выражает наличие.'), d('está', 'Está требует конкретного подлежащего в единственном числе.'), d('tiene', 'Tiene требует владельца и не является безличной формой наличия.')], 'Hay expresses that something exists in a place.', 'Hay сообщает о наличии объектов в определённом месте.', 'existential hay', 'Может сказать, какие места есть поблизости.'),
  q('pragmatics', 'multiple-choice', 'Asking about a price in a shop', 'Уточнение цены в магазине', 'Choose the reply that answers the price question.', 'Выберите ответ на вопрос о цене.', '—¿Cuánto cuesta esta camiseta? —______', 'Cuesta veinte euros.', [d('Es de algodón.', 'Ответ сообщает материал, но не цену футболки.'), d('La talla mediana.', 'Ответ сообщает размер и не называет стоимость.'), d('Está junto a la puerta.', 'Ответ указывает место товара, а не его цену.')], 'The reply gives the requested price in euros.', 'Ответ сообщает запрошенную стоимость в евро.', 'answering a basic price question', 'Может спросить цену и понять простой ответ.'),
  q('grammar', 'gap-fill', 'Saying what someone likes', 'Сообщение о предпочтении', 'Choose the form that agrees with Pablo and café.', 'Выберите форму, согласованную с Pablo и café.', 'A Pablo ______ el café.', 'le gusta', [d('me gusta', 'Me gusta относится к говорящему, а не к Pablo.'), d('les gusta', 'Les обозначает нескольких людей, но назван один человек.'), d('le gustan', 'Глагол gustan требует существительного во множественном числе.')], 'Le gusta agrees with one experiencer and one liked thing.', 'Le gusta согласуется с одним человеком и одним объектом предпочтения.', 'gustar with singular experiencer and object', 'Может сказать, что нравится другому человеку.'),
  q('reading', 'multiple-choice', 'Reading a short location message', 'Чтение короткого сообщения о местонахождении', 'Read the message and choose where Marta is now.', 'Прочитайте сообщение и выберите, где сейчас Марта.', 'Mensaje de Marta: «Estoy en el banco. Llego a casa a las cinco». ¿Dónde está Marta ahora?', 'En el banco.', [d('En casa.', 'Дом назван как место, куда Марта придёт позже.'), d('En el trabajo.', 'Работа в сообщении вообще не упоминается.'), d('En el supermercado.', 'Супермаркет не указан в сообщении Марты.')], 'Estoy en el banco states Marta’s current location.', 'Фраза Estoy en el banco прямо называет текущее местонахождение Марты.', 'reading current versus future location', 'Может понять текущее место человека в коротком сообщении.'),
  q('vocabulary', 'multiple-choice', 'Naming rooms in a home', 'Названия комнат в доме', 'Choose the room used for sleeping.', 'Выберите комнату, предназначенную для сна.', 'Normalmente dormimos en el ______.', 'dormitorio', [d('baño', 'Baño — это ванная комната, а не место для сна.'), d('garaje', 'Garaje предназначен для автомобиля и хранения вещей.'), d('comedor', 'Comedor — это столовая, где обычно едят.')], 'Dormitorio is the room normally used for sleeping.', 'Dormitorio — комната, в которой обычно спят.', 'basic home and room vocabulary', 'Может назвать основные комнаты дома.'),
  q('grammar', 'gap-fill', 'Talking about a weekly class', 'Рассказ о еженедельных занятиях', 'Choose the present form for nosotros.', 'Выберите форму настоящего времени для nosotros.', 'Nosotros ______ español los martes.', 'estudiamos', [d('estudio', 'Estudio согласуется с yo, а не с nosotros.'), d('estudias', 'Estudias согласуется с tú и не подходит к подлежащему.'), d('estudian', 'Estudian относится к ellos, ellas или ustedes.')], 'Estudiamos is the present-tense nosotros form.', 'Estudiamos — форма настоящего времени для nosotros.', 'regular -ar verb in first-person plural', 'Может рассказать о регулярном занятии группы.'),
  q('pragmatics', 'multiple-choice', 'Apologising after bumping into someone', 'Извинение после случайного столкновения', 'Choose what the person who caused the accident should say.', 'Выберите уместное извинение виновника.', 'Chocas sin querer con una persona en la calle. ¿Qué dices?', 'Lo siento, perdón.', [d('Muchas felicidades.', 'Так поздравляют, а не извиняются за неловкость.'), d('Buen provecho.', 'Так желают приятного аппетита во время еды.'), d('Bienvenido a casa.', 'Так приветствуют дома и не признают случайную вину.')], 'Lo siento, perdón is a direct and polite apology.', 'Lo siento, perdón — прямое и вежливое извинение.', 'basic apology formula', 'Может кратко и вежливо извиниться.'),
  q('vocabulary', 'multiple-choice', 'Naming days in sequence', 'Последовательность дней недели', 'Choose the day after miércoles.', 'Выберите день после miércoles.', '¿Qué día viene después del miércoles?', 'jueves', [d('martes', 'Martes идёт перед miércoles, а не после него.'), d('lunes', 'Lunes находится в начале недели и не следует за miércoles.'), d('domingo', 'Domingo не является следующим днём после miércoles.')], 'Jueves immediately follows miércoles.', 'Jueves следует сразу после miércoles.', 'days of the week', 'Может назвать дни недели в правильном порядке.'),
  q('reading', 'multiple-choice', 'Reading a medical appointment card', 'Чтение карточки записи к врачу', 'Read the appointment and choose the room.', 'Прочитайте запись и выберите номер кабинета.', 'Cita: lunes 8 de abril, 11:30. Consulta 3. ¿Dónde es la cita?', 'En la consulta 3.', [d('En la consulta 8.', 'Число 8 относится к дате, а не к номеру кабинета.'), d('En la consulta 11.', 'Число 11 является частью времени начала приёма.'), d('En la consulta 30.', 'Число 30 обозначает минуты, а не кабинет.')], 'Consulta 3 explicitly identifies the appointment room.', 'Consulta 3 прямо указывает кабинет приёма.', 'reading date, time, and room information', 'Может найти место приёма в простой записи.'),
  q('grammar', 'gap-fill', 'Describing several houses', 'Описание нескольких домов', 'Choose the adjective agreeing with casas.', 'Выберите прилагательное, согласованное с casas.', 'Las casas son ______.', 'grandes', [d('grande', 'Grande стоит в единственном числе, а casas — во множественном.'), d('grandos', 'Формы grandos в нормативном испанском нет.'), d('grandas', 'Прилагательное grande не меняет окончание на -a во множественном числе.')], 'Grandes is the plural form used with casas.', 'Grandes — форма множественного числа, согласованная с casas.', 'plural adjective agreement', 'Может согласовать частотное прилагательное во множественном числе.'),
  q('vocabulary', 'multiple-choice', 'Choosing footwear', 'Выбор названия обуви', 'Choose what people normally wear on their feet.', 'Выберите то, что обычно носят на ногах.', 'Para caminar por la calle, normalmente llevamos ______.', 'zapatos', [d('guantes', 'Guantes надевают на руки, а не на ноги.'), d('sombreros', 'Sombreros носят на голове.'), d('bufandas', 'Bufandas носят вокруг шеи в прохладную погоду.')], 'Zapatos are worn on the feet for walking.', 'Zapatos носят на ногах во время ходьбы.', 'basic clothing vocabulary', 'Может назвать распространённые предметы одежды.'),
  q('reading', 'multiple-choice', 'Reading a simple weather forecast', 'Чтение простого прогноза погоды', 'Read the forecast and choose a useful item.', 'Прочитайте прогноз и выберите нужный предмет.', 'Mañana: lluvia por la mañana y por la tarde. ¿Qué conviene llevar?', 'Un paraguas.', [d('Unas gafas de sol.', 'Солнечные очки не защищают от указанного дождя.'), d('Un bañador.', 'Купальник не является обычным предметом для дождливого дня.'), d('Un abanico.', 'Веер используют при жаре, которой в прогнозе нет.')], 'An umbrella is useful when rain is forecast all day.', 'Зонт нужен, когда дождь прогнозируется утром и днём.', 'reading a basic weather forecast', 'Может понять простой прогноз и выбрать нужную вещь.'),
  q('grammar', 'gap-fill', 'Identifying someone’s car', 'Указание принадлежности автомобиля', 'Choose the possessive that refers to Carlos.', 'Выберите притяжательное слово для Carlos.', 'Este es Carlos. ______ coche es rojo.', 'Su', [d('Mi', 'Mi обозначало бы автомобиль говорящего, а не Carlos.'), d('Tu', 'Tu относило бы автомобиль к собеседнику.'), d('Nuestra', 'Nuestra не согласуется с coche и обозначает нашу принадлежность.')], 'Su refers to Carlos and agrees with singular coche.', 'Su указывает на Carlos и употребляется с coche в единственном числе.', 'third-person singular possessive adjective', 'Может указать принадлежность знакомого предмета.'),
  q('pragmatics', 'multiple-choice', 'Requesting repetition politely', 'Вежливая просьба повторить', 'Choose the polite request after not understanding.', 'Выберите вежливую просьбу после непонимания.', 'No has entendido lo que dice una persona. ¿Qué preguntas?', '¿Puede repetir, por favor?', [d('¿Puede pagar, por favor?', 'Глагол pagar означает платить и не просит повторить сказанное.'), d('¿Quiere cerrar la puerta?', 'Вопрос о двери не помогает понять предыдущую реплику.'), d('¿Dónde está el baño?', 'Вопрос о ванной меняет тему вместо просьбы повторить.')], 'The question politely asks the speaker to repeat.', 'Вопрос вежливо просит собеседника повторить сказанное.', 'polite request for repetition', 'Может попросить повторить непонятую реплику.'),
  q('grammar', 'gap-fill', 'Asking where someone lives', 'Вопрос о месте жительства', 'Choose the question word for a place.', 'Выберите вопросительное слово о месте.', '¿______ vives? —En Sevilla.', 'Dónde', [d('Cuándo', 'Cuándo спрашивает о времени, а ответ называет место.'), d('Quién', 'Quién спрашивает о человеке, а не о городе.'), d('Cuánto', 'Cuánto спрашивает о количестве или цене.')], 'Dónde asks for the place given in the reply.', 'Dónde запрашивает место, которое названо в ответе.', 'interrogative dónde', 'Может спросить, где живёт собеседник.'),
  q('vocabulary', 'multiple-choice', 'Choosing long-distance transport', 'Выбор транспорта для перелёта', 'Choose the vehicle that flies.', 'Выберите транспорт, который летает.', 'Para viajar por el aire usamos un ______.', 'avión', [d('tren', 'Tren передвигается по рельсам, а не по воздуху.'), d('barco', 'Barco передвигается по воде.'), d('autobús', 'Autobús ездит по дорогам и не летает.')], 'An avión is the vehicle used for air travel.', 'Avión — транспорт для путешествия по воздуху.', 'basic transport vocabulary', 'Может назвать основные виды транспорта.'),
  q('reading', 'multiple-choice', 'Comparing prices on a menu', 'Сравнение цен в меню', 'Read the menu and choose the cheapest item.', 'Прочитайте меню и выберите самую дешёвую позицию.', 'Menú: sopa 4 €, pan 5 €, tortilla 6 €. ¿Qué cuesta menos?', 'La sopa.', [d('El pan.', 'Pan стоит пять евро, то есть дороже супа.'), d('La tortilla.', 'Tortilla стоит шесть евро и является самой дорогой позицией.'), d('Todos cuestan lo mismo.', 'В меню указаны три разные цены.')], 'The soup has the lowest listed price.', 'У супа самая низкая указанная цена.', 'reading and comparing simple menu prices', 'Может найти более дешёвую позицию в коротком меню.'),
  q('grammar', 'gap-fill', 'Talking about an afternoon plan', 'Рассказ о плане на день', 'Choose the infinitive after voy a.', 'Выберите инфинитив после voy a.', 'Esta tarde voy a ______ a mi abuela.', 'visitar', [d('visito', 'После voy a нужен инфинитив, а visito — личная форма.'), d('visité', 'Visité — прошедшее время и не завершает конструкцию будущего плана.'), d('visitando', 'Герундий visitando не употребляется после voy a в этой конструкции.')], 'Voy a is followed by the infinitive visitar.', 'После voy a используется инфинитив visitar.', 'near future ir a plus infinitive', 'Может сообщить о простом ближайшем плане.'),
  q('pragmatics', 'multiple-choice', 'Thanking a cashier', 'Благодарность кассиру', 'Choose the natural reply when receiving change.', 'Выберите естественную благодарность при получении сдачи.', '—Aquí tiene su cambio. —______', 'Muchas gracias.', [d('Lo siento mucho.', 'Извинение не требуется при обычной передаче сдачи.'), d('No me llamo así.', 'Ответ о имени не связан с ситуацией оплаты.'), d('Hasta ayer.', 'Выражение Hasta ayer не является нормативным прощанием или благодарностью.')], 'Muchas gracias naturally acknowledges the cashier’s action.', 'Muchas gracias естественно выражает благодарность кассиру.', 'basic expression of thanks', 'Может поблагодарить за обычную услугу.'),
  q('vocabulary', 'multiple-choice', 'Identifying a profession', 'Определение профессии', 'Choose the profession described.', 'Выберите профессию по описанию.', 'Ana trabaja en una escuela y enseña a niños. Es ______.', 'profesora', [d('camarera', 'Camarera обслуживает посетителей, обычно в кафе или ресторане.'), d('médica', 'Médica работает в сфере здоровья, а не преподаёт в школе.'), d('conductora', 'Conductora управляет транспортом и не описана в ситуации.')], 'A woman who teaches children at school is a profesora.', 'Женщина, которая учит детей в школе, — profesora.', 'basic profession vocabulary', 'Может определить распространённую профессию по простому описанию.'),
  q('reading', 'multiple-choice', 'Reading an address', 'Чтение простого адреса', 'Read the address and choose the floor.', 'Прочитайте адрес и выберите этаж.', 'Dirección: calle Sol 18, 2.º B. ¿En qué piso está la vivienda?', 'En el segundo.', [d('En el primero.', 'Число 1 в адресе является частью номера дома 18.'), d('En el octavo.', 'Число 8 также относится к номеру дома, а не этажу.'), d('En la planta baja.', 'Обозначение 2.º указывает второй этаж, а не первый уровень здания.')], 'The abbreviation 2.º identifies the second floor.', 'Обозначение 2.º указывает на второй этаж.', 'reading a basic street address', 'Может найти этаж в кратко записанном адресе.'),
  q('grammar', 'gap-fill', 'Saying where keys are', 'Указание местонахождения ключей', 'Choose the form agreeing with llaves.', 'Выберите форму, согласованную с llaves.', 'Las llaves ______ encima de la mesa.', 'están', [d('está', 'Está стоит в единственном числе, а llaves — во множественном.'), d('es', 'Ser не используется для текущего местонахождения предметов.'), d('hay', 'Hay сообщает о наличии и не согласуется с определённым подлежащим las llaves.')], 'Están agrees with plural llaves and expresses location.', 'Están согласуется с llaves во множественном числе и обозначает место.', 'plural estar for location', 'Может сказать, где находятся знакомые предметы.'),
  q('vocabulary', 'multiple-choice', 'Describing a light box', 'Описание лёгкой коробки', 'Choose the adjective opposite to pesada.', 'Выберите прилагательное, противоположное pesada.', 'La caja no es pesada; es ______.', 'ligera', [d('cerrada', 'Cerrada означает закрытая и не противопоставляется весу.'), d('vacía', 'Vacía означает пустая, но пустой предмет не обязательно лёгкий.'), d('cuadrada', 'Cuadrada описывает форму, а не вес коробки.')], 'Ligera is the direct opposite of pesada.', 'Ligera — прямой антоним слова pesada.', 'common adjective antonyms', 'Может понять простое описание веса предмета.'),
  q('reading', 'multiple-choice', 'Reading a birthday invitation', 'Чтение приглашения на день рождения', 'Read the invitation and choose the time.', 'Прочитайте приглашение и выберите время.', 'Cumpleaños de Leo: sábado 15, a las 18:00, en Café Luna. ¿Cuándo es la fiesta?', 'El sábado a las seis de la tarde.', [d('El viernes a las seis.', 'В приглашении указан sábado, а не viernes.'), d('El sábado a las tres.', 'Число 15 относится к дате, а время указано как 18:00.'), d('El domingo al mediodía.', 'Ни воскресенье, ни полдень в приглашении не названы.')], 'Saturday at 18:00 is Saturday at six in the evening.', '18:00 в субботу — это шесть часов вечера в субботу.', 'reading date and time in an invitation', 'Может понять дату и время простого приглашения.'),
  q('pragmatics', 'multiple-choice', 'Declining a cinema invitation', 'Отказ от приглашения в кино', 'Choose the reply that declines tonight’s invitation.', 'Выберите ответ, который отклоняет приглашение на сегодня.', '—¿Vienes al cine esta noche? —______', 'No, hoy no puedo.', [d('Sí, ¿a qué hora?', 'Ответ принимает приглашение и уточняет время.'), d('La película empieza a las ocho.', 'Фраза сообщает время фильма, но не выражает решение говорящего.'), d('El cine está en el centro.', 'Фраза указывает место кинотеатра и не отвечает на приглашение.')], 'No, hoy no puedo clearly declines the invitation.', 'No, hoy no puedo ясно отклоняет приглашение.', 'direct polite refusal', 'Может кратко отказаться от простого приглашения.'),
  q('pragmatics', 'multiple-choice', 'Responding when someone sneezes', 'Реакция на чихание собеседника', 'Choose the conventional friendly response.', 'Выберите принятую доброжелательную реакцию.', 'Una persona a tu lado estornuda: «¡Achís!». ¿Qué dices?', '¡Salud!', [d('¡Buen viaje!', 'Buen viaje желают перед поездкой, а не после чихания.'), d('¡Feliz cumpleaños!', 'Так поздравляют с днём рождения, которого в ситуации нет.'), d('¡Que aproveche!', 'Так желают приятного аппетита во время еды.')], '¡Salud! is the conventional response to a sneeze.', '¡Salud! — принятая доброжелательная реакция на чихание.', 'conventional response to a sneeze', 'Может уместно отреагировать на чихание собеседника.'),
  q('vocabulary', 'multiple-choice', 'Describing a morning routine', 'Описание утреннего распорядка', 'Choose the verb that means gets up.', 'Выберите глагол со значением встаёт.', 'Cada mañana, Marta ______ a las siete.', 'se levanta', [d('se acuesta', 'Se acuesta означает ложится спать, а не встаёт утром.'), d('almuerza', 'Almuerza означает обедает и обычно не происходит в семь утра.'), d('cena', 'Cena означает ужинает и относится к вечеру.')], 'Se levanta means gets up and fits a morning routine.', 'Se levanta означает встаёт и подходит к утреннему распорядку.', 'basic daily-routine verb', 'Может понять частотный глагол ежедневного распорядка.'),
  q('reading', 'multiple-choice', 'Reading a sale label', 'Чтение ценника со скидкой', 'Read the label and choose the current price.', 'Прочитайте ценник и выберите текущую цену.', 'OFERTA — Antes: 30 €. Ahora: 20 €. ¿Cuánto cuesta ahora?', 'Veinte euros.', [d('Treinta euros.', 'Тридцать евро — старая цена с пометкой Antes.'), d('Diez euros.', 'Десять евро — размер скидки, но не текущая цена.'), d('Cincuenta euros.', 'Пятьдесят евро на ценнике не указаны.')], 'Ahora: 20 € gives the current sale price.', 'Пометка Ahora: 20 € сообщает текущую цену.', 'reading an old and current price', 'Может понять текущую цену на простом ценнике.'),
  q('grammar', 'gap-fill', 'Expressing an obligation for tomorrow', 'Сообщение о завтрашней обязанности', 'Choose the infinitive after tengo que.', 'Выберите инфинитив после tengo que.', 'Mañana tengo que ______ temprano.', 'trabajar', [d('trabajo', 'После tengo que нужен инфинитив, а trabajo — личная форма.'), d('trabajé', 'Trabajé обозначает завершённое прошлое действие.'), d('trabajando', 'Герундий trabajando не завершает конструкцию tener que.')], 'Tengo que is followed by the infinitive trabajar.', 'После tengo que употребляется инфинитив trabajar.', 'tener que plus infinitive', 'Может сообщить о простой обязанности.'),
  q('reading', 'multiple-choice', 'Reading a parcel collection notice', 'Чтение уведомления о посылке', 'Read the notice and choose where to collect the parcel.', 'Прочитайте уведомление и выберите место получения посылки.', 'Aviso: «Paquete para Laura. Puede recogerlo en recepción». ¿Dónde está el paquete?', 'En recepción.', [d('En la cafetería.', 'Кафетерий в уведомлении о посылке не упоминается.'), d('En casa de Laura.', 'В тексте не сказано, что посылку доставили домой.'), d('En el aparcamiento.', 'Парковка не названа как место получения посылки.')], 'The notice explicitly says the parcel can be collected at reception.', 'Уведомление прямо сообщает, что посылку можно получить на ресепшене.', 'reading a short parcel collection notice', 'Может понять, где получить посылку по короткому уведомлению.'),
];

if (SPECS.length !== 40) throw new Error(`Expected 40 A1 specs, found ${SPECS.length}`);

const difficultyAt = (index) => index === 0 ? 0.5 : index === 1 ? 0.63 : Number((0.66 + ((index - 2) * 0.54 / 37)).toFixed(3));

const cefrRationaleEn = (spec) => ({
  grammar: `In “${spec.scenario}”, A1 evidence comes from controlling ${spec.targetConstruct} in one familiar sentence.`,
  vocabulary: `The familiar context “${spec.scenario}” requires recognition of ${spec.targetConstruct}, a bounded A1 lexical operation.`,
  reading: `The short text in “${spec.scenario}” asks for one explicit detail through ${spec.targetConstruct}, consistent with A1 reading.`,
  pragmatics: `The brief situation “${spec.scenario}” requires an appropriate response through ${spec.targetConstruct}, a familiar A1 interaction.`,
}[spec.skill]);

const cefrRationaleRu = (spec) => ({
  grammar: `${spec.canDoRu} В знакомом контексте проверяется одна базовая грамматическая форма уровня A1.`,
  vocabulary: `${spec.canDoRu} Проверяется одно частотное значение в знакомой ситуации уровня A1.`,
  reading: `${spec.canDoRu} Короткий текст требует найти одну явно сообщённую деталь уровня A1.`,
  pragmatics: `${spec.canDoRu} Краткая ситуация требует одной уместной реакции в знакомом общении уровня A1.`,
}[spec.skill]);

const ambiguityNotesEn = (spec, index) => [
  `${spec.explanation} The alternatives conflict with the contextual cue or with ${spec.targetConstruct}.`,
  `The decisive response is “${spec.answer}”. ${spec.explanation} Each alternative changes the requested meaning or form.`,
  `“${spec.answer}” is supported by the explicit cue in the stimulus. ${spec.explanation} The alternatives fail that cue.`,
  `The context directly supports “${spec.answer}” through ${spec.targetConstruct}. No alternative preserves the same meaning.`,
][index % 4];

const ambiguityNotesRu = (spec, index) => [
  `${spec.explanationRu} Остальные ответы противоречат явной контекстной подсказке или проверяемому значению.`,
  `Решающую функцию выполняет «${spec.answer}». ${spec.explanationRu} Другие ответы меняют требуемый смысл или форму.`,
  `Форма «${spec.answer}» подтверждается явной подсказкой в стимуле. ${spec.explanationRu} Остальные ответы ей не соответствуют.`,
  `Контекст прямо поддерживает «${spec.answer}»; другие ответы не сохраняют тот же смысл или требуемую форму.`,
][index % 4];

const questions = SPECS.map((spec, index) => {
  const correctPosition = POSITIONS[index];
  const entries = spec.distractors.map((entry) => ({ ...entry, correct: false }));
  entries.splice(correctPosition, 0, { text: spec.answer, correct: true });
  const distractorRationalesRu = Object.fromEntries(entries.flatMap((entry, optionIndex) => entry.correct ? [] : [[String(optionIndex), entry.reasonRu]]));
  return {
    id: `es-a1-${String(index + 1).padStart(3, '0')}`,
    level: 'A1',
    difficulty: difficultyAt(index),
    skill: spec.skill,
    format: spec.format,
    scenario: spec.scenario,
    prompt: spec.prompt,
    scenarioRu: spec.scenarioRu,
    instructionRu: spec.instructionRu,
    stimulus: spec.stimulus,
    options: entries.map(({ text }) => text),
    correctIndex: correctPosition,
    explanation: spec.explanation,
    explanationRu: spec.explanationRu,
    targetConstruct: spec.targetConstruct,
    targetConstructRu: spec.canDoRu.replace(/^Может\s+/u, '').replace(/\.$/u, ''),
    cefrRationale: cefrRationaleEn(spec),
    cefrRationaleRu: cefrRationaleRu(spec),
    dialect: 'standard',
    reviewStatus: 'self_checked',
    ambiguityNotes: ambiguityNotesEn(spec, index),
    ambiguityNotesRu: ambiguityNotesRu(spec, index),
    canDoRu: spec.canDoRu,
    claimBasis: 'SYNTHESIS',
    distractorRationalesRu,
  };
});

const manifest = {
  schemaVersion: 1,
  bankVersion: '2026-08-02.es-full-authored.1',
  language: 'es',
  status: 'candidate_bank',
  publishable: false,
  authorReviewStatus: 'self_checked',
  externalReviewStatus: 'pending',
  completedLevels: ['A1', 'A2', 'B1'],
  authoredLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
};

const levelFile = {
  schemaVersion: 3,
  bankVersion: manifest.bankVersion,
  language: 'es',
  level: 'A1',
  dialect: 'standard',
  publishable: false,
  questions,
};

const outputs = new Map([
  [path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`],
  [path.join(OUT_DIR, 'A1.json'), `${JSON.stringify(levelFile, null, 2)}\n`],
]);

if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [file, contents] of outputs) fs.writeFileSync(file, contents, 'utf8');
  console.log('Wrote isolated Spanish A1 candidate bank (40 items).');
} else {
  for (const [file, expected] of outputs) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected) {
      console.error(`Out of date: ${path.relative(ROOT, file)}`);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log('Spanish A1 candidate bank is up to date.');
}
