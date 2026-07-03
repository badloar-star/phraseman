#!/usr/bin/env python3
"""Apply editorial tail repairs to the French-Russian conversation pack."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_chains_french_ru_conversation_pack import OUT, row_type, validate_rows, write_outputs  # noqa: E402


REPLACEMENTS = {
    728: ("On descend à la prochaine station.", "Мы выходим на следующей станции."),
    729: ("Le guichet est encore ouvert ?", "Касса ещё открыта?"),
    730: ("Je cherche la sortie numéro deux.", "Я ищу выход номер два."),
    731: ("La valise est trop lourde.", "Чемодан слишком тяжёлый."),
    732: ("Le vol est affiché sur l'écran.", "Рейс указан на экране."),
    734: ("Vous avez une chambre calme ?", "У вас есть тихий номер?"),
    735: ("Ce quai est pour Lyon ?", "Эта платформа на Лион?"),
    736: ("Gardez le ticket avec vous.", "Держите билет при себе."),
    737: ("Je laisse ma valise ici.", "Я оставлю чемодан здесь."),
    739: ("La navette passe bientôt ?", "Шаттл скоро будет?"),
    740: ("Mon vol a du retard.", "Мой рейс задерживается."),
    741: ("Pouvez-vous imprimer ma réservation ?", "Можете распечатать мою бронь?"),
    742: ("On prend la sortie nord.", "Мы выходим через северный выход."),
    743: ("L'embarquement commence maintenant.", "Посадка начинается сейчас."),
    744: ("Le train part voie cinq.", "Поезд отправляется с пятого пути."),
    745: ("Je voudrais une place côté fenêtre.", "Я хотел бы место у окна."),
    746: ("Suivez cette rue jusqu'au pont.", "Идите по этой улице до моста."),
    747: ("Le distributeur vend des tickets ?", "Автомат продаёт билеты?"),
    748: ("Je ne trouve pas mon hôtel.", "Я не могу найти свой отель."),
    749: ("La clé de la chambre ne marche pas.", "Ключ от номера не работает."),
    750: ("La vue est magnifique d'ici.", "Отсюда прекрасный вид."),
    751: ("J'ai besoin d'aide tout de suite.", "Мне нужна помощь прямо сейчас."),
    756: ("Il faut agir vite.", "Нужно действовать быстро."),
    763: ("Apporte-moi un peu d'eau.", "Принеси мне немного воды."),
    767: ("Il faut sortir maintenant.", "Нужно выйти сейчас."),
    770: ("Reste avec moi, s'il te plaît.", "Останься со мной, пожалуйста."),
    771: ("Mon portefeuille a disparu.", "Мой кошелёк пропал."),
    772: ("La pharmacie est ouverte la nuit ?", "Аптека открыта ночью?"),
    773: ("C'est très important.", "Это очень важно."),
    774: ("Compose ce numéro maintenant.", "Набери этот номер сейчас."),
    775: ("On sort par cette porte.", "Мы выйдем через эту дверь."),
    776: ("Je ne me sens pas bien.", "Я плохо себя чувствую."),
    777: ("Mes clés ne sont plus là.", "Моих ключей больше нет."),
    778: ("Passe-moi la bouteille d'eau.", "Передай мне бутылку воды."),
    779: ("Cet endroit n'est pas sûr.", "Это место небезопасно."),
    780: ("Il nous faut un taxi.", "Нам нужно такси."),
    781: ("Le commissariat est loin ?", "Полицейский участок далеко?"),
    782: ("Mon téléphone ne répond plus.", "Мой телефон больше не отвечает."),
    783: ("Il fait trop chaud dehors.", "На улице слишком жарко."),
    784: ("Va demander de l'aide.", "Попроси помощи."),
    785: ("On appelle le médecin maintenant.", "Мы сейчас звоним врачу."),
    786: ("Tu as encore mon contact ?", "У тебя ещё есть мой контакт?"),
    787: ("Je ne reconnais pas cette rue.", "Я не узнаю эту улицу."),
    788: ("On n'a plus beaucoup de temps.", "У нас осталось мало времени."),
    789: ("Pouvez-vous rester près de moi ?", "Вы можете остаться рядом со мной?"),
    790: ("Je ne trouve plus mon portefeuille.", "Я больше не могу найти кошелёк."),
    792: ("Ça ne peut pas attendre.", "Это не может ждать."),
    793: ("Il me faut une pharmacie.", "Мне нужна аптека."),
    794: ("Garde cette bouteille avec toi.", "Держи эту бутылку при себе."),
    795: ("La chaleur devient forte.", "Жара становится сильной."),
    796: ("Tu as vu mes clés quelque part ?", "Ты где-нибудь видел мои ключи?"),
    797: ("On part dans deux minutes.", "Мы уходим через две минуты."),
    798: ("Va chercher quelqu'un à l'accueil.", "Позови кого-нибудь на ресепшене."),
    799: ("Ne reste pas ici seul.", "Не оставайся здесь один."),
    800: ("Envoie-moi ton numéro maintenant.", "Отправь мне свой номер сейчас."),
}


def main() -> int:
    rows_path = OUT / "chains_800_french_ru_conversation.json"
    rows = json.loads(rows_path.read_text(encoding="utf-8"))
    by_index = {int(row["index"]): row for row in rows}
    for index, (french, russian) in REPLACEMENTS.items():
        row = by_index[index]
        row["french"] = french
        row["russian"] = russian
        row["type"] = row_type(french)
    rows = [by_index[index] for index in sorted(by_index)]
    report = validate_rows(rows)
    write_outputs(rows, report)
    repair_report = {
        "status": "ready" if report["ok"] else "failed",
        "replaced_indexes": sorted(REPLACEMENTS),
        "gate": report,
    }
    (OUT / "chains_800_french_ru_conversation_manual_tail_repair_report.json").write_text(
        json.dumps(repair_report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(repair_report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
