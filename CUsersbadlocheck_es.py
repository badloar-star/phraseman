# -*- coding: utf-8 -*-
# Verify Spanish accents and inverted question marks

es_strings = {
    "topic.es": "Pedir el numero de telefono".replace("numero","número").replace("telefono","teléfono"),
}

# Actual strings from draft (as written)
draft_es = [
    ("topic", "Pedir el número de teléfono"),
    ("outcome", "Puedes pedir el número de teléfono y pedir que te llamen"),
    ("intro1.title", "La pregunta clave sobre el teléfono"),
    ("intro1.body", "Una frase sencilla lo resuelve todo: What is your phone number? Significa «¿Cuál es tu número de teléfono?». Con ella empieza el intercambio de contactos."),
    ("intro1.ex.gloss", "¿Cuál es tu número de teléfono?"),
    ("intro2.title", "Petición cortés: Could you...?"),
    ("intro2.body", "Could you...? es una petición suave, como «¿Podrías...?». Suena más cortés que una pregunta directa y sirve con un desconocido."),
    ("intro2.ex.gloss", "¿Podrías darme tu número?"),
    ("intro3.title", "Pide que te llamen luego"),
    ("intro3.body", "Si quieres que te llamen, di Please call me. La palabra please convierte la frase en una petición amable, no en una orden."),
    ("intro3.ex.gloss", "Llámame esta tarde, por favor."),
    ("p1.meaning", "¿Cuál es tu número de teléfono?"),
    ("p1.title", "Preguntar el número de teléfono"),
    ("p1.rule", "What is your...? sirve para pedir un número, nombre o dirección. Luego ponemos la palabra que necesitas."),
    ("p1.why", "Primero va la pregunta What is, luego your — de quién, y al final el objeto."),
    ("p1.mistake", "No digas What your number? — sin la palabra is la pregunta queda incompleta."),
    ("p2.meaning", "¿Podrías darme tu número?"),
    ("p2.title", "Pedir el número con cortesía"),
    ("p2.rule", "Could you give me...? es una petición suave de algo. Tras give va me — a quién."),
    ("p2.why", "Could suena más cortés que can y encaja con una persona desconocida."),
    ("p2.mistake", "No digas Could you give your number to me — es más simple give me your number."),
    ("p3.meaning", "¿Me puedes dar tu número de teléfono?"),
    ("p3.title", "Pedir el número de otra forma"),
    ("p3.rule", "Can I have...? es una petición común: «¿me puedes dar...?». Así se pide un número, la cuenta o el menú."),
    ("p3.why", "Have aquí no significa «tener», sino «recibir». Es una petición corta y frecuente."),
    ("p3.mistake", "No digas Can I have your number please give — pon please solo al final."),
    ("p4.meaning", "¿Es este tu nuevo número?"),
    ("p4.title", "Confirmar el número"),
    ("p4.rule", "Is this...? es una pregunta corta: «¿es este...?». Así compruebas si el número es correcto."),
    ("p4.why", "En la pregunta, is va primero, antes de this. Eso convierte la frase en pregunta."),
    ("p4.mistake", "No digas This is your new number? — para preguntar, pon is primero."),
    ("p5.meaning", "Llámame esta tarde, por favor."),
    ("p5.title", "Pedir que te llamen"),
    ("p5.rule", "Call me significa «llámame». La palabra please delante convierte la orden en una petición amable."),
    ("p5.why", "En la petición, el verbo call va directo, sin I o you delante."),
    ("p5.mistake", "No digas Please you call me — tras please va directo el verbo call."),
    ("p6.meaning", "¿Cuál es el mejor número?"),
    ("p6.title", "Preguntar a qué número llamar"),
    ("p6.rule", "What is the best...? pregunta cuál es la mejor opción entre varias."),
    ("p6.why", "Best significa el mejor. Antes lleva the, porque la opción es única."),
    ("p6.mistake", "No digas What is best number — antes de best se necesita el artículo the."),
    ("vocab.numero", "número"),
    ("vocab.telefono", "teléfono"),
    ("vocab.dar", "dar"),
    ("vocab.llamar", "llamar"),
    ("vocab.tarde", "tarde"),
    ("vocab.tu", "tu"),
]

print("=== Checking every ES string for question marks ===")
for key, s in draft_es:
    # If string contains a '?' it should have an opening inverted '¿' for the question span
    has_q = "?" in s
    has_inv = "¿" in s
    if has_q and not has_inv:
        # Could be legit (English embedded like "Could you...?")
        print(f"[Q-CHECK] {key}: has '?' but no '¿' -> {s}")

print()
print("=== Checking exclamation marks ===")
for key, s in draft_es:
    has_excl = "!" in s
    has_inv_excl = "¡" in s
    if has_excl and not has_inv_excl:
        print(f"[EXCL] {key}: has '!' but no '¡' -> {s}")

print()
print("=== Listing every ES string with non-ASCII (accents) for manual review ===")
import unicodedata
for key, s in draft_es:
    accented = [c for c in s if ord(c) > 127 and c not in "«»¿¡—…"]
    if accented:
        print(f"{key}: {''.join(sorted(set(accented)))}  <- {s}")
