import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const fixes = {
  'it-b2-009': {
    answer: 'Non ho verificato il controllo e me ne assumo la responsabilità. Domani pubblichiamo solo la parte verificata o rinviamo tutto di due giorni.',
    distractors: {
      'Pubblicheremo tutto domani e nasconderemo che manca il controllo.': 'Pubblicheremo tutto domani senza eseguire il controllo e senza informare nessuno del rischio, così il calendario resterà formalmente invariato.',
      'La pubblicazione è cancellata per sempre e nessuno può fare nulla.': 'Cancello definitivamente l’intera pubblicazione senza valutare la parte già verificata, proporre un breve rinvio o chiedere una decisione condivisa.',
    },
  },
  'it-b2-017': {
    answer: 'Il verbale registra tre firme e una ancora pendente. Serve prima della pubblicazione: attendiamo o procediamo senza la quarta sede.',
    distractors: {
      'Ha sicuramente ragione; non importa che manchi una firma obbligatoria.': 'Ha sicuramente ragione: dichiariamo che tutte le sedi hanno firmato e pubblichiamo subito, senza correggere il verbale né considerare la firma ancora pendente.',
    },
  },
  'it-b2-020': {
    answer: 'Marta integra le osservazioni entro giovedì alle 16; Luca invia gli allegati entro mercoledì. Confermate?',
    distractors: {
      'Qualcuno si occuperà delle osservazioni quando avrà tempo.': 'Qualcuno integrerà le osservazioni quando avrà tempo; Luca cercherà gli allegati, ma non fissiamo proprietari, date o una conferma comune.',
      'Le osservazioni sono importanti; ne riparleremo in futuro.': 'Le osservazioni sono importanti, ma rinviamo ogni assegnazione e ogni scadenza a una riunione futura di cui non stabiliamo né data né partecipanti.',
    },
  },
  'it-b2-029': {
    answer: 'Ci scusiamo per i tre giorni di invisibilità. La richiesta era nella coda sbagliata: oggi la riassegniamo e confermiamo i nuovi tempi.',
    distractors: {
      "Sì, l'abbiamo cancellata volontariamente, anche se il registro dice il contrario.": 'Confermiamo di aver cancellato volontariamente la richiesta tre giorni fa e rifiutiamo di ripristinarla, sebbene il registro dimostri che era soltanto nella coda sbagliata.',
    },
  },
  'it-b2-040': {
    answer: 'Sei membri approvano l’avvio immediato; due lo approvano solo dopo una verifica indipendente. Nessuno si oppone.',
    distractors: {
      "Il gruppo approva all'unanimità un avvio immediato e senza condizioni.": 'Il gruppo approva all’unanimità un avvio immediato e senza condizioni; i due membri che chiedono una verifica indipendente hanno rinunciato alla loro condizione.',
      'Non esiste alcun accordo perché le condizioni non sono identiche.': 'Non esiste alcun accordo e tutti rifiutano il progetto, perché due membri chiedono una verifica indipendente prima di sostenere l’avvio immediato.',
    },
  },
  'it-c1-008': {
    answer: 'Fermiamoci: accusare i nuovi assunti senza dati è ingiusto. Analizziamo errori, processi e cause documentate, caso per caso.',
    distractors: {
      'Lasciamo continuare e verifichiamo più tardi se qualcuno si è sentito offeso.': 'Lasciamo continuare l’accusa e verifichiamo solo più tardi se qualcuno si è offeso, senza esaminare dati, processi o cause concrete.',
    },
  },
  'it-c1-028': {
    answer: 'Le interfacce sono una causa comune, ma ogni referente documenti oggi la propria fase; domani il responsabile assegni le correzioni.',
    distractors: {
      'Poiché la causa era condivisa, nessuna responsabilità può essere individuata.': 'Poiché le interfacce sono una causa comune, nessuno deve documentare la propria fase e il responsabile non deve assegnare correzioni o scadenze.',
    },
  },
  'it-c1-030': {
    answer: 'Domani pubblichiamo i dati verificati e indichiamo la data prevista per integrare le parti ancora aperte: informiamo tempestivamente, rinunciando per ora alla completezza.',
    distractorIndexes: {
      0: 'Le due opzioni estreme sono le sole logicamente possibili: o pubblichiamo immediatamente ogni dato, anche se non verificato, oppure rinunciamo per sempre a comunicare qualsiasi informazione, senza considerare soluzioni intermedie.',
    },
    distractors: {
      'Pubblichiamo tutto senza indicare che alcuni numeri non sono verificati.': 'Pubblichiamo domani anche i dati non verificati senza indicare le aree aperte, la data dell’integrazione o il rischio di informare il pubblico in modo incompleto.',
      'Non comunichiamo mai nulla, neppure dopo la verifica completa.': 'Non comunichiamo alcun dato finché ogni dettaglio non sarà completo, senza considerare il costo dell’attesa, una pubblicazione parziale o una data per l’integrazione.',
    },
  },
  'it-c1-032': {
    answer: 'La previsione contiene un doppio conteggio e mi assumo la responsabilità di correggerla. L’entità dipende da tre contratti: oggi presenterò tre scenari; domani non usate la vecchia cifra.',
    distractorIndexes: {
      0: 'La previsione è forse un po’ diversa, ma oggi il consiglio può usare tranquillamente la cifra precedente senza conoscere i tre contratti, i nuovi scenari, la responsabilità della correzione o l’effetto preciso del doppio conteggio sulla decisione di domani.',
      1: 'L’intero progetto è certamente fallito e tutti i ricavi futuri saranno pari a zero: annulliamo subito ogni decisione senza verificare i tre contratti, ricostruire il doppio conteggio o presentare scenari alternativi al consiglio.',
    },
  },
  'it-c1-034': {
    answer: 'Mi permetto di precisare: secondo il rapporto confermato, due sedi hanno superato il controllo, mentre la sede Nord deve ripetere una prova. Per rilasciare l’autorizzazione comune, dobbiamo quindi escludere la sede Nord oppure rinviare la decisione.',
    distractorIndexes: {
      0: 'È falso; evidentemente non ha letto con attenzione il rapporto e non merita ulteriori spiegazioni. Respingo quindi la sua affermazione senza citare i risultati delle tre sedi, la prova da ripetere al Nord o le opzioni disponibili per l’autorizzazione comune.',
      1: 'Ha certamente ragione: dichiariamo che tutte le sedi hanno superato il controllo e rilasciamo subito l’autorizzazione comune, senza menzionare la prova mancante della sede Nord, il contenuto del rapporto confermato né le conseguenze di quella verifica ancora incompleta.',
      2: 'Il rapporto conferma che tutte e tre le sedi hanno superato il controllo; autorizziamole insieme senza ricordare la prova che Nord deve ancora ripetere.',
    },
  },
  'it-c1-038': {
    answer: 'Pilota reversibile sul 10% per quattro settimane: Marta monitora la sicurezza, fermiamo alla soglia concordata e decidiamo il 5 settembre sui dati.',
    distractors: {
      "Avviamo subito ovunque: l'incertezza sparirà quando il sistema sarà già in uso.": 'Avviamo subito il sistema su tutti i casi: Marta non deve monitorare la sicurezza, non definiamo soglie di arresto e decidiamo l’estensione dopo che sarà irreversibile.',
      'Rinviamo senza scadenza finché non avremo la certezza assoluta.': 'Rinviamo senza scadenza finché non avremo la certezza assoluta, senza nominare un responsabile, fissare indicatori di sicurezza o stabilire una data per la decisione.',
    },
  },
  'it-c2-031': {
    answer: 'Inseriamo nel punto originale una nota datata: l’affermazione è stata rimossa perché falsa e non supportata, senza ripeterla.',
    distractors: {
      "Ripetiamo integralmente l'accusa falsa nel titolo e sui social per attirare attenzione sulla correzione.": 'Ripetiamo integralmente l’accusa falsa nel titolo, sui social e nella nota di correzione, così tutti ricorderanno il contenuto non supportato che volevamo rimuovere.',
    },
  },
  'it-c2-033': {
    answer: 'Il termine «progetto pilota» era ambiguo. Sospendiamo l’uso di dati reali e definiamo per iscritto se il pilota si svolgerà internamente o con dieci clienti, oltre a responsabilità e ripartizione dei costi già sostenuti.',
    distractorIndexes: {
      0: 'La nostra interpretazione è l’unica possibile: continuiamo subito con dati reali e con tutti i clienti, ignoriamo i costi già sostenuti dall’altra parte e non definiamo per iscritto né l’ambiente del progetto pilota, né il numero dei partecipanti, né le responsabilità o la ripartizione dei costi prima di riprendere.',
      1: 'Avviamo subito con dati reali e discutiamo il significato soltanto dopo, senza definire ambiente, responsabilità o ripartizione dei costi già sostenuti.',
      2: 'Annulliamo tutto senza esaminare se il termine possa essere chiarito.',
    },
  },
  'it-c2-037': {
    answer: 'La maggioranza approva il piano; la minoranza lo sosterrà solo se un controllo indipendente precederà l’avvio.',
    distractors: {
      'Il comitato approva unanimemente il piano con qualche riserva informale.': 'Il comitato approva unanimemente e senza condizioni il piano: la richiesta della minoranza di un controllo indipendente non modifica in alcun modo il suo sostegno.',
    },
  },
  'fr-a2-006': {
    distractorIndexes: {
      0: 'Je vous écris au sujet de mon séjour afin que vous changiez immédiatement ma réservation comme vous le jugerez utile, sans autre information de ma part.',
      1: 'Mon train est annulé et je ne peux pas venir le 12 juin. Annulez définitivement ma réservation : je ne reviendrai jamais dans votre hôtel.',
    },
  },
  'fr-a2-015': {
    distractorIndexes: {
      0: "D'accord, je paierai les 90 euros ainsi que n'importe quel supplément de déplacement, de main-d'œuvre ou de pièces que vous ajouterez ensuite.",
      1: 'Avant de parler du devis, pourriez-vous expliquer pourquoi votre entreprise existe, qui a choisi son nom et depuis combien de temps elle travaille dans cette ville ?',
    },
  },
  'fr-a2-016': {
    distractorIndexes: {
      1: "Bonjour, je voudrais annuler demain après-midi un rendez-vous que je n'ai pas pris, puis en reprendre un autre sans préciser l'heure.",
    },
  },
  'fr-a2-020': {
    distractorIndexes: {
      0: 'Bonjour, votre magasin vend toujours des appareils horribles et inutiles, et je veux que vous cessiez immédiatement de vendre toutes les bouilloires de cette marque !',
      1: 'La bouilloire est un appareil de cuisine qui sert à faire chauffer de l’eau pour préparer du thé, du café ou d’autres boissons chaudes.',
    },
  },
  'fr-a2-026': {
    distractorIndexes: {
      2: "J'ai un rendez-vous demain, donc effacez le cours d'hier.",
    },
  },
  'fr-a2-036': {
    distractorIndexes: {
      0: "Tu t'inquiètes vraiment pour rien : les entretiens sont faciles, alors arrête simplement d'y penser et ne prépare surtout aucune réponse pour demain.",
    },
  },
  'fr-a2-038': {
    distractorIndexes: {
      1: "Un seul ordinateur est cassé, tous les autres appareils se connectent normalement et la box est complètement éteinte depuis le début de la panne.",
    },
  },
  'fr-a2-040': {
    distractorIndexes: {
      0: "La réunion de mardi à 15 h n'existe plus : je l'annule pour tout le monde sans proposer d'autre horaire et sans attendre votre confirmation. Au revoir.",
    },
  },
  'fr-b1-027': {
    distractorIndexes: {
      0: 'Des membres du grand public qui découvrent le cours pour la première fois et n’ont participé à aucun atelier précédent.',
    },
  },
  'fr-b1-009': {
    answer: 'Le composant indispensable est arrivé avec deux jours de retard : les tests finiront mercredi. Nous réorganisons le planning et je ferai un point avant 16 h.',
    distractorIndexes: {
      0: 'Tout est encore en retard à cause des autres services et de ce fournisseur qui ne respecte jamais rien ; nous finirons donc un jour quelconque, mais je ne peux donner ni nouvelle date ni prochain point d’avancement.',
    },
  },
  'fr-b1-018': {
    answer: 'Je dois respecter l’ordre normal, mais je peux vérifier tout de suite que ton dossier est complet.',
    distractorIndexes: {
      0: 'Bien sûr, je vais discrètement placer ta demande avant toutes celles déposées plus tôt ; personne ne saura que j’ai changé l’ordre officiel pour te rendre service.',
      1: 'Je refuse même de regarder si ton dossier est complet ou de t’expliquer la procédure, puisque tu as demandé un traitement prioritaire qui n’est prévu par aucune règle.',
    },
  },
  'fr-b1-020': {
    answer: 'Je propose un essai d’un mois, deux jours par semaine, pas la fermeture du bureau.',
    distractorIndexes: {
      0: 'Oui, je veux supprimer immédiatement tous les bureaux, interdire définitivement le travail sur place et imposer le télétravail complet sans période d’essai.',
      1: 'Tu n’as absolument rien compris à ce que je viens de proposer, donc la discussion est terminée et je refuse de préciser la durée ou le nombre de jours concernés.',
      2: 'Le télétravail existe déjà dans plusieurs entreprises de notre secteur et beaucoup de salariés utilisent parfois leur domicile comme lieu de travail.',
    },
  },
  'fr-b1-028': {
    answer: 'La structure est claire. Ajoute l’unité et la période au graphique, puis relisons la légende.',
    distractorIndexes: {
      2: 'Refais toute la présentation dans un autre style, change les couleurs, les polices et l’ordre de toutes les diapositives, sans corriger l’unité ni la période absentes du graphique principal.',
    },
  },
  'fr-b1-029': {
    answer: 'Après mes demandes des 5 et 19 mai, le double prélèvement figure encore sur trois mois. Merci de transmettre le dossier à la facturation et de confirmer le délai de correction et de remboursement.',
    distractorIndexes: {
      0: 'Vous me volez certainement chaque mois depuis des années, même si je ne dispose que de trois relevés concernés ; remboursez immédiatement toutes les sommes que j’imagine avoir payées et répondez-moi dans les cinq prochaines minutes.',
      1: 'J’ai peut-être un problème quelque part sur mes factures, mais je ne sais ni quelle somme ni quelle période sont concernées ; je ne mentionne pas mes deux demandes précédentes et je ne sollicite aucune correction précise.',
    },
  },
  'fr-b2-010': {
    distractorIndexes: {
      1: 'aurait vérifié',
    },
  },
  'fr-b2-035': {
    distractorIndexes: {
      0: 'Certains usagers aiment attendre longtemps parce qu’ils peuvent lire, regarder leur téléphone ou discuter pendant la file, mais cette préférence personnelle ne concerne pas la justification de l’obligation.',
    },
  },
  'fr-b2-009': {
    answer: 'Nous avons détecté tardivement une erreur de calcul : la corriger reporte le lancement de trois jours, mais l’ignorer fausserait les résultats. Nous assumons cette erreur et proposons de décaler ou de réduire le lancement après information des clients.',
    distractorIndexes: {
      0: 'Un problème est peut-être apparu quelque part dans les calculs, mais personne dans notre équipe n’en est responsable et il n’aura certainement aucun impact sur les résultats des clients ; nous conservons donc la date annoncée sans corriger, expliquer ni proposer la moindre option.',
    },
  },
  'fr-b2-018': {
    answer: 'Les 20 % ne sont pas confirmés : le modèle préliminaire estime 8 à 22 %, une fourchette à vérifier sur des données réelles.',
    distractorIndexes: {
      0: 'J’écris que 20 % d’économies sont définitivement confirmées, sans mentionner le caractère préliminaire du modèle, l’absence de données réelles ni la fourchette de 8 à 22 %, puisque ce chiffre est le plus convaincant.',
    },
  },
  'fr-b2-028': {
    answer: 'Deux faits sont établis : le temps baisse et les erreurs augmentent. Testons un petit groupe avec un seuil d’erreur fixé à l’avance pour savoir si elles sont temporaires, puis décidons.',
    distractorIndexes: {
      0: 'L’équipe favorable à l’arrêt a forcément raison et l’autre doit se taire : supprimons immédiatement le pilote sans examiner si les erreurs diminuent avec l’habitude, sans seuil défini et sans nouvelle observation.',
      1: 'Puisque le temps moyen a diminué, les erreurs observées n’existent pas vraiment et ne doivent ni être mesurées ni discutées ; généralisons donc le pilote sans petit groupe, sans seuil d’erreur et sans date de décision.',
    },
  },
  'fr-b2-040': {
    answer: 'Le pilote est approuvé par tous ; trois membres ne soutiennent un démarrage lundi que si un contrôle indépendant est nommé avant vendredi.',
    distractorIndexes: {
      0: 'Le groupe approuve unanimement et sans aucune condition le démarrage lundi ; les trois membres qui demandaient la nomination d’un contrôle indépendant avant vendredi ont abandonné cette exigence et soutiennent désormais la date quoi qu’il arrive.',
      1: 'Trois membres refusent définitivement tout pilote, même si un contrôle indépendant est nommé avant vendredi ; ils rejettent aussi bien le principe du test que le démarrage lundi et ne proposent aucune possibilité de report.',
    },
  },
  'fr-c1-014': {
    distractorIndexes: {
      0: 'La directrice a rappelé hier que le juriste exige demain que le contrat était révisé après le vote du conseil qui se prononcera aujourd’hui, sans adapter aucun repère temporel au discours rapporté.',
    },
  },
  'fr-c1-015': {
    distractorIndexes: {
      0: 'Quant au coût, il est tout à fait acceptable ; en revanche, le délai annoncé reste beaucoup trop élevé pour nous.',
      1: 'Quant à le délai, il est acceptable et le coût aussi, contrairement à ce qui vient d’être expressément indiqué dans la phrase de départ.',
    },
  },
  'fr-c1-021': {
    distractorIndexes: {
      0: 'Le ministre a certainement reçu le document avant le vote, et la presse confirme officiellement ce fait comme pleinement établi.',
      1: 'Le ministre recevra le document avant le vote, selon une annonce certaine portant sur un événement futur et déjà programmé.',
      2: 'Le ministre recevait toujours le document avant chaque vote, selon une habitude régulière et incontestable rapportée par la presse.',
    },
  },
  'fr-c1-018': {
    distractorIndexes: {
      0: 'La publication complète et transparente de tous les critères utilisés pour prendre les décisions urgentes.',
      2: 'Le retard provoqué dans toutes les décisions urgentes par la publication des critères et la motivation des refus.',
    },
  },
  'fr-c1-008': {
    answer: 'Cette généralisation liée à l’origine n’est pas étayée. Revenons aux faits et au processus, sans imposer ce stéréotype à notre collègue.',
    distractorIndexes: {
      0: 'Continuons à discuter de cette généralisation comme si elle constituait un fait, puis demandons seulement à notre collègue de se défendre seule devant tout le groupe à la fin de la réunion.',
      1: 'Toutes les cultures travaillent exactement de la même manière dans chaque pays et chaque entreprise ; interdisons donc toute discussion des faits, du processus ou des causes concrètes de cette erreur.',
      2: 'La remarque sur son origine est probablement vraie ; retenons-la comme explication principale sans examiner les données, le fonctionnement du processus ni les autres causes possibles du problème.',
    },
  },
  'fr-c1-016': {
    answer: 'Comparons la charge, sa durée et le coût de trois options — réaffectation, renfort temporaire et recrutements — puis décidons dans six semaines selon ces critères.',
    distractorIndexes: {
      2: 'Interdisons toute discussion sur les effectifs jusqu’à ce que les deux camps soient spontanément d’accord sur le nombre exact de recrutements, sans analyser la charge, sa durée, les coûts ni aucune solution intermédiaire.',
    },
  },
  'fr-c1-030': {
    answer: 'Pendant quatre semaines, déployons sur les cas simples avec contrôle humain des cas rares, seuil d’arrêt et revue finale : gain de temps contre coût de contrôle.',
    distractorIndexes: {
      0: 'Lançons dès demain le système partout et sur tous les types de dossiers, sans contrôle humain, sans seuil d’arrêt et sans informer les personnes concernées, puisque les essais sur les seuls cas simples ont donné des résultats positifs.',
      1: 'Abandonnons définitivement le système, supprimons tous les travaux déjà réalisés et refusons tout nouvel essai limité, sans mesurer les gains observés sur les cas simples ni chercher à contrôler le risque des cas rares.',
    },
  },
  'fr-c1-032': {
    answer: 'Notre prévision sous-estime la demande de 18 % et je n’ai pas vu l’écart assez tôt. Nous vérifions deux scénarios — effet saisonnier temporaire ou sous-estimation durable due à une donnée manquante — et, pour l’achat de demain, je recommande la quantité basse avec une option d’extension jusqu’à la vérification.',
    distractorIndexes: {
      1: 'La saisonnalité est certainement l’unique cause de l’écart de 18 %, sans qu’il soit utile de vérifier la donnée manquante ou de reconnaître le retard de détection ; achetons immédiatement la quantité maximale, sans comparer de scénarios temporaires ou durables, sans chiffrer leurs effets possibles, sans option d’extension et sans protéger la décision de demain contre une nouvelle correction de la prévision.',
    },
  },
  'fr-c2-005': {
    distractorIndexes: {
      0: 'Elle renonce définitivement à sa demande.',
      1: 'Elle restreint la portée de sa demande.',
    },
  },
  'fr-c2-006': {
    distractorIndexes: {
      2: 'L’administration a modifié certains programmes anciens tout en respectant intégralement toutes les obligations qu’elle avait antérieurement contractées.',
    },
  },
  'fr-c2-029': {
    distractorIndexes: {
      1: 'Continuons à récompenser exclusivement le nombre brut de dossiers fermés, car toute mesure numériquement exacte produit automatiquement de bons comportements, même lorsque les dossiers complexes sont clos trop tôt puis rouverts.',
    },
  },
  'fr-c2-031': {
    answer: 'Je corrige immédiatement : aucune preuve vérifiée ne soutient cette accusation. Sans la répéter, présentons les faits établis et la procédure indépendante.',
    distractorIndexes: {
      0: 'Répétons plusieurs fois, avec le nom de la chercheuse et tous les détails disponibles, l’accusation de fraude formulée en direct ; nous dirons seulement à la fin qu’elle est peut-être fausse, même si cette reprise amplifie le préjudice.',
    },
  },
  'fr-c2-034': {
    answer: 'Je refuse cette citation isolée : disons qu’aucun danger immédiat n’a été détecté, mais que des zones essentielles restent à examiner.',
    distractorIndexes: {
      0: 'La phrase figure bien dans le rapport ; nous pouvons donc la citer seule et affirmer une sécurité complète, sans reproduire la réserve immédiatement suivante sur les zones essentielles qui n’ont pas encore été examinées.',
      2: 'Refusons toute communication sur ce rapport, y compris une présentation complète et fidèle qui mentionnerait à la fois l’absence de danger immédiat détecté et les zones essentielles restant à examiner.',
    },
  },
  'fr-c2-035': {
    answer: 'Nous nous excusons pour cette exclusion et le préjudice qu’elle a causé. L’institution assume sa responsabilité, rouvre la consultation et enquête sur les causes sans préjuger de l’intention.',
    distractorIndexes: {
      0: 'Si certains membres de cette communauté se sont simplement sentis exclus, nous en sommes désolés, mais notre intention était certainement irréprochable ; nous ne reconnaissons donc aucun préjudice ni aucune responsabilité procédurale et ne rouvrirons pas la consultation.',
      2: 'Sans certitude absolue sur l’intention personnelle de chaque responsable, l’institution ne peut ni présenter d’excuses, ni reconnaître le préjudice, ni assumer sa responsabilité procédurale, ni rouvrir la consultation pourtant incomplète.',
    },
  },
  'es-c1-038': {
    distractorIndexes: {
      2: 'Lamentamos la confusión causada por el aviso. El criterio sobre la jornada parcial no cambió; consulte en el portal las condiciones generales y presente una nueva solicitud en la próxima convocatoria.',
    },
    distractorReasonIndexes: {
      2: 'Ответ смягчает подтверждённый сбой до «неясности» и отправляет заявительницу в будущую кампанию вместо пересмотра пострадавшей помощи.',
    },
  },
  'es-c2-034': {
    distractorIndexes: {
      0: 'Los datos se entregarán cuando hayan concluido las verificaciones que la parte responsable considere necesarias, procurando hacerlo con la mayor rapidez posible y manteniendo informada a la otra parte sobre cualquier incidencia que pueda alterar el calendario previsto.',
      2: 'Las partes actuarán de buena fe para completar las verificaciones y acordar la fecha de entrega; si surgiera una demora, intercambiarán la información disponible y procurarán consensuar los ajustes que consideren oportunos.',
    },
  },
  'es-c2-035': {
    distractorIndexes: {
      0: 'Mientras mantenga esta reserva, no colaboraré con la ejecución y pediré que el comité reabra el debate antes de aplicar la decisión acordada.',
    },
  },
  'de-b1-031': {
    distractorIndexes: {
      1: 'Die Präsentation war klar aufgebaut. Da nur die letzte Reihe Probleme hatte, würde ich lediglich die Farben ändern; Schriftgröße und Zahl der Werte können unverändert bleiben.',
    },
  },
  'it-c1-018': {
    distractorIndexes: {
      0: 'Alla pubblicazione dei criteri stessi, che erano stati resi accessibili e correttamente descritti dall’ufficio prima della selezione dei progetti.',
      1: 'Alla falsità ormai dimostrata di tutti i criteri pubblicati, che secondo il testo non avrebbero avuto alcun rapporto con le decisioni effettivamente prese.',
    },
  },
  'it-c1-033': {
    distractorIndexes: {
      0: 'Durante un’emergenza sanitaria, un medico consulta senza approvazione dati clinici grezzi, informa subito il responsabile e registra correttamente l’accesso il giorno successivo entro il limite delle 24 ore.',
    },
  },
};

const sourceCache = new Map();

function locateSource(questionId) {
  const [, language, levelCode] = questionId.match(/^([a-z]{2})-([a-z]\d)-\d{3}$/) ?? [];
  if (!language) throw new Error(`${questionId}: invalid id`);
  const level = levelCode.toUpperCase();
  const root = path.join(ROOT, 'content', 'language-test-pilots', language, 'candidate-bank');
  const candidate = JSON.parse(fs.readFileSync(path.join(root, `${level}.json`), 'utf8'));
  const sourcePath = path.join(root, 'sources', `${level}.json`);
  const source = sourceCache.get(sourcePath) ?? JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  sourceCache.set(sourcePath, source);
  const question = candidate.questions.find(({ id }) => id === questionId);
  const item = source.items.find(({ stimulus }) => stimulus === question?.stimulus);
  if (!item) throw new Error(`${questionId}: source item not found`);
  return { item, source, sourcePath };
}

const touched = new Map();
for (const [questionId, fix] of Object.entries(fixes)) {
  const { item, source, sourcePath } = locateSource(questionId);
  if (fix.answer) item.answer = fix.answer;
  for (const [indexText, newText] of Object.entries(fix.distractorIndexes ?? {})) {
    const distractor = item.distractors[Number(indexText)];
    if (!distractor) throw new Error(`${questionId}: distractor index not found: ${indexText}`);
    distractor.text = newText;
  }
  for (const [indexText, reasonRu] of Object.entries(fix.distractorReasonIndexes ?? {})) {
    const distractor = item.distractors[Number(indexText)];
    if (!distractor) throw new Error(`${questionId}: distractor reason index not found: ${indexText}`);
    distractor.reasonRu = reasonRu;
  }
  for (const [oldText, newText] of Object.entries(fix.distractors ?? {})) {
    const distractor = item.distractors.find(({ text }) => text === oldText)
      ?? item.distractors.find(({ text }) => text === newText);
    if (!distractor) throw new Error(`${questionId}: distractor not found: ${oldText}`);
    distractor.text = newText;
  }
  touched.set(sourcePath, source);
}
if (WRITE) {
  for (const [sourcePath, source] of touched) fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
}
console.log(`${Object.keys(fixes).length} distractor-balance fixes ${WRITE ? 'written' : 'ready'}`);
