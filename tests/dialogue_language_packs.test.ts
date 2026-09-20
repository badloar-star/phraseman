import { getPublicDialogScenarios, scenarioObjectives } from '../app/ai_dialog_scenarios';
import { DIALOGUE_LANGUAGE_PACKS, dialogueScenarioForTarget } from '../app/dialogue_language_packs';

const englishScenario = {
  id: 'coffee', category: 'everyday' as const, titleRu: 'Кофе', goalRu: 'Закажи кофе', role: 'a barista', setting: 'a café', goalEn: 'order coffee', cefr: 'A1' as const, icon: 'cafe', active: true, nextStepHintRu: 'Закажи кофе', objectives: [],
};

describe('dialogue language packs', () => {
  it('never supplies English content as a non-English pack fallback', () => {
    expect(Object.keys(DIALOGUE_LANGUAGE_PACKS).sort()).toEqual(['de', 'es', 'fr']);
    expect(dialogueScenarioForTarget(englishScenario, 'es')?.targetScenario?.title).toBeTruthy();
    expect(dialogueScenarioForTarget(englishScenario, 'fr')?.targetScenario?.title).toBeTruthy();
    expect(dialogueScenarioForTarget(englishScenario, 'de')?.targetScenario?.title).toBeTruthy();
  });

  it('has a complete native Spanish pack for every public scenario', () => {
    const pack = DIALOGUE_LANGUAGE_PACKS.es;
    expect(pack).toBeDefined();
    expect(Object.keys(pack!.scenarios).sort()).toEqual(getPublicDialogScenarios().map(({ id }) => id).sort());

    for (const englishScenario of getPublicDialogScenarios()) {
      const scenario = pack!.scenarios[englishScenario.id];
      expect([scenario.title, scenario.goal, scenario.role, scenario.setting, scenario.persona, scenario.hint, scenario.greeting]
        .every((value) => value.trim().length > 0)).toBe(true);
      expect(scenario.objectives.length).toBeGreaterThanOrEqual(4);
      expect(scenario.objectives.length).toBeLessThanOrEqual(7);
      expect(new Set(scenario.objectives.map(({ id }) => id)).size).toBe(scenario.objectives.length);
      expect(scenario.objectives.every(({ text }) => text.trim().length > 0)).toBe(true);
      expect(scenario.objectives.map(({ id }) => id)).toEqual(scenarioObjectives(englishScenario).map(({ id }) => id));
      expect([scenario.title, scenario.goal, scenario.role, scenario.setting, scenario.persona, scenario.hint, scenario.greeting, ...scenario.objectives.map(({ text }) => text)]
        .join(' ')).not.toMatch(/\b(the|with|your|you|please|would|should|this|that)\b/i);
    }
  });

  it('has a complete native French pack for every public scenario', () => {
    const pack = DIALOGUE_LANGUAGE_PACKS.fr;
    expect(pack).toBeDefined();
    expect(Object.keys(pack!.scenarios).sort()).toEqual(getPublicDialogScenarios().map(({ id }) => id).sort());

    for (const englishScenario of getPublicDialogScenarios()) {
      const scenario = pack!.scenarios[englishScenario.id];
      expect([scenario.title, scenario.goal, scenario.role, scenario.setting, scenario.persona, scenario.hint, scenario.greeting]
        .every((value) => value.trim().length > 0)).toBe(true);
      expect(scenario.objectives.length).toBeGreaterThanOrEqual(4);
      expect(scenario.objectives.length).toBeLessThanOrEqual(7);
      expect(new Set(scenario.objectives.map(({ id }) => id)).size).toBe(scenario.objectives.length);
      expect(scenario.objectives.every(({ text }) => text.trim().length > 0)).toBe(true);
      expect(scenario.objectives.map(({ id }) => id)).toEqual(scenarioObjectives(englishScenario).map(({ id }) => id));
      expect([scenario.title, scenario.goal, scenario.role, scenario.setting, scenario.persona, scenario.hint, scenario.greeting, ...scenario.objectives.map(({ text }) => text)]
        .join(' ')).not.toMatch(/\b(the|and|with|your|you|please|would|should|this|that)\b/i);
    }
  });

  it('keeps reused objective IDs bound to their Spanish scenario', () => {
    const scenarios = DIALOGUE_LANGUAGE_PACKS.es!.scenarios;
    const objective = (scenarioId: string, objectiveId: string) => scenarios[scenarioId].objectives.find(({ id }) => id === objectiveId)?.text;

    expect(objective('doctor_visit', 'say_how_long')).toMatch(/síntomas|consulta|desde cuándo/i);
    expect(objective('interview_experience', 'say_how_long')).toMatch(/practicas|experiencia/i);
    expect(objective('interview_experience', 'say_how_long')).not.toMatch(/síntomas|consulta médica/i);
    expect(objective('taxi', 'ask_price')).toMatch(/tarifa/i);
    expect(objective('coffee', 'ask_price')).toMatch(/café/i);
  });

  it('replaces French objective placeholders with distinct scenario-bound copy', () => {
    const frenchScenarios = DIALOGUE_LANGUAGE_PACKS.fr!.scenarios;
    const scenarios = Object.values(frenchScenarios);
    const objectives = scenarios.flatMap((scenario) => scenario.objectives.map(({ text }) => text));

    expect(objectives).not.toContain('Réalisez cette étape avec une phrase naturelle.');
    expect(objectives.join(' ')).not.toMatch(/Dans «.+», avancez vers ce but|\(étape \d+\)/);
    // Repeating an action across different scenes is valid; repeated goals
    // within one scene are not separately achievable.
    for (const scenario of scenarios) {
      expect(new Set(scenario.objectives.map(({ text }) => text)).size).toBe(scenario.objectives.length);
    }
    expect(frenchScenarios.coffee.objectives[0].text).toMatch(/boisson|café/i);
    expect(frenchScenarios.airport_checkin.objectives[0].text).toMatch(/passeport|réservation/i);
  });

  it('binds reused French objective IDs to the concrete scenario', () => {
    const scenarios = DIALOGUE_LANGUAGE_PACKS.fr!.scenarios;
    const objective = (scenarioId: string, objectiveId: string) => scenarios[scenarioId].objectives.find(({ id }) => id === objectiveId)?.text;

    expect(objective('doctor_visit', 'say_how_long')).toMatch(/symptômes|ressentez|depuis/i);
    expect(objective('interview_experience', 'say_how_long')).toMatch(/expérience|pratiquez/i);
    expect(objective('taxi', 'ask_price')).toMatch(/tarif|course/i);
    expect(objective('coffee', 'ask_price')).toMatch(/café|boisson/i);
    expect(objective('doctor_visit', 'say_how_long')).not.toEqual(objective('interview_experience', 'say_how_long'));
    expect(objective('taxi', 'ask_price')).not.toEqual(objective('coffee', 'ask_price'));
  });

  it('keeps target objectives as direct, scenario-specific learner actions', () => {
    for (const target of ['es', 'fr', 'de'] as const) {
      const scenarios = DIALOGUE_LANGUAGE_PACKS[target]!.scenarios;
      const objectiveText = Object.values(scenarios).flatMap((scenario) => scenario.objectives.map(({ text }) => text));
      expect(objectiveText.join(' ')).not.toMatch(/(?:En|Dans) «|\bSchritt \d+:/);
    }

    expect(scenariosFor('es').neighbour_morning_routine.objectives.find(({ id }) => id === 'say_day')?.text).toMatch(/durante el día/i);
    expect(scenariosFor('fr').neighbour_morning_routine.objectives.find(({ id }) => id === 'say_day')?.text).toMatch(/pendant la journée/i);
    expect(scenariosFor('es').train_station.objectives.find(({ id }) => id === 'say_destination')?.text).toMatch(/destino/i);
    expect(scenariosFor('es').airport_checkin.objectives.find(({ id }) => id === 'say_destination')?.text).toMatch(/vuelo/i);
    expect(scenariosFor('fr').salesman_talks_you_out.objectives.find(({ id }) => id === 'say_what_you_want')?.text).toMatch(/acheter/i);
  });

  it('has a complete native German pack for every public scenario', () => {
    const pack = DIALOGUE_LANGUAGE_PACKS.de;
    expect(pack).toBeDefined();
    expect(pack?.target).toBe('de');
    expect(pack?.speechLocale).toBe('de-DE');
    expect(Object.keys(pack!.scenarios).sort()).toEqual(getPublicDialogScenarios().map(({ id }) => id).sort());

    for (const englishScenario of getPublicDialogScenarios()) {
      const scenario = pack!.scenarios[englishScenario.id];
      expect([scenario.title, scenario.goal, scenario.role, scenario.setting, scenario.persona, scenario.hint, scenario.greeting]
        .every((value) => value.trim().length > 0)).toBe(true);
      expect(scenario.objectives.length).toBeGreaterThanOrEqual(4);
      expect(scenario.objectives.length).toBeLessThanOrEqual(7);
      expect(new Set(scenario.objectives.map(({ id }) => id)).size).toBe(scenario.objectives.length);
      expect(scenario.objectives.every(({ text }) => text.trim().length > 0)).toBe(true);
      expect(scenario.objectives.map(({ id }) => id)).toEqual(scenarioObjectives(englishScenario).map(({ id }) => id));
      if (['pharmacy', 'doctor_visit'].includes(englishScenario.id)) expect(scenario.safeFallback).toBeTruthy();
      else expect(scenario.safeFallback).toBeNull();
    }
  });

  it('keeps the placement interview about choosing a learning group, not a job', () => {
    for (const target of ['es', 'fr', 'de'] as const) {
      const scene = scenariosFor(target).interview_experience;
      expect(`${scene.role} ${scene.setting}`).toMatch(/tutor|format(?:eur|rice)|Kurs/i);
      expect(`${scene.setting} ${scene.greeting}`).not.toMatch(/trabajo|professionnel|recrutement|Vorstellungsgespräch|Bewerbung/i);
      expect(scene.objectives.find(({ id }) => id === 'ask_which_group')?.text).toMatch(/grupo|groupe|Gruppe/i);
    }
  });

  it('asks the video-call partner about their own current activity', () => {
    const action = (target: 'es' | 'fr') => scenariosFor(target).video_call_now.objectives.find(({ id }) => id === 'ask_what_they_do')?.text;
    expect(action('es')).toMatch(/Pregúntale qué está haciendo/);
    expect(action('fr')).toMatch(/votre ami ce qu’il fait en ce moment/);
  });

  it('uses the declared Spanish locale and idiomatic French actions', () => {
    const spanish = Object.values(scenariosFor('es')).map(scene => JSON.stringify(scene)).join(' ');
    expect(/abarrotes|meser[oa]|renta de autos|departamento compartido|Compra el boleto|Desea ordenar/.test(spanish)).toBe(false);
    const french = Object.values(scenariosFor('fr')).map(scene => JSON.stringify(scene)).join(' ');
    expect(/Faites votre arrivée|Faites une question|demandez pour l’assurance/.test(french)).toBe(false);
    expect(scenariosFor('fr').airport_checkin.objectives.find(({ id }) => id === 'say_destination')?.text).toMatch(/vol/i);
  });

  it('keeps German shared objective IDs and professional address scene-specific', () => {
    const scenes = scenariosFor('de');
    const objective = (scene: string, id: string) => scenes[scene].objectives.find(item => item.id === id)?.text;
    expect(objective('neighbour_morning_routine', 'say_day')).toMatch(/tagsüber/i);
    expect(objective('class_schedule_talk', 'say_day')).toMatch(/Wochentag/i);
    expect(objective('salesman_talks_you_out', 'say_what_you_want')).toMatch(/kaufen/i);
    expect(objective('surprise_guest_speech', 'say_why_you')).toMatch(/Person.*kennst/i);
    for (const id of ['doctor_visit', 'hotel_checkin', 'train_station', 'car_rental']) {
      expect(scenes[id].greeting).toMatch(/Sie/);
      expect(scenes[id].persona).toMatch(/„Sie“/);
    }
    expect(scenes.doctor_visit.safeFallback).toMatch(/keine Dosierung/);
  });
});

function scenariosFor(target: 'es' | 'fr' | 'de') {
  return DIALOGUE_LANGUAGE_PACKS[target]!.scenarios;
}

