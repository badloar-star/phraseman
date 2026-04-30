/**
 * Generates app/lesson_intro_screens_17_32.ts from .tmp_full_intro_git.ts (git HEAD blob)
 * plus embedded Spanish strings (titleES, textES, trES).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, '.tmp_full_intro_git.ts');
const outPath = path.join(root, 'app', 'lesson_intro_screens_17_32.ts');

const TITLE_ES = {
  why: 'Para qué sirve este tema',
  how: 'Cómo se forma la frase',
  trap: 'La trampa más frecuente',
  tip: 'Conviene saberlo',
};

/** [lessonId][screenIndex] = textES */
const TEXT_ES = {
  17: [
    `El Present Continuous es el «justo ahora» y «estos días»: «estoy trabajando ahora», «vienen hacia nosotros», «estoy estudiando inglés este mes». Sin él, todo se mezcla con el presente simple y tu interlocutor no entiende que hablas del momento.`,
    `Tomamos am/is/are según el sujeto y en seguida el verbo con -ing: I am working, she is reading, we are eating. Son dos piezas obligatorias: sin la forma de be la frase se cae; sin -ing pasa a sonar como presente simple con otro sentido.`,
    `Los verbos de estado y emoción (love, know, want, need, understand) —casi nunca van en Continuous. No «I am loving», sino I love. «I want a coffee», no «I am wanting». Describen un estado, no un proceso alargado.`,
  ],
  18: [
    `Órdenes y peticiones son el día a día: «abre la ventana», «espera un minuto», «no hagas ruido», «pásame la sal». Sin el imperativo te quedas solo en «Could you please…» donde a veces basta una palabra.`,
    `Usa el verbo en forma base —sin sujeto ni to—: Open. Wait. Sit down. Para prohibir: Don't delante: Don't worry, Don't shout. Para suavizar, añade please al principio o al final.`,
    `El imperativo suena brusco sin entonación. Si quierees pedir, no mandar, usa please y un tono suave. «Sit down!» es profesor; «Sit down, please» es camarero: mismas palabras, otro efecto.`,
  ],
  19: [
    `In, on, at, under, between, behind son las coordenadas de la frase: «las llaves en la mesa», «los niños en el jardín», «la tienda en la esquina». Sin el preposicion correcto un angloparlante no sitúa nada.`,
    `Memoriza tres grandes: in —dentro (in the box, in the city), on —superficie (on the table, on the wall), at —punto (at home, at work, at the bus stop). Las demás —under, behind, between…— afinan la imagen.`,
    `Tu «en» ruso o ucraniano no siempre es in: «en Londres» — in London (zona amplia); «en el colegio» — at school (punto de la rutina). Piensa en la foto: dentro (in), superficie (on), punto (at).`,
  ],
  20: [
    `A, an, the son minúsculas pero cambian el sentido: «quiero un café» (cualquiera) frente a «quiero el café» (ese concreto). Sin artículos la frase suena «desnuda» y delata al hablante no nativo.`,
    `A/an —primera mención o «uno de muchos»: a dog, an apple. The —los dos saben de qué hablamis o hay uno claro: the sun, the door. Sin artículo —ideas abstractas o plural general: I love music, dogs are friendly.`,
    `A —antes de consonante sonora (a book, a university: /ju/); an —ante vocal (an apple, an hour: la h no se pronuncia). Mira el sonido, no la letra.`,
  ],
  21: [
    `«Alguien llamó», «no hay nadie en casa», «¿hay algo de comer?». Some, any, no y familia son de cada día; sin ellos se corta la charla sobre personas, cosas y lugares.`,
    `En afirmación — some-: somebody, something, somewhere. En pregunta y negación — any-. Para «cero» — no- (nobody, nothing, nowhere): un solo no en la frase; el verbo vuelve a positivo.`,
    `No mezcles dos negaciones: «I don't know nothing» suena como «sí sé algo». Di «I don't know anything» o «I know nothing». Una negación por frase.`,
  ],
  22: [
    `El gerundio es un verbo que actúa como nombre: «me gusta nadar», «gracias por la ayuda», «dejó de fumar». En inglés va en -ing; sin él media rutina no existe.`,
    `Verbo + -ing: swim → swimming. Lo usas como nombre tras like, love, hate, enjoy, stop, finish, after, before: «I like reading», «He stopped smoking», «Thanks for helping».`,
    `Tras preposición — siempre -ing: before going, good at swimming. Nunca *before go*: el preposición + infinitivo «pelado» delata al principiante.`,
  ],
  23: [
    `La pasiva —lo que pasó importa, no quién lo hizo: «la casa se construyó en 1900», «la carta está enviada», «me invitaron». Noticias, instrucciones: sin pasiva entiendes la mitad.`,
    `Sujeto (lo afectado) + be en el tiempo que toque + participio: built, sent, invited. «Algo está hecho». El autor puede omitirse.`,
    `Si quieres decir quién: … by Hemingway. Sin by queda anónimo —como muchas noticias.`,
  ],
  24: [
    `El Present Perfect es pasado con eco en el presente: «ya he comido» (= no tengo hambre), «ha perdido las llaves» (= sigue sin ellas), «nunca hemos estado en París» (= tampoco ahora). Es la construcción menos «eslava» del inglés.`,
    `Have/has + participio: been, done, seen, eaten. «I have eaten», «She has lost her keys». En habla: I've, she's, we've.`,
    `Si hay tiempo puntual en el pasado (yesterday, last year, in 2010) — Past Simple, no Perfect: *I have seen him yesterday* ❌ → I saw him yesterday. Marcas de Perfect: already, just, ever, never, yet, since, for.`,
  ],
  25: [
    `El Past Continuous es un fotograma del pasado: «a las siete cenaba», «cuando llamaste, dormía», «llovió todo el día». Da el fondo de cualquier historia: «pasaba esto —y de pronto…».`,
    `Was / were + -ing: «I was reading», «They were playing». Suele ir hora concreta o un Past Simple que «corta» la escena.`,
    `Largo = Continuous; interrupción corta = Simple: «I was reading when you called». Los dos tiempos van en pareja.`,
  ],
  26: [
    `«Si llueve, me quedo en casa», «si lo supiera, ayudaría», «si no llamas, me enfado». Planes, discusiones, hipótesis — todo gira en if.`,
    `1.º tipo (real): If + presente, will + verbo: If it rains, I will stay home. 2.º (irreal): If + pasado, would + verbo. Tras if no pongas will: el futuro se esconde en el presente.`,
    `Nunca *If it will rain*. Con irrealidad usa were para todas las personas: If I were you; en oral a veces aparece was.`,
  ],
  27: [
    `Cada vez que cuentas palabras ajenas —dijo que estaba cansada, preguntó dónde estabas, mamá mandó no llegar tarde— es estilo indirecto. Sin él citas como robot o te callas.`,
    `Said / told + that + orden normal; el tiempo retrocede: am → was, will → would, can → could. Cambia también los pronombres al narrador.`,
    `En subordinadas de pregunta no inviertas: *He asked where was I* ❌ — He asked where I was. Sin signo de interrogación final: ya no es pregunta directa.`,
  ],
  28: [
    `«Me corté», «aprendió sola», «lo hicimos nosotros mismos» — myself, herself, ourselves. En ruso/ucraniano es -ся o «сам»; en inglés, palabra aparte. I cut no es «me corté».`,
    `I → myself, you → yourself, he → himself, she → herself, it → itself, we → ourselves, they → themselves. Tras el verbo: He hurt himself, She taught herself.`,
    `También refuerza «personalmente»: I spoke to the boss myself —al final o justo tras el sujeto.`,
  ],
  29: [
    `Used to — hábitos o estados que ya no existen: «antes fumaba», «vivíamos en el pueblo», «solía jugar al ajedrez». El pasado simple sirve, pero used to marca «era regular y quedó atrás».`,
    `Sujeto + used to + infinitivo: I used to smoke. En negativa/pregunta: didn't use to…, Did you use to…? El did ya lleva el pasado.`,
    `No confundas con be used to («estar acostumbrado»): I am used to coffee —ahora; I used to drink coffee —antes, ya no.`,
  ],
  30: [
    `«El chico que me gusta», «la peli que vimos ayer», «la ciudad donde nací». Sin who/which/that la frase se parte en trozos de niño.`,
    `Who —personas; which —cosas; that —los dos; where —sitios; when —tiempo. Va pegado al nombre que amplías.`,
    `Si la palabra relativa es objeto, puedes omitirla: «The book (that) I bought». Suena más natural y corto.`,
  ],
  31: [
    `«Quiero que vengas», «le pedí que ayudara», «espera que llame» —en inglés un verbo + objeto + to + verbo.`,
    `Verbo principal (want, ask, expect, tell) + objeto (him, her…) + to + infinitivo: I want him to come. Sin that en medio.`,
    `Tras make, let y see/hear/feel —sin to: made me clean, let her go, saw him fall. Lista corta; si fallas aquí, se nota al instante.`,
  ],
  32: [
    `Repaso final: aquí se mezclan tiempos, modales, artículos, preposiciones, phrasal verbs. La meta es ver cómo conviven en una frase real, no en bloques sueltos.`,
    `Igual de antes: mira la idea en tu idioma, detecta tiempo y tipo, construye el inglés en orden. Pasado → Simple o Continuous; «ya/nunca» → Present Perfect; habilidad → can.`,
    `Si te atascas, no recites reglas: pregúntate qué tiempo es el trasfondo —ahora, pasado, futuro, hábito, una vez— y el tiempo concreto llega solo. Lo importante es intentar, no paralizarte por miedo al error.`,
  ],
};

const TR_ES_EXAMPLES = {
  17: [
    ['Estoy trabajando ahora', 'Ella está leyendo un libro', 'Estamos aprendiendo inglés'],
  ],
  18: [
    ['Abre la ventana, por favor', 'No te preocupes', 'Siéntate'],
  ],
  19: [
    ['Las llaves están en la mesa', 'Ella está en la parada de autobús', 'El gato está debajo de la silla'],
  ],
  20: [
    ['Ayer compré un libro', 'El libro está en la mesa', 'Me encanta la música'],
  ],
  21: [
    ['Alguien te llamó', '¿Hay algo de comer?', 'No hay nadie en casa'],
  ],
  22: [
    ['Me gusta nadar', 'Dejó de fumar', 'Gracias por ayudar'],
  ],
  23: [
    ['La casa se (fue) construida en 1900', 'La carta está enviada', 'Me invitaron a la fiesta'],
  ],
  24: [
    ['Ya he comido', 'Ha perdido sus llaves', 'Nunca hemos estado en París'],
  ],
  25: [
    ['A las siete leía', 'Cuando llamaste, dormía', 'Llovió todo el día'],
  ],
  26: [
    ['Si llueve, me quedaré en casa', 'Si lo supiera, ayudaría', 'Si no llamas, me enfadaré'],
  ],
  27: [
    ['Dijo que estaba cansada', 'Preguntó dónde estaba', 'Mamá me dijo no llegar tarde'],
  ],
  28: [
    ['Me corté', 'Aprendió inglés sola', 'Lo hicimos nosotros mismos'],
  ],
  29: [
    ['Antes fumaba', 'Antes vivíamos en un pueblo', 'Solía jugar al ajedrez'],
  ],
  30: [
    ['El chico que me llamó es mi amigo', 'Perdí el libro que me diste', 'Este es el café donde nos conocimos'],
  ],
  31: [
    ['Quiero que vengas', 'Le pedí que ayudara', 'Espera que llame'],
  ],
  32: [
    ['Ya he terminado el libro', 'Cuando llamó, estaba trabajando', 'Si llueve, nos quedaremos en casa'],
  ],
};

function parseScreens(ts, lessonId) {
  const m = ts.match(new RegExp(`export const LESSON_${lessonId}_INTRO:[\\s\\S]*?= \\[([\\s\\S]*?)\\];`, 'm'));
  if (!m) throw new Error(`No block for lesson ${lessonId}`);
  const body = m[1];
  const screens = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        screens.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return screens;
}

function detectKind(screen) {
  const km = screen.match(/kind:\s*'(\w+)'/);
  return km ? km[1] : 'why';
}

function injectFields(screen, lessonId, screenIndex) {
  const kind = detectKind(screen);
  const titleES = TITLE_ES[kind] || TITLE_ES.why;
  const textES = TEXT_ES[lessonId][screenIndex];
  let s = screen;
  if (/titleES:/.test(s)) return s;
  s = s.replace(/(titleUK:[^\n]+\n)/, `$1    titleES: '${titleES.replace(/'/g, "\\'")}',\n`);
  if (/textES:/.test(s)) return s;
  s = s.replace(/(textUK:[^\n]+\n)/, `$1    textES: '${textES.replace(/'/g, "\\'")}',\n`);
  const howIdx = TR_ES_EXAMPLES[lessonId] ? 0 : -1;
  if (howIdx >= 0 && /examples:\s*\[/.test(s)) {
    const trs = TEXT_ES[lessonId][screenIndex];
    const exampleTrES = TR_ES_EXAMPLES[lessonId];
    if (!exampleTrES) return s;
    // Only the "how" block has examples
    if (kind !== 'how') return s;
    const arr = exampleTrES[0];
    let ei = 0;
    s = s.replace(/\{\s*en:\s*('(?:\\'|[^'])*'|\…)[^}]*trUK:\s*('(?:\\'|[^'])*')\s*\}/g, (block) => {
      const tr = arr[ei++] ?? '…';
      if (/trES:/.test(block)) return block;
      return block.replace(/(trUK:\s*'(?:\\'|[^'])*')\s*(\})/, `$1, trES: '${tr.replace(/'/g, "\\'")}' $2`);
    });
  }
  return s;
}

function main() {
  if (!fs.existsSync(srcPath)) {
    console.error('Missing', srcPath, '- run: node -e "fs.writeFileSync(\'.tmp_full_intro_git.ts\', require(\'child_process\').execFileSync(\'git\', [\'show\', \'HEAD:app/lesson_intro_screens_9_32.ts\']))"');
    process.exit(1);
  }
  const ts = fs.readFileSync(srcPath, 'utf8');
  const header = `/**
 * Intro slides for lessons 17–32 (RU/UK from legacy monolith; ES added for locale \`es\`).
 * Wired via EXTRA_INTRO_SCREENS in lesson_intro_screens_9_32.ts.
 */
import type { LessonIntroScreen } from './lesson_data_types';

`;

  let out = header;
  for (let id = 17; id <= 32; id++) {
    const screens = parseScreens(ts, id);
    if (screens.length !== 3) throw new Error(`Lesson ${id}: expected 3 screens, got ${screens.length}`);
    const injected = screens.map((sc, i) => injectFields(sc, id, i));
    out += `\nexport const LESSON_${id}_INTRO_EXTRA: LessonIntroScreen[] = [\n  ${injected.join(',\n  ')},\n];\n`;
  }

  fs.writeFileSync(outPath, out, 'utf8');
  console.log('Wrote', outPath);
}

main();
