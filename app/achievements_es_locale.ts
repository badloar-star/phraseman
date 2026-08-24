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
  comeback: {
    nameEs: 'El retorno',
    descEs:
      'Vuelve tras ~7 o más días sin actividad: se activa el bono de vuelta.',
  },
  shards_100: {
    nameEs: 'Coleccionista de perlas',
    descEs: 'Llega a un saldo de 100 perlas.',
  },
  league_champion: {
    nameEs: 'Primero del grupo',
    descEs: 'Termina una semana en el primer puesto del grupo de liga.',
  },
  league_diamond: {
    nameEs: 'Meta diamante',
    descEs: 'Llega a la liga Diamante o superior.',
  },
  xp_75000: {
    nameEs: '75K y subiendo',
    descEs: 'Acumula 75.000 XP en total.',
  },
  streak_150: { nameEs: 'Ciento cincuenta', descEs: 'Consigue XP durante 150 días seguidos.' },
  streak_250: { nameEs: 'Un cuarto de mil', descEs: 'Mantén la racha de actividad durante 250 días seguidos.' },
  streak_750: { nameEs: '750 días', descEs: 'Consigue XP durante 750 días seguidos.' },
  streak_1000: { nameEs: 'Mil días', descEs: 'Mantén la racha de actividad durante 1000 días seguidos.' },
  streak_clean_365: { nameEs: 'Año limpio', descEs: 'Mantén 365 días de racha sin reparación ni congelación en ese tramo.' },
  xp_150000: { nameEs: '150K XP', descEs: 'Acumula 150.000 XP en total.' },
  xp_250000: { nameEs: 'Un cuarto de millón', descEs: 'Acumula 250.000 XP en total.' },
  xp_500000: { nameEs: 'Medio millón', descEs: 'Acumula 500.000 XP en total.' },
  xp_750000: { nameEs: 'Tres cuartos', descEs: 'Acumula 750.000 XP en total.' },
  xp_1000000: { nameEs: 'Millonario de XP', descEs: 'Acumula 1.000.000 XP en total.' },
  xp_2000000: { nameEs: 'Dos millones', descEs: 'Acumula 2.000.000 XP en total.' },
  shards_250: { nameEs: '250 perlas', descEs: 'Lleva tu saldo a 250 perlas.' },
  shards_500: { nameEs: '500 perlas', descEs: 'Lleva tu saldo a 500 perlas.' },
  shards_1000: { nameEs: 'Mil perlas', descEs: 'Lleva tu saldo a 1000 perlas.' },
  league_champion_5: { nameEs: 'Cinco campeonatos', descEs: 'Termina 5 semanas primero en tu grupo de liga.' },
  league_champion_10: { nameEs: 'Diez campeonatos', descEs: 'Termina 10 semanas primero en tu grupo de liga.' },
  league_diamond_4_weeks: { nameEs: 'Mes en Diamante', descEs: 'Consigue 4 resultados semanales seguidos en Diamante o superior.' },
};
