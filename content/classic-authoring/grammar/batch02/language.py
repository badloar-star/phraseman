"""Reviewed presentation layer over the bounded grammar. Keep valid alternative openings out of the wrong-choice bank."""
from grammar_core import *
import grammar_core as core


def analyse(es, lid, book, look):
    a, ctx = core.analyse(es, lid, book, look)
    t, w, i, v, person, base, sub = ctx
    if es == 'Somos Ana y Luis.':
        a['agreement'] = bi('Говорят сами Ана и Луис: «мы» требует somos. Когда о них говорит кто-то другой, нужна форма son.', 'Говорять самі Ана та Луїс: для «ми» потрібне somos. Коли про них говорить інша людина, обираємо son.')
        a['meaning'] = bi('Ana y Luis — два имени, соединённые y. Перед ними не нужны артикли.', 'Ana y Luis — два імені, поєднані y. Перед ними не потрібні артиклі.')
    elif lid == 5 and w[0] == 'quién' and v == 'eres':
        a['agreement'] = bi('Спрашиваешь одного человека на «ты», поэтому eres. Не подставляй es только потому, что слева quién.', 'Питаєш одну людину на «ти», тому eres. Не підставляй es лише через те, що ліворуч стоїть quién.')
    elif lid == 5 and w[0] == 'quiénes':
        a['agreement'] = bi('Собеседник должен указать нескольких людей: quiénes + son. Для одного человека было бы quién + es.', 'Співрозмовник має вказати на кількох людей: quiénes + son. Для однієї людини було б quién + es.')
    elif lid == 5 and w[0] == 'dónde' and w[-1]=='ustedes':
        a['agreement'] = bi('Ustedes означает «вы» при обращении к группе. Оно требует están, как ellos/ellas. Это не форма vosotros.', 'Ustedes означає «ви» у звертанні до групи. З ним потрібно están, як із ellos/ellas. Це не форма vosotros.')
    return a,ctx


def slot(lid,pid,j,ctx,analysis,entry,alternates):
    if entry['group'] != 'article':
        return core.slot(lid,pid,j,ctx,analysis,entry,alternates)
    t,w,*_ = ctx
    target=w[j]
    # Keep all other agreement forms. Supplement with function words that do NOT begin a supported alternative.
    banned={target}
    for alt in alternates:
        ax=list(map(key,words(alt)))
        if len(ax)>j and ax[:j]==w[:j]:banned.add(ax[j])
    others=[x for x in DET if x not in banned]
    extras=[x for x in ('de','en','sin','con','por','entre') if x not in banned]
    rng=random.Random(int.from_bytes(hashlib.sha256((pid+'#article#'+str(j)).encode()).digest()[:8],'big'))
    rng.shuffle(extras); wrong=(others+extras)[:5];wrong=[cap(x) if j==0 else x for x in wrong]
    options=[t[j],*wrong];ck(len(set(map(key,options)))==6,'article options: '+pid);rng.shuffle(options)
    return dict(text=t[j],correct=t[j],distractors=wrong,choices=options,senseId=entry['id'],category='article',errorTag='definite_article_agreement',explanation=article_note(target,w[j+1]))
