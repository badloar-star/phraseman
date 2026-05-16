/**
 * Nombres y descripciones de logros en español (interfaz es).
 * Mantener claves = id en ALL_ACHIEVEMENTS (achievements.ts).
 * Misma lógica que ru/uk: racha de XP ≠ cadena de inicios de sesión.
 */
export const ACHIEVEMENT_ES: Record<string, { nameEs: string; descEs: string }> = {
  streak_3: {
    nameEs: 'Los primeros tres',
    descEs: 'Tres días seguidos ganando XP en la app (racha de actividad).',
  },
  streak_7: {
    nameEs: 'Una semana',
    descEs:
      '7 días seguidos con XP; congelación, reparación o escudo pueden salvar la racha.',
  },
  streak_14: {
    nameEs: 'Dos semanas',
    descEs: '14 días seguidos con XP; no es lo mismo que la cadena de inicios de sesión.',
  },
  streak_30: {
    nameEs: 'Un mes en marcha',
    descEs: '30 días seguidos ganando al menos una vez XP al día.',
  },
  streak_60: {
    nameEs: 'Dos meses',
    descEs: '60 días seguidos manteniendo la racha de actividad.',
  },
  streak_100: {
    nameEs: 'Cien días',
    descEs: '100 días seguidos sin "días vacíos" en la cuenta de la racha.',
  },
  streak_200: {
    nameEs: 'Doscientos días',
    descEs: '200 días seguidos con XP diario.',
  },
  streak_365: {
    nameEs: 'Un año entero',
    descEs: '365 días seguidos como en el contador de racha.',
  },
  streak_500: {
    nameEs: '500 días',
    descEs: '500 días seguidos con XP: constancia poco frecuente.',
  },
  streak_repair: {
    nameEs: 'Fénix',
    descEs:
      'Usa la reparación cuando falte solo un día y termina una lección ese mismo día.',
  },
  perfect_week: {
    nameEs: 'Semana perfecta',
    descEs: 'Gana XP cada día de lunes a domingo de la misma semana calendario.',
  },

  lesson_1: {
    nameEs: 'Primer paso',
    descEs: 'Termina una lección: cuenta con ≥45 respuestas correctas.',
  },
  lesson_3: {
    nameEs: 'Tres lecciones',
    descEs: 'Tres lecciones distintas con el progreso completo dado por alto.',
  },
  lesson_5: {
    nameEs: 'Cinco lecciones',
    descEs: 'Cinco lecciones dadas por completas según las reglas de la app.',
  },
  lesson_10: {
    nameEs: 'Diez lecciones',
    descEs: 'Diez lecciones con crédito en tu expediente.',
  },
  lesson_15: {
    nameEs: 'Quince',
    descEs: '15 lecciones completadas según las reglas de la app.',
  },
  lesson_20: {
    nameEs: 'Veinte lecciones',
    descEs: '20 lecciones con crédito completo.',
  },
  lesson_all: {
    nameEs: 'Curso completo',
    descEs: 'Las 32 lecciones al menos una vez con crédito.',
  },
  lesson_perfect: {
    nameEs: 'Sin un error',
    descEs:
      'Completa una lección sin respuestas marcadas como error y con ≥45 correctas.',
  },
  lesson_perfect3: {
    nameEs: 'Tres a la primera',
    descEs: 'Tres lecciones distintas sin ningún error registrado.',
  },
  lesson_all_perfect: {
    nameEs: 'Perfección absoluta',
    descEs: 'Las 32 lecciones perfectas: sin error en ninguna.',
  },

  xp_100: {
    nameEs: 'La primera centena',
    descEs: 'Acumula 100 XP en el total general.',
  },
  xp_250: {
    nameEs: '250 XP',
    descEs: '250 XP en total (da igual el origen).',
  },
  xp_500: {
    nameEs: 'Quinientos',
    descEs: '500 XP en el contador total.',
  },
  xp_1000: {
    nameEs: 'En el millar',
    descEs: '1.000 XP en total.',
  },
  xp_2500: {
    nameEs: '2.500 XP',
    descEs: '2.500 XP en total.',
  },
  xp_5000: {
    nameEs: 'Cinco mil',
    descEs: '5.000 XP en total.',
  },
  xp_10000: {
    nameEs: 'Diez mil',
    descEs: '10.000 XP en total.',
  },
  xp_20000: {
    nameEs: 'Veinte mil',
    descEs: '20.000 XP en total.',
  },
  xp_50000: {
    nameEs: 'Cincuenta mil',
    descEs: '50.000 XP en total.',
  },
  xp_100000: {
    nameEs: 'Leyenda',
    descEs: '100.000 XP en total.',
  },
  wager_win: {
    nameEs: 'Quien arriesga, gana',
    descEs:
      'Gana la apuesta a la racha: mantén la serie hasta el plazo sin caer por debajo del nivel del día de la apuesta.',
  },
  personal_best: {
    nameEs: 'Mejor semana',
    descEs:
      'Supera tu récord de puntos XP en una semana calendario.',
  },

  quiz_first: {
    nameEs: 'Primer cuestionario',
    descEs: 'Termina cualquier cuestionario al menos una vez (cualquier nivel).',
  },
  quiz_medium: {
    nameEs: 'Nivel medio',
    descEs: 'Lleva hasta el final un cuestionario en nivel Medium.',
  },
  quiz_hard: {
    nameEs: 'Reto aceptado',
    descEs: 'Completa un cuestionario en nivel Hard de principio a fin.',
  },
  quiz_all_levels: {
    nameEs: 'Todos los niveles',
    descEs: 'Al menos una vez Easy, Medium y Hard (tres sesiones distintas).',
  },
  quiz_perfect_easy: {
    nameEs: 'Fácil perfecto',
    descEs: 'Cuestionario Easy: todas las respuestas de esa sesión correctas.',
  },
  quiz_perfect: {
    nameEs: 'Nervios de acero',
    descEs: 'Cuestionario Hard sin ningún error en esa sesión.',
  },
  quiz_perfect_medium: {
    nameEs: 'Tiro certero',
    descEs: 'Cuestionario Medium: todas las respuestas de la sesión correctas.',
  },
  quiz_triple_perfect: {
    nameEs: 'Triple perfecto',
    descEs: 'Easy, Medium y Hard perfectos: un cuestionario impecable por nivel.',
  },
  quiz_speed_demon: {
    nameEs: 'A toda velocidad',
    descEs: 'Cinco veces termina por completo un cuestionario Hard (contador en la app).',
  },

  combo_3: {
    nameEs: 'En racha',
    descEs: '3 aciertos seguidos durante una lección.',
  },
  combo_10: {
    nameEs: 'Francotirador',
    descEs: '10 aciertos seguidos en pasos de lección.',
  },
  combo_20: {
    nameEs: 'Inquebrantable',
    descEs: '20 respuestas correctas seguidas sin fallar.',
  },
  combo_50: {
    nameEs: 'Máquina',
    descEs: '50 aciertos seguidos en una misma racha.',
  },
  combo_100: {
    nameEs: 'Invencible',
    descEs: '100 aciertos seguidos en una misma racha.',
  },
  daily_task_first: {
    nameEs: 'Primera tarea',
    descEs: 'Completa una de las tareas diarias en la pantalla de tareas.',
  },
  all_daily: {
    nameEs: 'Día completo',
    descEs: 'En un mismo día calendario, las tres tareas diarias hechas.',
  },
  daily_phrase_first: {
    nameEs: 'Frase del día',
    descEs: 'Abre la tarjeta de la frase del día y lee la explicación.',
  },
  daily_phrase_save: {
    nameEs: 'A la colección',
    descEs: 'Guarda la frase del día en tus tarjetas.',
  },

  login_7: {
    nameEs: 'Alumno fiel',
    descEs: '7 días seguidos abriendo la app (cadena de inicio de sesión).',
  },
  login_14: {
    nameEs: 'Dos semanas',
    descEs: '14 días seguidos abriendo la app.',
  },
  login_30: {
    nameEs: 'Un mes en la app',
    descEs: '30 días seguidos con al menos una visita al día.',
  },
  login_60: {
    nameEs: 'Dos meses',
    descEs: '60 días seguidos entrando cada día.',
  },
  login_365: {
    nameEs: 'Un año presente',
    descEs: '365 días seguidos con inicio de sesión diario.',
  },
  comeback: {
    nameEs: 'El retorno',
    descEs:
      'Vuelve tras ~7 o más días sin actividad: se activa el bono de vuelta.',
  },
  diagnosis: {
    nameEs: 'Diagnóstico hecho',
    descEs: 'Completa hasta el final el test de nivel.',
  },
  night_owl: {
    nameEs: 'Búho nocturno',
    descEs: 'Gana XP en la app entre las 23:00 y las 5:00 (hora local).',
  },
  early_bird: {
    nameEs: 'Madrugador',
    descEs: 'Gana XP entre las 5:00 y las 7:00 (hora local).',
  },

  gem_a1_ruby: {
    nameEs: 'A1 Rubí',
    descEs: 'Lecciones 1–8: cada una completada al menos 2 veces (crédito).',
  },
  gem_a1_emerald: {
    nameEs: 'A1 Esmeralda',
    descEs: 'Lecciones 1–8: mínimo 3 pasadas por lección.',
  },
  gem_a1_diamond: {
    nameEs: 'A1 Diamante',
    descEs: 'Lecciones 1–8: mínimo 4 pasadas por lección.',
  },
  gem_a2_ruby: {
    nameEs: 'A2 Rubí',
    descEs: 'Lecciones 9–16: mínimo 2 pasadas completas cada una.',
  },
  gem_a2_emerald: {
    nameEs: 'A2 Esmeralda',
    descEs: 'Lecciones 9–16: mínimo 3 pasadas por lección.',
  },
  gem_a2_diamond: {
    nameEs: 'A2 Diamante',
    descEs: 'Lecciones 9–16: mínimo 4 pasadas por lección.',
  },
  gem_b1_ruby: {
    nameEs: 'B1 Rubí',
    descEs: 'Lecciones 17–24: cada una con ≥2 pasadas.',
  },
  gem_b1_emerald: {
    nameEs: 'B1 Esmeralda',
    descEs: 'Lecciones 17–24: ≥3 pasadas por lección.',
  },
  gem_b1_diamond: {
    nameEs: 'B1 Diamante',
    descEs: 'Lecciones 17–24: ≥4 pasadas por lección.',
  },
  gem_b2_ruby: {
    nameEs: 'B2 Rubí',
    descEs: 'Lecciones 25–32: cada una con ≥2 créditos completos.',
  },
  gem_b2_emerald: {
    nameEs: 'B2 Esmeralda',
    descEs: 'Lecciones 25–32: ≥3 pasadas cada una.',
  },
  gem_b2_diamond: {
    nameEs: 'B2 Diamante',
    descEs: 'Lecciones 25–32: ≥4 pasadas por lección.',
  },

  exam_first: {
    nameEs: 'Examen rendido',
    descEs: 'Presenta el examen final de una lección al menos una vez.',
  },
  exam_ace: {
    nameEs: 'Sobresaliente',
    descEs: 'Consigue al menos 90 % en el examen de lección.',
  },

  flashcards_session: {
    nameEs: 'Todas en una visita',
    descEs:
      'En una sola visita a la colección, revisa cada tarjeta guardada (flashcards).',
  },
  recall_first: {
    nameEs: 'Lo recordé',
    descEs: 'Da tu primera respuesta correcta en el entrenador de repaso.',
  },
  recall_50: {
    nameEs: 'La memoria se fortalece',
    descEs: 'Consigue 50 respuestas correctas en el entrenador de repaso.',
  },
  arena_first_win: {
    nameEs: 'Primer duelo',
    descEs: 'Gana tu primer combate en la Arena.',
  },
  arena_10_wins: {
    nameEs: 'Diez victorias',
    descEs: 'Gana 10 combates en la Arena.',
  },
  shards_100: {
    nameEs: 'Coleccionista de fragmentos',
    descEs: 'Llega a un saldo de 100 fragmentos de conocimiento.',
  },

  gem_all_complete: {
    nameEs: 'Coleccionista de medallas',
    descEs:
      'Reúne la medalla superior (diamante) en los cuatro bloques A1, A2, B1 y B2.',
  },
  social_friend_first: {
    nameEs: 'Ya no vas solo',
    descEs: 'Añade tu primer amigo usando un código de invitación.',
  },
  social_friends_3: {
    nameEs: 'Tu propio grupo',
    descEs: 'Ten tres amigos en tu lista.',
  },
  social_friends_10: {
    nameEs: 'Imán social',
    descEs: 'Ten 10 amigos en tu lista.',
  },
  social_gift_send: {
    nameEs: 'Primer regalo',
    descEs: 'Envía un regalo a un amigo.',
  },
  social_gift_5: {
    nameEs: 'Generosidad constante',
    descEs: 'Envía 5 regalos a tus amigos.',
  },
  social_like_received: {
    nameEs: 'Te han visto',
    descEs: 'Recibe un me gusta de un amigo en uno de tus logros.',
  },
  arena_streak_5: {
    nameEs: 'Máquina de victorias',
    descEs: 'Gana 5 combates seguidos en la Arena.',
  },
  arena_streak_10: {
    nameEs: 'Fenómeno',
    descEs: 'Gana 10 combates seguidos en la Arena.',
  },
  arena_duel_friend: {
    nameEs: 'Duelo amistoso',
    descEs: 'Gana un duelo de Arena contra un amigo por invitación.',
  },
  arena_wager_win: {
    nameEs: 'Riesgo premiado',
    descEs: 'Apuesta fragmentos en un combate de Arena y gana.',
  },
  arena_wager_5: {
    nameEs: 'Aventurero profesional',
    descEs: 'Gana 5 apuestas en la Arena.',
  },
  trainer_session: {
    nameEs: 'Primera práctica',
    descEs: 'Completa tu primera sesión en Mi práctica.',
  },
  trainer_100_correct: {
    nameEs: 'Memoria de acero',
    descEs: 'Consigue 100 respuestas correctas en Mi práctica.',
  },
  avatar_custom: {
    nameEs: 'Rostro propio',
    descEs: 'Elige un avatar único para tu perfil.',
  },
  profile_themed: {
    nameEs: 'Perfil con estilo',
    descEs: 'Aplica un estilo visual a tu tarjeta de perfil.',
  },
  pack_purchased: {
    nameEs: 'Coleccionista',
    descEs: 'Compra tu primer paquete de tarjetas.',
  },
  pack_5_purchased: {
    nameEs: 'Bibliotecario',
    descEs: 'Compra 5 paquetes de tarjetas.',
  },
  share_achievement: {
    nameEs: 'Logro en voz alta',
    descEs: 'Comparte un logro desbloqueado.',
  },
  level_50: {
    nameEs: 'Nivel 50',
    descEs: 'Alcanza el nivel 50.',
  },
  xp_75000: {
    nameEs: '75K y subiendo',
    descEs: 'Acumula 75.000 XP en total.',
  },
  quiz_10_completed: {
    nameEs: 'Los primeros diez',
    descEs: 'Completa 10 sesiones de cuestionario.',
  },
  arena_streak_freeze: {
    nameEs: 'Plan astuto',
    descEs: 'Usa una congelación para proteger tu racha.',
  },
  wager_win_3: {
    nameEs: 'Tres de tres',
    descEs: 'Gana 3 apuestas de racha.',
  },
};
