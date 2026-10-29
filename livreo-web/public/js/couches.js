/*
 * Couches : le mouvement des blocs décrits dans static/css/couches.css.
 * Sans framework ni dépendance. Chaque bloc porte data-couche="…".
 * Mode d'emploi : docs/couches.md.
 *
 * Règles (tirées de vrais défauts sur téléphone) :
 * - une seule boucle d'animation, arrêtée quand rien ne bouge ;
 * - le temps est mesuré en secondes réelles : même rendu à 60 et à 120 images par seconde ;
 * - on n'écrit dans la page que si la valeur change ;
 * - avec « animations réduites » ou le bouton Pause, rien ne bouge et tout reste visible.
 */
(function () {
  "use strict";

  var racine = document.documentElement;
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var souris = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var defilementCSS = window.CSS && CSS.supports("animation-timeline: view()");
  racine.classList.add("avec-couches");

  var borne = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var tous = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  // ---------- La boucle unique ----------

  var actions = new Set(), boucle = 0, dernier = null, enPause = false;

  function demarrer(action) {
    actions.add(action);
    if (!boucle && !enPause) { dernier = null; boucle = requestAnimationFrame(image); }
  }
  function arreter(action) { actions.delete(action); }

  function image(t) {
    var dt = dernier === null ? 1 / 60 : Math.min(0.064, (t - dernier) / 1000); // pas de saut après un onglet en pause
    dernier = t;
    actions.forEach(function (action) { if (action(t, dt) === false) actions.delete(action); });
    boucle = actions.size && !enPause ? requestAnimationFrame(image) : 0;
  }

  // Une action ne tourne que quand son bloc est à l'écran.
  var surveilles = new Map();
  var garde = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      var action = surveilles.get(e.target);
      if (e.isIntersecting) demarrer(action); else arreter(action);
    });
  });
  function quandVisible(el, action) { surveilles.set(el, action); garde.observe(el); }

  function ecrire(el, nom, valeur) {
    var cle = "_c" + nom;
    if (el[cle] === valeur) return;
    el[cle] = valeur;
    el.style.setProperty(nom, valeur);
  }

  // ---------- Ressort : mouvement naturel, amorti, indépendant de l'écran ----------

  function ressort(raideur, amorti) {
    var k = raideur || 170, c = amorti || 22, x = 0, v = 0, cible = 0;
    return {
      vers: function (valeur) { cible = valeur; },
      place: function (valeur) { x = cible = valeur; v = 0; },
      pas: function (dt) {
        for (var reste = dt; reste > 0; reste -= 1 / 240) { // sous-pas fixes : stable à 60 comme à 120 Hz
          var h = Math.min(1 / 240, reste);
          v += (-k * (x - cible) - c * v) * h;
          x += v * h;
        }
        return x;
      },
      auRepos: function () { return Math.abs(v) < 0.01 && Math.abs(x - cible) < 0.01; },
    };
  }

  // Barre d'action sur téléphone : elle apparaît quand le haut de page est passé.
  // Ce n'est pas un décor : elle marche aussi avec « animations réduites ».
  tous('[data-couche="barre-cta"]').forEach(function (barre) {
    var repere = document.querySelector(barre.dataset.apres || "main > :first-child");
    if (!repere) { barre.classList.add("est-visible"); return; }
    new IntersectionObserver(function (e) { barre.classList.toggle("est-visible", !e[0].isIntersecting); }).observe(repere);
  });

  // Avancement du défilement dans un séjour (scène qui reste à l'écran) : 0 au début, 1 à la fin.
  function progresSejour(sejour) {
    var r = sejour.getBoundingClientRect(), course = r.height - window.innerHeight;
    return course > 0 ? borne(-r.top / course) : 1;
  }


  // Ce qui suit est décoratif : avec « animations réduites », on s'arrête là.
  // Le CSS montre alors tout, immobile.
  // Le moteur, prêté aux modules chargés seulement là où ils servent (couches-3d.js).
  window.couches = { ressort: ressort, quandVisible: quandVisible, progresSejour: progresSejour, borne: borne, calme: calme };
  if (calme) return;

  // ---------- Pause de toutes les animations (WCAG 2.2.2) ----------

  function pause(oui) {
    enPause = oui;
    racine.classList.toggle("c-en-pause", oui);
    tous('[data-couche="pause"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(oui));
      b.textContent = oui ? b.dataset.reprendre || "Reprendre les animations" : b.dataset.arreter || "Mettre les animations en pause";
    });
    // En pause, l'image déjà demandée est annulée : plus rien ne bouge, même une seule fois.
    if (oui && boucle) { cancelAnimationFrame(boucle); boucle = 0; }
    if (!oui && actions.size && !boucle) { dernier = null; boucle = requestAnimationFrame(image); }
    // Les modules (couches-3d.js) écoutent : en pause, ils montrent leur dessin terminé, immobile.
    document.dispatchEvent(new CustomEvent("couches:pause", { detail: oui }));
  }
  tous('[data-couche="pause"]').forEach(function (b) {
    b.dataset.arreter = b.textContent.trim();
    b.addEventListener("click", function () {
      pause(!enPause);
      try { localStorage.setItem("couches-pause", enPause ? "1" : ""); } catch (e) { /* stockage bloqué : sans gravité */ }
    });
  });
  try { if (localStorage.getItem("couches-pause")) pause(true); } catch (e) { /* idem */ }
  window.couches.pause = pause;

  // Le décor se prépare quand le navigateur est libre, après le premier affichage :
  // le chargement de la page et le premier titre ne l'attendent jamais.
  function plusTard(f) {
    if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 700 }); else setTimeout(f, 120);
  }

  plusTard(function decorer() {
    // ---------- Flux : des pastilles tombent à travers la limite des sections ----------

    tous('[data-couche="flux"]').forEach(function (flux) {
      var elements = (flux.dataset.elements || "10:00,Rex,14:00,Mimi").split(",");
      flux.textContent = "";
      elements.forEach(function (texte, i) {
        var p = document.createElement("i");
        p.textContent = texte.trim();
        p.style.cssText = "--x:" + (8 + (i * 37) % 72) + "%;--d:" + (2.6 + (i % 4) * 0.45) + "s;--r:-" +
          (i * 0.37).toFixed(2) + "s;--a:" + ((i % 2 ? 1 : -1) * (6 + i * 3)) + "deg";
        flux.appendChild(p);
      });
    });

    // ---------- Étincelles : elles montent comme de la vapeur ----------

    tous('[data-couche="etincelles"]').forEach(function (bloc) {
      var n = +(bloc.dataset.nombre || 7);
      for (var i = 0; i < n; i++) {
        var b = document.createElement("b");
        b.textContent = "✦";
        b.style.cssText = "--x:" + (8 + i * (84 / n)) + "%;--t:" + (0.7 + (i % 3) * 0.3) + "rem;--r:-" + (i * 0.43).toFixed(2) +
          "s;--dx:" + ((i % 2 ? 1 : -1) * (6 + i * 2)) + "px";
        bloc.appendChild(b);
      }
    });

    // ---------- Vague : l'eau du bain monte quand on quitte la scène ----------

    tous('[data-couche="vague"]').forEach(function (vague, k) {
      var ns = "http://www.w3.org/2000/svg", id = "c-eau-" + k;
      vague.insertAdjacentHTML("afterbegin",
        '<svg viewBox="0 0 1440 1300" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" style="stop-color:var(--c-eau-haut);stop-opacity:.95"/><stop offset=".25" style="stop-color:var(--c-eau-milieu);stop-opacity:.97"/>' +
        '<stop offset="1" style="stop-color:var(--c-eau-bas)"/></linearGradient></defs><path fill="url(#' + id + ')"/>' +
        '<path fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg>');
      for (var i = 0; i < 14; i++) {
        var bulle = document.createElement("span"), taille = 10 + (i % 4) * 9;
        bulle.className = "c-bulle";
        bulle.style.cssText = "left:" + ((i * 71) % 96) + "%;top:" + (4 + (i * 23) % 30) + "%;width:" + taille + "px;height:" + taille +
          "px;--r:-" + (i * 0.5).toFixed(1) + "s";
        vague.appendChild(bulle);
      }
      var chemins = vague.getElementsByTagNameNS(ns, "path"), scene = vague.closest(".c-scene") || vague.parentElement;
      quandVisible(scene, function (t) {
        var d = "M0 1300 L0 120 ", e = "M0 120 ", s = t / 650;
        for (var x = 0; x <= 1440; x += 40) {
          var y = (110 + Math.sin(x / 170 + s) * 38 + Math.sin(x / 63 - s * 1.7) * 12).toFixed(1);
          d += "L" + x + " " + y + " "; e += "L" + x + " " + y + " ";
        }
        chemins[0].setAttribute("d", d + "L1440 1300 Z");
        chemins[1].setAttribute("d", e);
        var h = window.innerHeight, bas = scene.getBoundingClientRect().bottom;
        ecrire(vague, "--c-monte", borne((h - bas) / (h * 0.8)).toFixed(3));
      });
    });

    // ---------- Mot géant : le navigateur le fait glisser lui-même s'il sait faire ----------

    if (!defilementCSS) {
      tous('[data-couche="mot"]').forEach(function (mot) {
        var scene = mot.closest(".c-scene") || mot.parentElement;
        quandVisible(scene, function () {
          var h = window.innerHeight, r = scene.getBoundingClientRect(), p = borne((h - r.top) / (h + r.height));
          ecrire(mot, "--c-glisse", ((0.5 - p) * 18).toFixed(2) + "vw");
        });
      });
    }

    // ---------- Voyage : des mots qui traversent l'écran au rythme du défilement ----------
    // Une seule valeur écrite (--c-p) ; le CSS calcule la place de chaque mot. On suit le défilement
    // lui-même, pas la boucle : c'est le visiteur qui fait bouger les mots, donc ils suivent aussi
    // en pause (sinon, en pause, les mots restaient invisibles : vu en ligne le 26/10/2026).

    tous('[data-couche="voyage"]').forEach(function (sejour) {
      ecrire(sejour, "--c-n", String(sejour.querySelectorAll(".c-voyage-mot").length));
      function suivre() { ecrire(sejour, "--c-p", progresSejour(sejour).toFixed(4)); }
      suivre();
      window.addEventListener("scroll", suivre, { passive: true });
      window.addEventListener("resize", suivre);
    });

    // ---------- Révélations : notes à la main et titres mot par mot ----------

    var revele = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        var bloc = entree.target;
        bloc.classList.add("est-visible");
        revele.unobserve(bloc);
        if (bloc.matches('[data-couche="notes"]')) {
          var derniere = bloc.lastElementChild;
          var attente = 1200 + 1000 * (parseFloat(derniere && getComputedStyle(derniere).getPropertyValue("--c-delai")) || 0);
          setTimeout(function () { bloc.classList.add("est-posee"); }, attente);
        }
      });
    }, { threshold: 0.35 });
    tous('[data-couche="notes"]').forEach(function (n) { revele.observe(n); });

    // Titres mot par mot : le vrai texte reste lu par les lecteurs d'écran et par Google ;
    // seuls les mots animés sont cachés aux lecteurs. On découpe en mots, jamais en lettres.
    var segmenteur = window.Intl && Intl.Segmenter ? new Intl.Segmenter("fr", { granularity: "word" }) : null;
    tous('[data-couche="mots"]').forEach(function (titre) {
      var texte = titre.textContent.replace(/\s+/g, " ").trim(), morceaux = [];
      if (segmenteur) {
        for (var it = segmenteur.segment(texte)[Symbol.iterator](), s = it.next(); !s.done; s = it.next()) {
          // Ponctuation collée au mot précédent (« demain ! » ne se coupe pas).
          if (!s.value.isWordLike && morceaux.length && s.value.segment.trim()) morceaux[morceaux.length - 1] += s.value.segment;
          else morceaux.push(s.value.segment);
        }
      } else {
        morceaux = texte.split(/(\s+)/);
      }
      var lu = document.createElement("span"), vu = document.createElement("span"), i = 0;
      lu.className = "c-lecteur";
      lu.textContent = texte;
      vu.setAttribute("aria-hidden", "true");
      morceaux.forEach(function (m) {
        if (!m.trim()) { vu.appendChild(document.createTextNode(m)); return; }
        var cadre = document.createElement("span"), mot = document.createElement("span");
        cadre.className = "c-m";
        mot.textContent = m;
        mot.style.setProperty("--i", i++);
        cadre.appendChild(mot);
        vu.appendChild(cadre);
      });
      titre.textContent = "";
      titre.appendChild(lu);
      titre.appendChild(vu);
      revele.observe(titre);
    });

    // ---------- Surligneur et traînée de pattes : ils se dessinent une fois à l'écran ----------

    tous('[data-couche="surligne"], [data-couche="trace"]').forEach(function (bloc) { revele.observe(bloc); });

    // ---------- Notifications : elles arrivent une par une sur le téléphone ----------

    tous('[data-couche="notifs"]').forEach(function (bloc) {
      var messages = Array.prototype.slice.call(bloc.children), tour = 0, minuteur = 0;
      if (messages.length < 2) return;
      function suivante() {
        if (enPause) { minuteur = setTimeout(suivante, 800); return; }
        messages.forEach(function (n, i) {
          var rang = (tour - i + messages.length) % messages.length; // 0 = la plus récente
          n.className = n.className.replace(/\s?c-n\d/g, "") + (rang < 3 ? " c-n" + rang : "");
          n.setAttribute("aria-hidden", rang === 0 ? "false" : "true");
        });
        tour++;
        minuteur = setTimeout(suivante, +(bloc.dataset.pause || 2600));
      }
      new IntersectionObserver(function (e) {
        clearTimeout(minuteur);
        if (e[0].isIntersecting) suivante();
      }).observe(bloc);
    });

    // ---------- Avant / après : on glisse pour comparer ----------

    tous('[data-couche="avant-apres"]').forEach(function (bloc) {
      var curseur = bloc.querySelector("input[type=range]"), position = ressort(220, 26), aide = true;
      if (!curseur) return;
      position.place(+curseur.value);
      function suivre(t, dt) {
        ecrire(bloc, "--c-pos", position.pas(dt).toFixed(2) + "%");
        return !position.auRepos();
      }
      curseur.addEventListener("input", function () { aide = false; position.vers(+curseur.value); demarrer(suivre); });
      // Une fois visible, un petit aller-retour montre qu'on peut glisser.
      new IntersectionObserver(function (e, obs) {
        if (!e[0].isIntersecting) return;
        obs.disconnect();
        [[30, 500], [62, 1200], [38, 1900]].forEach(function (etape) {
          setTimeout(function () { if (aide) { position.vers(etape[0]); demarrer(suivre); } }, etape[1]);
        });
      }, { threshold: 0.6 }).observe(bloc);
    });

    // ---------- Bulles de savon : elles montent, et éclatent quand on les touche ----------

    tous('[data-couche="bulles"]').forEach(function (bloc) {
      var toile = document.createElement("canvas"), ctx = toile.getContext("2d");
      if (!ctx) return;
      toile.className = "c-bulles-toile";
      toile.setAttribute("aria-hidden", "true");
      bloc.appendChild(toile);
      var ratio = Math.min(2, window.devicePixelRatio || 1), l = 0, h = 0, n = +(bloc.dataset.nombre || 18), bulles = [];
      function nouvelle(b, enBas) {
        b.r = 6 + Math.random() * 18;
        b.x = Math.random() * l;
        b.y = enBas ? h + b.r + Math.random() * h * 0.5 : Math.random() * h;
        b.v = 18 + Math.random() * 30; // pixels par seconde
        b.phase = Math.random() * 6.28;
        b.eclat = 0; // > 0 : la bulle éclate
        return b;
      }
      new ResizeObserver(function () {
        l = bloc.clientWidth; h = bloc.clientHeight;
        toile.width = Math.round(l * ratio); toile.height = Math.round(h * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (!bulles.length) for (var i = 0; i < n; i++) bulles.push(nouvelle({}, false));
      }).observe(bloc);
      bloc.addEventListener("pointerdown", function (e) {
        var r = toile.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        bulles.forEach(function (b) { if (!b.eclat && Math.hypot(b.x - x, b.y - y) < b.r + 14) b.eclat = 0.0001; });
      });
      quandVisible(bloc, function (t, dt) {
        ctx.clearRect(0, 0, l, h);
        bulles.forEach(function (b) {
          if (b.eclat) {
            b.eclat += dt * 3.5;
            var a = 1 - b.eclat;
            if (a <= 0) { nouvelle(b, true); return; }
            ctx.strokeStyle = "rgba(255,255,255," + a.toFixed(2) + ")";
            ctx.lineWidth = 2;
            for (var k = 0; k < 8; k++) { // éclaboussures
              var ang = k * 0.785, d = b.r * (1 + b.eclat * 1.4);
              ctx.beginPath();
              ctx.moveTo(b.x + Math.cos(ang) * b.r * 0.9, b.y + Math.sin(ang) * b.r * 0.9);
              ctx.lineTo(b.x + Math.cos(ang) * d, b.y + Math.sin(ang) * d);
              ctx.stroke();
            }
            return;
          }
          b.y -= b.v * dt;
          b.phase += dt * 1.6;
          b.x += Math.cos(b.phase) * 6 * dt; // léger roulis
          if (b.y < -b.r) nouvelle(b, true);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, 6.2832);
          ctx.fillStyle = "rgba(255,255,255,.16)";
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "rgba(255,255,255,.85)";
          ctx.stroke();
          ctx.beginPath(); // reflet
          ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, 0, 6.2832);
          ctx.fillStyle = "rgba(255,255,255,.75)";
          ctx.fill();
        });
      });
    });

    // ---------- Traces de pattes : elles suivent le doigt ou la souris ----------

    var PATTE = '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="9" ry="8"/><ellipse cx="9" cy="15" rx="4" ry="5"/>' +
      '<ellipse cx="16" cy="9" rx="4" ry="5"/><ellipse cx="24" cy="9" rx="4" ry="5"/><ellipse cx="31" cy="15" rx="4" ry="5"/></svg>';
    tous('[data-couche="pattes"]').forEach(function (bloc) {
      var reserve = [], prochaine = 0, avant = null, gauche = false;
      for (var i = 0; i < 14; i++) {
        var p = document.createElement("span");
        p.className = "c-patte";
        p.setAttribute("aria-hidden", "true");
        p.innerHTML = PATTE;
        bloc.appendChild(p);
        reserve.push(p);
      }
      bloc.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse" && !e.pressure) return;
        var r = bloc.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (avant && Math.hypot(x - avant.x, y - avant.y) < 46) return;
        var angle = avant ? Math.atan2(y - avant.y, x - avant.x) + Math.PI / 2 : 0;
        avant = { x: x, y: y };
        gauche = !gauche;
        var patte = reserve[prochaine++ % reserve.length], decale = gauche ? -9 : 9;
        patte.style.cssText = "left:" + (x + Math.cos(angle) * decale).toFixed(1) + "px;top:" + (y + Math.sin(angle) * decale).toFixed(1) +
          "px;rotate:" + (angle * 57.3).toFixed(0) + "deg";
        patte.classList.remove("c-patte-pose");
        void patte.offsetWidth; // relance l'animation de la patte réutilisée
        patte.classList.add("c-patte-pose");
      });
      bloc.addEventListener("pointerleave", function () { avant = null; });
    });

    // ---------- Boutons aimantés : seulement avec une souris ----------

    if (souris) {
      tous('[data-couche="aimant"]').forEach(function (bouton) {
        var sx = ressort(180, 18), sy = ressort(180, 18), cadre = null;
        function suivre(t, dt) {
          ecrire(bouton, "translate", sx.pas(dt).toFixed(2) + "px " + sy.pas(dt).toFixed(2) + "px");
          return !(sx.auRepos() && sy.auRepos());
        }
        bouton.addEventListener("pointerenter", function () { cadre = bouton.getBoundingClientRect(); });
        bouton.addEventListener("pointermove", function (e) {
          if (!cadre) return;
          sx.vers(borne((e.clientX - cadre.left - cadre.width / 2) * 0.3, -8, 8));
          sy.vers(borne((e.clientY - cadre.top - cadre.height / 2) * 0.3, -8, 8));
          demarrer(suivre);
        });
        bouton.addEventListener("pointerleave", function () { sx.vers(0); sy.vers(0); demarrer(suivre); });
      });
    }
  });
})();
