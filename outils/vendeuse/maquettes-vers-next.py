"""Convertit les maquettes du canevas (projet livreo, dossier ecrans/) en pages
Next.js dans livreo-web/app/vendeuse. Les styles sont préfixés par .lv-app pour ne
pas toucher au site ni aux écrans existants (/essayer, /direct).

Usage : MAQUETTES=~/maquettes/livreo python3 outils/vendeuse/maquettes-vers-next.py"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

import os
SRC = Path(os.environ.get("MAQUETTES", Path.home() / "maquettes/livreo"))  # projet du canevas
WEB = Path(__file__).resolve().parents[2] / "livreo-web"
APP = WEB / "app/vendeuse"

# fichier, route, numéro, titre, parcours
ECRANS = [
    ("A1-Connexion", "connexion", "1", "Connexion", "B"),
    ("E1b-Connexion-refusee", "connexion/refusee", "1b", "Connexion annulée ou refusée", "B"),
    ("E1c-Contacter-equipe", "contact", "1c", "Écrire à l'équipe Livreo", "B"),
    ("E1d-Fenetre-Facebook", "connexion/facebook", "2", "Fenêtre Facebook (écran de Facebook)", "B"),
    ("A2-Autorisations", "page", "3", "Quelle Page pour ce soir ?", "B"),
    ("E2b-Pas-de-Page", "page/aucune", "3b", "Pas de Page pour le live", "B"),
    ("E7-Accueil", "accueil", "4", "Accueil", "C"),
    ("E7b-Mon-compte", "compte", "4b", "Mon compte", "C"),
    ("A3-Avant-live", "avant-live", "5", "Avant le live", "C"),
    ("E3b-Premier-live", "avant-live/premier", "5b", "Premier live : 3 conseils", "C"),
    ("E3f-Test-camera", "test-camera", "5c", "Test caméra et micro", "C"),
    ("E3c-Camera-refusee", "camera-refusee", "5d", "Caméra ou micro refusés", "C"),
    ("E3d-Reseau-faible", "reseau-faible", "5e", "Réseau trop faible", "C"),
    ("E3e-Lancement", "lancement", "6", "Lancement du live", "C"),
    ("V4-Ecoute-familier", "direct", "7", "Direct : Livreo écoute", "C"),
    ("V4b-Direct-familier", "direct/article", "7b", "Direct : article en cours", "C"),
    ("V4c-Diso-familier", "direct/diso", "7c", "Direct : « diso », le prix change", "C"),
    ("V4d-Image-paroles-familier", "direct/image-paroles", "7d", "Direct : image et paroles en désaccord", "C"),
    ("V4f-Sans-JP-familier", "direct/sans-jp", "7e", "Direct : article sans JP", "C"),
    ("V4g-Prix-familier", "direct/prix", "7f", "Direct : prix jamais entendu", "C"),
    ("V4e-Reseau-familier", "direct/reseau", "7g", "Direct : réseau coupé", "C"),
    ("V4h-Facebook-coupe-familier", "direct/facebook-coupe", "7h", "Direct : Facebook arrête la diffusion", "C"),
    ("V4i-Terminer-familier", "direct/terminer", "7i", "Direct : terminer le live ?", "C"),
    ("A9-Paiements", "confirmations", "8", "Confirmations", "C"),
    ("E8b-Conversation-IA", "confirmations/conversation", "8b", "Conversation avec l'IA", "C"),
    ("E5b-Rien-a-verifier", "confirmations/aucune", "8c", "Aucune confirmation en attente", "C"),
    ("E5c-Ecart", "confirmations/ecart", "8d", "Paiement d'avance : écart", "C"),
    ("A10-Fin-du-live", "fin", "9", "Fin du live", "C"),
    ("E6b-Sans-vente", "fin/sans-vente", "9b", "Fin du live sans vente", "C"),
    ("E8-Feuille-de-route", "feuille-de-route", "10", "Feuille de route", "C"),
]

# Liens : (écran, classe ou balise, début du texte) -> route
V = "/vendeuse/"
LIENS = {
    "A1-Connexion": [("btn", "", "connexion/facebook")],
    "E1b-Connexion-refusee": [("fb", "", "connexion/facebook"), ("discret", "", "contact")],
    "E1c-Contacter-equipe": [("voile-feuille", "", "connexion/refusee")],
    "E1d-Fenetre-Facebook": [("bleu", "", "page"), ("gris", "", "connexion/refusee")],
    "A2-Autorisations": [("btn", "Continuer", "accueil"), ("discret", "", "page/aucune")],
    "E2b-Pas-de-Page": [("discret", "", "page")],
    "E7-Accueil": [("btn", "", "avant-live"), ("av-p", "", "compte"), ("a", "changer", "page"),
                   ("tuile", "2", "confirmations"), ("tuile", "18", "feuille-de-route")],
    "E7b-Mon-compte": [("val", "changer", "page"), ("reglage", "Écrire", "contact"), ("discret", "", "connexion")],
    "A3-Avant-live": [("btn", "", "lancement"), ("a", "tester", "test-camera"), ("a", "changer", "page")],
    "E3b-Premier-live": [("btn", "", "avant-live")],
    "E3f-Test-camera": [("btn", "", "avant-live")],
    "E3c-Camera-refusee": [("btn", "", "test-camera")],
    "E3d-Reseau-faible": [("btn", "Tester", "avant-live"), ("discret", "", "lancement"), ("a", "tester", "test-camera")],
    "E3e-Lancement": [("discret", "", "avant-live")],
    "V4-Ecoute-familier": [("terminer", "", "direct/terminer")],
    "V4b-Direct-familier": [("terminer", "", "direct/terminer")],
    "V4c-Diso-familier": [("terminer", "", "direct/terminer")],
    "V4d-Image-paroles-familier": [("terminer", "", "direct/terminer")],
    "V4f-Sans-JP-familier": [("terminer", "", "direct/terminer")],
    "V4g-Prix-familier": [("terminer", "", "direct/terminer")],
    "V4e-Reseau-familier": [("terminer", "", "direct/terminer")],
    "V4h-Facebook-coupe-familier": [("oui", "", "lancement"), ("button", "Voir", "confirmations")],
    "V4i-Terminer-familier": [("rouge-b", "", "fin"), ("gris-b", "", "direct/article")],
    "A9-Paiements": [("btn", "", "feuille-de-route")],
    "E5b-Rien-a-verifier": [("btn", "", "accueil")],
    "E5c-Ecart": [("discret", "", "confirmations")],
    "A10-Fin-du-live": [("mini-btn", "", "confirmations"), ("btn", "", "feuille-de-route")],
    "E6b-Sans-vente": [("btn", "", "accueil")],
    "E8b-Conversation-IA": [("retour", "", "confirmations")],
}

VIDES = {"br", "img", "meta", "link", "input", "hr", "source"}
ATTR = {"class": "className", "for": "htmlFor", "tabindex": "tabIndex", "viewbox": "viewBox",
        "xlink:href": "xlinkHref", "xmlns:xlink": "xmlnsXlink"}


class Noeud:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.enfants = tag, dict(attrs), []

    def texte(self):
        return "".join(e if isinstance(e, str) else e.texte() for e in self.enfants)


class Lecteur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.racine = Noeud("#", [])
        self.pile = [self.racine]
        self.styles = []
        self.dans_style = False

    def handle_starttag(self, tag, attrs):
        if tag == "style":
            self.dans_style = True
            self.styles.append("")
            return
        n = Noeud(tag, attrs)
        self.pile[-1].enfants.append(n)
        if tag not in VIDES:
            self.pile.append(n)

    def handle_startendtag(self, tag, attrs):
        self.pile[-1].enfants.append(Noeud(tag, attrs))

    def handle_endtag(self, tag):
        if tag == "style":
            self.dans_style = False
            return
        if tag in VIDES:
            return
        for i in range(len(self.pile) - 1, 0, -1):
            if self.pile[i].tag == tag:
                del self.pile[i:]
                return

    def handle_data(self, d):
        if self.dans_style:
            self.styles[-1] += d
        else:
            self.pile[-1].enfants.append(d)


def trouver(n, tag):
    if isinstance(n, str):
        return None
    if n.tag == tag:
        return n
    for e in n.enfants:
        r = trouver(e, tag)
        if r:
            return r
    return None


def camel(s):
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), s)


def style_objet(s):
    morceaux = []
    for decl in s.split(";"):
        if ":" not in decl:
            continue
        p, v = decl.split(":", 1)
        p, v = p.strip(), chemins(v.strip())
        cle = json.dumps(p) if p.startswith("--") else camel(p)
        morceaux.append(f"{cle}: {json.dumps(v, ensure_ascii=False)}")
    return "{{ " + ", ".join(morceaux) + " }}"


def chemins(s):
    return s.replace("../images/", "/img/").replace("../fonts/", "/fonts/")


def texte_jsx(t):
    if "\n" in t and not t.strip():
        return ""
    t = re.sub(r"\s*\n\s*", " ", t)
    if re.search(r"[{}<>]", t) or t != t.strip():
        return "{" + json.dumps(t, ensure_ascii=False) + "}"
    return t


def lien_pour(n, liens):
    if not liens:
        return None
    classes = n.attrs.get("class", "").split()
    texte = n.texte().strip()
    for cle, debut, route in liens:
        if (cle in classes or cle == n.tag) and texte.startswith(debut):
            return route
    return None


def jsx(n, liens, prof=0):
    if isinstance(n, str):
        return texte_jsx(n)
    tag = n.tag
    route = lien_pour(n, liens) if tag in ("button", "a", "div", "span") else None
    attrs = []
    for k, v in n.attrs.items():
        if k == "style":
            attrs.append(f"style={style_objet(v)}")
            continue
        if route and k == "href":
            continue
        nom = ATTR.get(k) or (k if k.startswith(("data-", "aria-")) else camel(k))
        if v is None:
            attrs.append(f"{nom}")
        else:
            attrs.append(f"{nom}={json.dumps(chemins(v), ensure_ascii=False)}")
    if route and tag == "button":
        tag_sortie = "Aller"
        attrs.insert(0, f'vers="{V}{route}"')
    elif route:
        tag_sortie = "Link"
        attrs.insert(0, f'href="{V}{route}"')
    else:
        tag_sortie = tag
    a = (" " + " ".join(attrs)) if attrs else ""
    if tag in VIDES:
        return f"<{tag_sortie}{a} />"
    dedans = "".join(jsx(e, liens, prof + 1) for e in n.enfants)
    if not dedans:
        return f"<{tag_sortie}{a} />"
    return f"<{tag_sortie}{a}>{dedans}</{tag_sortie}>"


# ---- CSS : préfixe .lv-app ----

def decouper_selecteurs(sel):
    parts, prof, cur = [], 0, ""
    for c in sel:
        if c in "([":
            prof += 1
        elif c in ")]":
            prof -= 1
        if c == "," and prof == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += c
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def prefixer_sel(sel):
    out = []
    for s in decouper_selecteurs(sel):
        s2 = re.sub(r"^(:root|html|body)\b", "", s).strip()
        if s2 != s:
            out.append(".lv-app" + (" " + s2 if s2 else ""))
        else:
            out.append(".lv-app " + s)
    return ", ".join(dict.fromkeys(out))


def prefixer_css(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = chemins(css)
    out, i = [], 0
    while i < len(css):
        j = css.find("{", i)
        if j < 0:
            out.append(css[i:])
            break
        tete = css[i:j].strip()
        # bloc équilibré
        prof, k = 1, j + 1
        while prof and k < len(css):
            if css[k] == "{":
                prof += 1
            elif css[k] == "}":
                prof -= 1
            k += 1
        corps = css[j + 1:k - 1]
        if tete.startswith(("@media", "@supports")):
            out.append(f"{tete} {{\n{prefixer_css(corps)}\n}}")
        elif tete.startswith("@"):
            out.append(f"{tete} {{{corps}}}")
        else:
            out.append(f"{prefixer_sel(tete)} {{{corps}}}")
        i = k
    return "\n".join(x for x in out if x.strip())


def page(fichier, route, num, titre):
    html = (SRC / "ecrans" / f"{fichier}.html").read_text()
    lec = Lecteur()
    lec.feed(html)
    main = trouver(lec.racine, "main")
    css = prefixer_css("\n".join(lec.styles))
    corps = jsx(main, LIENS.get(fichier, []))
    imp = ('import Link from "next/link";\n' if "<Link" in corps else "") + \
          (f'import Aller from "{"../" * (route.count("/") + 1)}Aller";\n' if "<Aller" in corps else "")
    return f'''{imp}
/* {num} · {titre}. Généré depuis la maquette {fichier}.html du canevas. */
export const metadata = {{ title: {json.dumps("Livreo · " + titre, ensure_ascii=False)} }};

const css = {json.dumps(css, ensure_ascii=False)};

export default function Ecran() {{
  return (
    <>
      <style dangerouslySetInnerHTML={{{{ __html: css }}}} />
      {corps}
    </>
  );
}}
'''.lstrip()


def main():
    base = prefixer_css((SRC / "partages/app.css").read_text())
    (WEB / "public/css/vendeuse.css").write_text(
        "/* App vendeuse : styles des maquettes du canevas, préfixés par .lv-app.\n"
        "   Généré depuis ~/maquettes/livreo/partages/app.css. */\n" + base + "\n\n"
        + (Path(__file__).parent / "cadre.css").read_text())
    for fichier, route, num, titre, _ in ECRANS:
        d = APP / route
        d.mkdir(parents=True, exist_ok=True)
        (d / "page.jsx").write_text(page(fichier, route, num, titre))
    plan = [dict(route=V + r, num=n, titre=t, parcours=p) for _, r, n, t, p in ECRANS]
    (APP / "ecrans.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n")
    print(len(ECRANS), "écrans")


main()
