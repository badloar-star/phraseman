import sys
sys.stdout.reconfigure(encoding='utf-8')

uk_ru = [
  ('topic', 'Розподілити завдання після зустрічі', 'Распределить задачи после встречи'),
  ('outcome', 'Ти вмієш говорити, кому доручено завдання і хто за що відповідає після зустрічі', 'Ты умеешь говорить, кому поручено задание и кто за что отвечает после встречи'),
  ('intro0.title', 'Як сказати кому доручено', 'Как сказать кому поручено'),
  ('intro0.ex0.gloss', 'Завдання доручено Анні.', 'Задача поручена Анне.'),
  ('intro0.ex1.gloss', 'Звіт доручено команді.', 'Отчёт поручен команде.'),
  ('intro1.title', 'Хто що робить теперішній час', 'Кто что делает настоящее время'),
  ('intro1.ex0.gloss', 'Вона займається зворотним зв\'язком із клієнтом.', 'Она занимается обратной связью с клиентом.'),
  ('intro1.ex1.gloss', 'Він надсилає нотатки зі зустрічі всім.', 'Он отправляет заметки со встречи всем.'),
  ('intro2.title', 'Корисні слова для делегування', 'Полезные слова для делегирования'),
  ('intro2.ex0.gloss', 'Хто відповідає за термін?', 'Кто отвечает за срок?'),
  ('intro2.ex1.gloss', 'Кожне завдання доручено одній людині.', 'Каждая задача поручена одному человеку.'),
  ('p1.meaning', 'Завдання доручено Анні.', 'Задача поручена Анне.'),
  ('p2.meaning', 'Він займається зворотним зв\'язком із клієнтом.', 'Он занимается обратной связью с клиентом.'),
  ('p3.meaning', 'Кожна людина відповідає за одне завдання.', 'Каждый человек отвечает за одну задачу.'),
  ('p4.meaning', 'Термін встановлено на п\'ятницю.', 'Срок установлен на пятницу.'),
  ('p5.meaning', 'Вона надсилає нотатки зі зустрічі всім.', 'Она отправляет заметки со встречи всем.'),
  ('p6.meaning', 'Усі пункти дій записані.', 'Все пункты действий записаны.'),
  ('p1.expl.title', 'Завдання отримало господаря', 'Задача получила хозяина'),
  ('p2.expl.title', 'Хто чим займається', 'Кто чем занимается'),
  ('p3.expl.title', 'Кожен відповідає за своє', 'Каждый отвечает за своё'),
  ('p4.expl.title', 'Термін отримав дату', 'Срок получил дату'),
  ('p5.expl.title', 'Її завдання — розіслати нотатки', 'Её задача — разослать заметки'),
  ('p6.expl.title', 'Все зафіксовано', 'Всё зафиксировано'),
  ('p1.why', 'На мітингах так кажуть, коли підсумок важливіший за того, хто роздавав завдання.', 'На митингах так говорят, когда итог важнее, чем тот, кто раздавал задачи.'),
  ('p2.why', 'Простий теперішній описує, хто що веде за підсумком зустрічі.', 'Простое настоящее описывает, кто что ведёт по итогу встречи.'),
  ('p3.why', 'Так чітко позначають, хто що веде, щоб не було плутанини.', 'Так чётко обозначают, кто что ведёт, чтобы не было путаницы.'),
  ('p4.why', 'Хто поставив термін — неважливо, важливо коли. Тому кажуть «is set».', 'Кто поставил срок — неважно, важно когда. Поэтому говорят «is set».'),
  ('p5.why', 'Після мітингу часто одній людині доручають розсилку підсумків.', 'После митинга часто одному человеку поручают рассылку итогов.'),
  ('p6.why', 'Після зустрічі важливо знати, що жоден пункт не втрачений.', 'После встречи важно знать, что ни один пункт не потерян.'),
  ('p1.cm', 'Не кажи «The task assigns to Anna» — завдання само не призначає, воно отримане.', 'Не говори «The task assigns to Anna» — задача сама не назначает, она получена.'),
  ('p2.cm', 'Не «He handle» — з he/she/it додавай -s: handles.', 'Не «He handle» — с he/she/it добавляй -s: handles.'),
  ('p3.cm', 'Не «responsible of» — тільки «responsible for».', 'Не «responsible of» — только «responsible for».'),
  ('p4.cm', 'Не «The deadline sets for Friday» — термін не ставить себе сам.', 'Не «The deadline sets for Friday» — срок не ставит себя сам.'),
  ('p5.cm', 'Не «She send» — з she/he/it завжди -s наприкінці: sends.', 'Не «She send» — с she/he/it всегда -s на конце: sends.'),
  ('p6.cm', 'Не «are write down» — використовуй форму written, не write.', 'Не «are write down» — используй форму written, не write.'),
  ('vocab.assigned', 'доручено, призначено', 'поручено, назначено'),
  ('vocab.handles', 'займається, веде', 'занимается, ведёт'),
  ('vocab.responsible', 'відповідальний, відповідає за', 'ответственный, отвечает за'),
  ('vocab.deadline', 'термін, дедлайн', 'срок, дедлайн'),
  ('vocab.notes', 'нотатки, записи', 'заметки, записи'),
  ('vocab.action', 'дія, пункт до виконання', 'действие, пункт к выполнению'),
]

print('=== UK copy-of-RU check ===')
found_copy = False
for path, uk, ru in uk_ru:
    if uk == ru:
        print(f'COPY: {path} | {uk}')
        found_copy = True
if not found_copy:
    print('No copies found.')

# Now check ES strings
es_strings = [
  ('topic.es', 'Distribuir tareas después de la reunión'),
  ('outcome.es', 'Puedes decir a quién se le asignó una tarea y quién es responsable de qué después de la reunión'),
  ('intro0.title.es', 'Cómo decir «a quién se le asignó»'),
  ('intro0.ex0.gloss.es', 'La tarea está asignada a Anna.'),
  ('intro0.ex1.gloss.es', 'El informe está asignado al equipo.'),
  ('intro1.title.es', 'Quién hace qué — presente simple'),
  ('intro1.ex0.gloss.es', 'Ella se encarga del seguimiento con el cliente.'),
  ('intro1.ex1.gloss.es', 'Él envía las notas de la reunión a todos.'),
  ('intro2.title.es', 'Palabras útiles para delegar'),
  ('intro2.ex0.gloss.es', '¿Quién es responsable de la fecha límite?'),
  ('intro2.ex1.gloss.es', 'Cada tarea está asignada a una persona.'),
  ('p1.meaning.es', 'La tarea está asignada a Anna.'),
  ('p2.meaning.es', 'Él se encarga del seguimiento con el cliente.'),
  ('p3.meaning.es', 'Cada persona es responsable de una tarea.'),
  ('p4.meaning.es', 'La fecha límite está fijada para el viernes.'),
  ('p5.meaning.es', 'Ella envía las notas de la reunión a todos.'),
  ('p6.meaning.es', 'Todos los puntos de acción están anotados.'),
  ('p1.expl.title.es', 'La tarea tiene dueño'),
  ('p2.expl.title.es', 'Quién se ocupa de qué'),
  ('p3.expl.title.es', 'Cada uno responde por lo suyo'),
  ('p4.expl.title.es', 'La fecha límite ya tiene día'),
  ('p5.expl.title.es', 'Su tarea es enviar las notas'),
  ('p6.expl.title.es', 'Todo queda registrado'),
  ('p1.rule.es', '«Is assigned to» indica que la tarea fue dirigida a alguien. No importa quién la asignó.'),
  ('p2.rule.es', '«Handles» significa ocuparse o llevar algo. Se usa para hablar de responsabilidades fijas.'),
  ('p3.rule.es', '«Responsible for» significa responsable de. Es una combinación fija muy usada en reuniones.'),
  ('p4.rule.es', '«Is set for» significa fijado para. Se usa para hablar de plazos y fechas decididas en la reunión.'),
  ('p5.rule.es', '«Sends» en presente simple indica que es su responsabilidad habitual después de cada reunión.'),
  ('p6.rule.es', '«Are written down» significa que están anotados. No importa quién lo hizo, sino que está hecho.'),
  ('p1.why.es', 'En reuniones se dice así cuando el resultado importa más que quién asignó.'),
  ('p2.why.es', 'El presente simple describe quién lleva qué según los resultados de la reunión.'),
  ('p3.why.es', 'Así se aclara quién lleva qué para evitar confusiones.'),
  ('p4.why.es', 'No importa quién fijó el plazo, importa cuándo. Por eso se dice «is set».'),
  ('p5.why.es', 'Después de la reunión, generalmente una persona se encarga de enviar el resumen.'),
  ('p6.why.es', 'Después de la reunión, es importante saber que ningún punto se ha perdido.'),
  ('p1.cm.es', 'No digas «The task assigns to Anna» — la tarea no se asigna sola, fue asignada.'),
  ('p2.cm.es', 'No digas «He handle» — con he/she/it añade -s: handles.'),
  ('p3.cm.es', 'No digas «responsible of» — solo se dice «responsible for».'),
  ('p4.cm.es', 'No digas «The deadline sets for Friday» — la fecha no se fija sola.'),
  ('p5.cm.es', 'No digas «She send» — con she/he/it siempre se añade -s: sends.'),
  ('p6.cm.es', 'No digas «are write down» — usa la forma written, no write.'),
  ('vocab.assigned.es', 'asignado'),
  ('vocab.handles.es', 'se encarga de'),
  ('vocab.responsible.es', 'responsable'),
  ('vocab.deadline.es', 'fecha límite'),
  ('vocab.notes.es', 'notas'),
  ('vocab.action.es', 'acción, punto de acción'),
]

print()
print('=== ES: questions without opening ¿ ===')
found_q = False
for path, text in es_strings:
    if '?' in text and '¿' not in text:
        print(f'MISSING ¿ | {path} | {text}')
        found_q = True
if not found_q:
    print('No missing ¿ found.')

print()
print('=== ES: p1.why.es - incomplete transitive verb ===')
p1_why = 'En reuniones se dice así cuando el resultado importa más que quién asignó.'
print(f'Text: {p1_why}')
print('RU:   На митингах так говорят, когда итог важнее, чем тот, кто раздавал задачи.')
print('Issue: "asignó" (assigned) is transitive - missing object "las tareas"')
print('Fix:   ...importa más que quién asignó las tareas.')

print()
print('All checks complete.')
