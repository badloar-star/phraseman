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
  daily_all_3: {
    nameEs: 'Tres días en orden',
    descEs: 'Completa todas las tareas diarias durante 3 días seguidos.',
  },
  daily_all_7: {
    nameEs: 'Semana sin pendientes',
    descEs: 'Completa todas las tareas diarias durante 7 días seguidos.',
  },
  daily_no_reroll: {
    nameEs: 'Sin cambios',
    descEs: 'Completa todas las tareas del día sin reemplazar ninguna.',
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
  flashcards_save_25: {
    nameEs: 'Diccionario propio',
    descEs: 'Guarda 25 tarjetas en tu colección.',
  },
  flashcards_save_50: {
    nameEs: 'Archivista',
    descEs: 'Guarda 50 tarjetas en tu colección.',
  },
  flashcards_flip_100: {
    nameEs: 'Cien vueltas',
    descEs: 'Voltea tarjetas 100 veces durante el repaso.',
  },
  flashcards_view_7_days: {
    nameEs: 'Semana de tarjetas',
    descEs: 'Revisa tarjetas de la colección durante 7 días seguidos.',
  },
  flashcards_sources_4: {
    nameEs: 'Cuatro fuentes',
    descEs: 'Guarda tarjetas desde una lección o cuestionario, palabras, verbos y frase del día.',
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
  shards_spent_100: {
    nameEs: 'Fragmentos en acción',
    descEs: 'Gasta 100 fragmentos en total dentro de la app.',
  },
  energy_refill_first: {
    nameEs: 'Segundo aire',
    descEs: 'Recarga energía con fragmentos por primera vez.',
  },
  energy_refill_5: {
    nameEs: 'Carga completa',
    descEs: 'Recarga energía con fragmentos 5 veces.',
  },
  league_result_first: {
    nameEs: 'Resultado semanal',
    descEs: 'Recibe tu primer resultado semanal de liga.',
  },
  league_top3: {
    nameEs: 'En el top 3',
    descEs: 'Termina una semana en el top 3 de tu liga.',
  },
  league_champion: {
    nameEs: 'Primero del grupo',
    descEs: 'Termina una semana en el primer puesto del grupo de liga.',
  },
  league_promoted: {
    nameEs: 'Ascenso',
    descEs: 'Sube a una liga superior al cierre de la semana.',
  },
  league_diamond: {
    nameEs: 'Meta diamante',
    descEs: 'Llega a la liga Diamante o superior.',
  },
  league_boost_first: {
    nameEs: 'Semana acelerada',
    descEs: 'Activa tu primer impulso personal de puntos de liga.',
  },
  league_boost_5: {
    nameEs: 'Hábito turbo',
    descEs: 'Activa 5 impulsos personales de puntos de liga.',
  },
  league_boost_x3: {
    nameEs: 'Movimiento triple',
    descEs: 'Activa un impulso personal de liga con multiplicador x3.',
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
  social_gift_10: {
    nameEs: 'Gran generosidad',
    descEs: 'Envía 10 regalos a tus amigos.',
  },
  social_like_received: {
    nameEs: 'Te han visto',
    descEs: 'Recibe un me gusta de un amigo en uno de tus logros.',
  },
  social_likes_5: {
    nameEs: 'Cinco señales',
    descEs: 'Recibe 5 me gusta de amigos en tus logros.',
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
  trainer_7_days: {
    nameEs: 'Semana de práctica',
    descEs: 'Durante 7 días seguidos, da al menos una respuesta correcta en práctica.',
  },
  trainer_500_correct: {
    nameEs: 'Quinientas exactas',
    descEs: 'Consigue 500 respuestas correctas en entrenamientos.',
  },
  trainer_perfect_session: {
    nameEs: 'Sesión limpia',
    descEs: 'Termina un entrenamiento de 5+ preguntas sin errores.',
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
    descEs: 'Añade tu primer pack de tarjetas: compra, community o cupón.',
  },
  pack_5_purchased: {
    nameEs: 'Bibliotecario',
    descEs: 'Ten 5 packs de tarjetas en tu colección.',
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
    nameEs: 'Tres apuestas ganadas',
    descEs: 'Gana 3 apuestas en la Arena en total.',
  },
  streak_150: { nameEs: 'Ciento cincuenta', descEs: 'Consigue XP durante 150 días seguidos.' },
  streak_250: { nameEs: 'Un cuarto de mil', descEs: 'Mantén la racha de actividad durante 250 días seguidos.' },
  streak_750: { nameEs: '750 días', descEs: 'Consigue XP durante 750 días seguidos.' },
  streak_1000: { nameEs: 'Mil días', descEs: 'Mantén la racha de actividad durante 1000 días seguidos.' },
  streak_clean_365: { nameEs: 'Año limpio', descEs: 'Mantén 365 días de racha sin reparación ni congelación en ese tramo.' },
  perfect_month: { nameEs: 'Mes sin huecos', descEs: 'Consigue XP cada día de un mismo mes natural.' },
  night_week: { nameEs: 'Turno de noche', descEs: 'Consigue XP de noche durante 7 días seguidos, de 23:00 a 5:00.' },
  early_week: { nameEs: 'Modo temprano', descEs: 'Consigue XP temprano durante 7 días seguidos, de 5:00 a 7:00.' },
  lesson_all_2x: { nameEs: 'Segunda vuelta', descEs: 'Completa las 32 lecciones al menos 2 veces cada una.' },
  lesson_all_3x: { nameEs: 'Curso triple', descEs: 'Completa las 32 lecciones al menos 3 veces cada una.' },
  lesson_all_5x: { nameEs: 'Quinta vuelta', descEs: 'Completa las 32 lecciones al menos 5 veces cada una.' },
  lesson_perfect10: { nameEs: 'Diez perfectas', descEs: 'Completa 10 lecciones distintas sin ningún error en el progreso.' },
  lesson_b2_perfect: { nameEs: 'B2 sin errores', descEs: 'Completa perfectamente las lecciones 29-32, sin errores.' },
  lesson_marathon_day: { nameEs: 'Maratón de estudio', descEs: 'Completa 10 lecciones distintas en un mismo día.' },
  lesson_all_perfect_2x: { nameEs: 'Absoluto II', descEs: 'Completa perfectamente las 32 lecciones al menos 2 veces cada una.' },
  xp_150000: { nameEs: '150K XP', descEs: 'Acumula 150.000 XP en total.' },
  xp_250000: { nameEs: 'Un cuarto de millón', descEs: 'Acumula 250.000 XP en total.' },
  xp_500000: { nameEs: 'Medio millón', descEs: 'Acumula 500.000 XP en total.' },
  xp_750000: { nameEs: 'Tres cuartos', descEs: 'Acumula 750.000 XP en total.' },
  xp_1000000: { nameEs: 'Millonario de XP', descEs: 'Acumula 1.000.000 XP en total.' },
  xp_2000000: { nameEs: 'Dos millones', descEs: 'Acumula 2.000.000 XP en total.' },
  weekly_xp_5000: { nameEs: 'Semana de 5K', descEs: 'Consigue 5.000 XP en una semana natural.' },
  weekly_xp_10000: { nameEs: 'Semana brutal', descEs: 'Consigue 10.000 XP en una semana natural.' },
  wager_win_10: { nameEs: 'Mano fría', descEs: 'Gana 10 apuestas en la Arena en total.' },
  quiz_25_completed: { nameEs: '25 cuestionarios', descEs: 'Completa 25 sesiones de cuestionario.' },
  quiz_50_completed: { nameEs: '50 cuestionarios', descEs: 'Completa 50 sesiones de cuestionario.' },
  quiz_100_completed: { nameEs: 'Cien cuestionarios', descEs: 'Completa 100 sesiones de cuestionario.' },
  quiz_hard_10: { nameEs: 'Diez Hard', descEs: 'Completa 10 cuestionarios Hard.' },
  quiz_hard_25: { nameEs: 'Habitante de Hard', descEs: 'Completa 25 cuestionarios Hard.' },
  quiz_hard_perfect_3: { nameEs: 'Tres Hard perfectos', descEs: 'Completa 3 cuestionarios Hard sin errores.' },
  quiz_hard_perfect_10: { nameEs: 'Diez sin fallo', descEs: 'Completa 10 cuestionarios Hard sin errores.' },
  quiz_perfect_7_days: { nameEs: 'Semana perfecta de quiz', descEs: 'Completa un cuestionario sin errores durante 7 días seguidos.' },
  quiz_all_levels_perfect_same_day: { nameEs: 'Tres coronas en un día', descEs: 'Completa Easy, Medium y Hard sin errores en un mismo día.' },
  combo_150: { nameEs: '150 seguidas', descEs: 'Consigue 150 respuestas correctas seguidas en una serie.' },
  combo_250: { nameEs: 'Ritmo inhumano', descEs: 'Consigue 250 respuestas correctas seguidas en una serie.' },
  combo_500: { nameEs: 'Error prohibido', descEs: 'Consigue 500 respuestas correctas seguidas en una serie.' },
  daily_all_14: { nameEs: 'Dos semanas en orden', descEs: 'Completa todas las tareas diarias durante 14 días seguidos.' },
  daily_all_30: { nameEs: '30 días sin pendientes', descEs: 'Completa todas las tareas diarias durante 30 días seguidos.' },
  daily_no_reroll_7: { nameEs: 'Semana sin cambios', descEs: 'Completa todas las tareas sin cambiar ninguna durante 7 días seguidos.' },
  daily_no_reroll_30: { nameEs: 'Sin negociar', descEs: 'Completa todas las tareas sin cambiar ninguna durante 30 días seguidos.' },
  daily_phrase_read_30: { nameEs: '30 frases del día', descEs: 'Abre y lee 30 frases del día.' },
  daily_phrase_save_30: { nameEs: 'Frases en reserva', descEs: 'Guarda 30 frases del día en tarjetas.' },
  daily_phrase_save_100: { nameEs: 'Cien frases guardadas', descEs: 'Guarda 100 frases del día en tarjetas.' },
  login_100: { nameEs: '100 entradas seguidas', descEs: 'Abre la app durante 100 días seguidos.' },
  login_200: { nameEs: '200 entradas seguidas', descEs: 'Abre la app durante 200 días seguidos.' },
  exam_ace_5: { nameEs: 'Cinco exámenes excelentes', descEs: 'Consigue al menos 90% en 5 exámenes.' },
  exam_ace_10: { nameEs: 'Diez excelentes', descEs: 'Consigue al menos 90% en 10 exámenes.' },
  flashcards_save_100: { nameEs: '100 tarjetas', descEs: 'Guarda 100 tarjetas en tu colección.' },
  flashcards_save_250: { nameEs: 'Gran archivo', descEs: 'Guarda 250 tarjetas en tu colección.' },
  flashcards_flip_500: { nameEs: '500 vueltas', descEs: 'Voltea tarjetas 500 veces al repasar.' },
  flashcards_flip_1000: { nameEs: 'Mil vueltas', descEs: 'Voltea tarjetas 1000 veces al repasar.' },
  flashcards_view_14_days: { nameEs: 'Dos semanas de tarjetas', descEs: 'Revisa tarjetas durante 14 días seguidos.' },
  flashcards_view_30_days: { nameEs: 'Mes de tarjetas', descEs: 'Revisa tarjetas durante 30 días seguidos.' },
  arena_25_wins: { nameEs: '25 victorias de Arena', descEs: 'Gana 25 combates de Arena.' },
  arena_50_wins: { nameEs: '50 victorias de Arena', descEs: 'Gana 50 combates de Arena.' },
  arena_100_wins: { nameEs: '100 victorias de Arena', descEs: 'Gana 100 combates de Arena.' },
  arena_streak_15: { nameEs: '15 victorias seguidas', descEs: 'Gana 15 combates seguidos en la Arena.' },
  arena_streak_25: { nameEs: '25 victorias seguidas', descEs: 'Gana 25 combates seguidos en la Arena.' },
  arena_wager_10: { nameEs: '10 apuestas de Arena', descEs: 'Gana 10 apuestas en la Arena.' },
  arena_wager_25: { nameEs: '25 apuestas de Arena', descEs: 'Gana 25 apuestas en la Arena.' },
  shards_250: { nameEs: '250 fragmentos', descEs: 'Lleva tu saldo a 250 fragmentos de conocimiento.' },
  shards_500: { nameEs: '500 fragmentos', descEs: 'Lleva tu saldo a 500 fragmentos de conocimiento.' },
  shards_1000: { nameEs: 'Mil fragmentos', descEs: 'Lleva tu saldo a 1000 fragmentos de conocimiento.' },
  shards_spent_500: { nameEs: '500 fragmentos usados', descEs: 'Gasta 500 fragmentos en total.' },
  shards_spent_1000: { nameEs: 'Gran circulación', descEs: 'Gasta 1000 fragmentos en total.' },
  energy_refill_10: { nameEs: '10 recargas', descEs: 'Recarga energía con fragmentos 10 veces.' },
  energy_refill_25: { nameEs: '25 recargas', descEs: 'Recarga energía con fragmentos 25 veces.' },
  league_top3_5: { nameEs: 'Cinco semanas en top 3', descEs: 'Termina 5 semanas en el top 3 de tu liga.' },
  league_champion_5: { nameEs: 'Cinco campeonatos', descEs: 'Termina 5 semanas primero en tu grupo de liga.' },
  league_champion_10: { nameEs: 'Diez campeonatos', descEs: 'Termina 10 semanas primero en tu grupo de liga.' },
  league_diamond_4_weeks: { nameEs: 'Mes en Diamante', descEs: 'Consigue 4 resultados semanales seguidos en Diamante o superior.' },
  social_friends_25: { nameEs: '25 amigos', descEs: 'Ten 25 amigos en tu lista.' },
  social_friends_50: { nameEs: '50 amigos', descEs: 'Ten 50 amigos en tu lista.' },
  social_gift_25: { nameEs: '25 regalos', descEs: 'Envía 25 regalos a tus amigos.' },
  social_gift_100: { nameEs: '100 regalos', descEs: 'Envía 100 regalos a tus amigos.' },
  social_likes_25: { nameEs: '25 likes', descEs: 'Recibe 25 likes de amigos en tus logros.' },
  social_likes_100: { nameEs: '100 likes', descEs: 'Recibe 100 likes de amigos en tus logros.' },
  trainer_1000_correct: { nameEs: '1000 exactas', descEs: 'Consigue 1000 respuestas correctas en entrenamientos.' },
  trainer_2500_correct: { nameEs: '2500 exactas', descEs: 'Consigue 2500 respuestas correctas en entrenamientos.' },
  trainer_10000_correct: { nameEs: '10000 exactas', descEs: 'Consigue 10000 respuestas correctas en entrenamientos.' },
  trainer_perfect_10_sessions: { nameEs: '10 prácticas limpias', descEs: 'Termina 10 entrenamientos de 5+ preguntas sin errores.' },
  trainer_perfect_50_sessions: { nameEs: '50 prácticas limpias', descEs: 'Termina 50 entrenamientos de 5+ preguntas sin errores.' },
  pack_10_purchased: { nameEs: '10 packs', descEs: 'Ten 10 packs de tarjetas en tu colección.' },
  pack_25_purchased: { nameEs: '25 packs', descEs: 'Ten 25 packs de tarjetas en tu colección.' },
  share_achievement_10: { nameEs: '10 victorias compartidas', descEs: 'Comparte 10 logros desbloqueados.' },
  gem_a1_obsidian: { nameEs: 'A1 obsidiana', descEs: 'Lecciones 1-8: cada una completada al menos 7 veces.' },
  gem_a1_mythic: { nameEs: 'A1 mítica', descEs: 'Lecciones 1-8: cada una completada al menos 10 veces.' },
  gem_a2_obsidian: { nameEs: 'A2 obsidiana', descEs: 'Lecciones 9-18: cada una completada al menos 7 veces.' },
  gem_a2_mythic: { nameEs: 'A2 mítica', descEs: 'Lecciones 9-18: cada una completada al menos 10 veces.' },
  gem_b1_obsidian: { nameEs: 'B1 obsidiana', descEs: 'Lecciones 19-28: cada una completada al menos 7 veces.' },
  gem_b1_mythic: { nameEs: 'B1 mítica', descEs: 'Lecciones 19-28: cada una completada al menos 10 veces.' },
  gem_b2_obsidian: { nameEs: 'B2 obsidiana', descEs: 'Lecciones 29-32: cada una completada al menos 7 veces.' },
  gem_b2_mythic: { nameEs: 'B2 mítica', descEs: 'Lecciones 29-32: cada una completada al menos 10 veces.' },
  gem_all_obsidian: { nameEs: 'Todas obsidianas', descEs: 'Consigue la medalla obsidiana en A1, A2, B1 y B2.' },
  gem_all_mythic: { nameEs: 'Todas míticas', descEs: 'Consigue la medalla mítica en A1, A2, B1 y B2.' },
};
