/* Harlibee — 99 Allahovih imena: kartice, kviz i praćenje napretka.
   Podaci: data/imena.json · Napredak: localStorage (samo u pregledniku posjetioca). */
(function () {
  "use strict";

  var ROOT = document.documentElement.getAttribute("data-root") || "./";
  var STORE_KEY = "harlibee.imena.v1";
  var AUTO_LEARN_AFTER = 2; // koliko tačnih odgovora u kvizu označava ime naučenim
  var QUIZ_LEN = 10;

  var app = document.getElementById("imena-app");
  if (!app) return;

  /* ---------- Spremanje napretka ---------- */
  function emptyState() { return { learned: {}, streak: {}, quiz: { played: 0, answered: 0, correct: 0, best: 0 } }; }
  var state = emptyState();
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.learned) {
      state = emptyState();
      state.learned = saved.learned || {};
      state.streak = saved.streak || {};
      Object.keys(state.quiz).forEach(function (k) { if (saved.quiz && typeof saved.quiz[k] === "number") state.quiz[k] = saved.quiz[k]; });
    }
  } catch (e) { /* privatni režim ili blokirana pohrana: radimo bez spremanja */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignoriši */ }
  }

  /* ---------- Elementi ---------- */
  var grid = document.getElementById("names-grid");
  var search = document.getElementById("names-search");
  var filter = document.getElementById("names-filter");
  var practice = document.getElementById("names-practice");
  var countEl = document.getElementById("names-count");
  var liveEl = document.getElementById("names-live");
  var progressNum = document.querySelectorAll("[data-progress-num]");
  var progressBar = document.getElementById("progress-bar-fill");
  var progressText = document.getElementById("progress-text");
  var resetBtn = document.getElementById("progress-reset");
  var quizRoot = document.getElementById("quiz-root");

  var names = [];
  var byNum = {};

  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Pretraga bez obzira na dijakritike i apostrofe: "dzebbar" nalazi "El-Džebbar".
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/đ/g, "dj").replace(/dž/g, "dz")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/['’`ʿʾ-]/g, "").replace(/\s+/g, " ").trim();
  }

  function isLearned(n) { return !!state.learned[n]; }
  function learnedCount() { return Object.keys(state.learned).filter(function (k) { return state.learned[k]; }).length; }

  /* ---------- Napredak ---------- */
  function renderProgress() {
    var c = learnedCount();
    var pct = Math.round((c / 99) * 100);
    progressNum.forEach(function (n) { n.textContent = c; });
    progressBar.style.width = pct + "%";
    var bar = progressBar.parentElement;
    bar.setAttribute("aria-valuenow", String(c));
    bar.setAttribute("aria-valuetext", c + " od 99 imena naučeno (" + pct + " %)");
    var msg;
    if (c === 0) msg = "Počnite s prvim imenom – svako naučeno ime je korak bliže.";
    else if (c < 33) msg = "Lijep početak! Nastavite polahko, ime po ime.";
    else if (c < 66) msg = "Više od trećine – mašallah, samo naprijed.";
    else if (c < 99) msg = "Blizu ste cilja. Ponavljajte i ona već naučena.";
    else msg = "Mašallah! Označili ste svih 99 imena. Neka vam Allah olakša da po njima i živite.";
    progressText.textContent = msg;
  }

  function setLearned(num, value, announce) {
    if (value) state.learned[num] = true; else delete state.learned[num];
    save();
    var card = grid.querySelector('[data-num="' + num + '"]');
    if (card) updateCard(card, num);
    renderProgress();
    if (announce) liveEl.textContent = byNum[num].transliteracija + (value ? " je označeno kao naučeno." : " više nije označeno kao naučeno.") + " Ukupno: " + learnedCount() + " od 99.";
  }

  /* ---------- Kartice ---------- */
  function updateCard(card, num) {
    var learned = isLearned(num);
    card.classList.toggle("is-learned", learned);
    var btn = card.querySelector(".toggle-learned");
    btn.setAttribute("aria-pressed", String(learned));
  }

  function buildCard(n) {
    var li = document.createElement("li");
    li.className = "name-card";
    li.setAttribute("data-num", n.broj);
    var meanId = "znacenje-" + n.broj;
    li.innerHTML =
      '<span class="name-num"><span class="visually-hidden">Redni broj </span>' + n.broj + '</span>' +
      '<span class="learned-flag" aria-hidden="true">' + ICON_CHECK + '</span>' +
      '<p class="name-ar" lang="ar" dir="rtl"></p>' +
      '<h3 class="name-tr"></h3>' +
      '<p class="name-mean" id="' + meanId + '"></p>' +
      '<button type="button" class="btn btn--ghost btn--small reveal" aria-controls="' + meanId + '" aria-expanded="false" hidden>Prikaži značenje</button>' +
      '<button type="button" class="btn btn--ghost btn--small toggle-learned" aria-pressed="false">' + ICON_CHECK + '<span>Naučeno</span><span class="visually-hidden"></span></button>';
    li.querySelector(".name-ar").textContent = n.arapski;
    li.querySelector(".name-tr").textContent = n.transliteracija;
    li.querySelector(".name-mean").textContent = n.znacenje;
    li.querySelector(".toggle-learned .visually-hidden").textContent = ": " + n.transliteracija;
    updateCard(li, n.broj);
    return li;
  }

  function applyPracticeMode() {
    var on = practice.checked;
    grid.classList.toggle("practice", on);
    grid.querySelectorAll(".name-card").forEach(function (card) {
      var mean = card.querySelector(".name-mean");
      var reveal = card.querySelector(".reveal");
      mean.hidden = on;
      reveal.hidden = !on;
      reveal.setAttribute("aria-expanded", "false");
      reveal.textContent = "Prikaži značenje";
    });
  }

  function applyFilter() {
    var q = norm(search.value);
    var mode = filter.value;
    var shown = 0;
    grid.querySelectorAll(".name-card").forEach(function (card) {
      var n = byNum[card.getAttribute("data-num")];
      var hay = n._search;
      var matchQ = !q || hay.indexOf(q) !== -1 || String(n.broj) === q;
      var learned = isLearned(n.broj);
      var matchF = mode === "sva" || (mode === "naucena" && learned) || (mode === "nenaucena" && !learned);
      var show = matchQ && matchF;
      card.hidden = !show;
      if (show) shown++;
    });
    countEl.textContent = shown === 99 ? "Prikazano svih 99 imena." : "Prikazano: " + shown + " od 99.";
    var empty = document.getElementById("names-empty");
    empty.hidden = shown !== 0;
  }

  grid.addEventListener("click", function (e) {
    var card = e.target.closest(".name-card");
    if (!card) return;
    var num = +card.getAttribute("data-num");
    if (e.target.closest(".toggle-learned")) {
      setLearned(num, !isLearned(num), true);
      if (filter.value !== "sva") applyFilter();
    } else if (e.target.closest(".reveal")) {
      var btn = e.target.closest(".reveal");
      var mean = card.querySelector(".name-mean");
      var open = mean.hidden;
      mean.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Sakrij značenje" : "Prikaži značenje";
    }
  });
  var debounce;
  search.addEventListener("input", function () { clearTimeout(debounce); debounce = setTimeout(applyFilter, 120); });
  filter.addEventListener("change", applyFilter);
  practice.addEventListener("change", applyPracticeMode);

  resetBtn.addEventListener("click", function () {
    if (!confirm("Da li sigurno želite obrisati sav napredak (naučena imena i rezultate kviza)?")) return;
    state = emptyState();
    save();
    grid.querySelectorAll(".name-card").forEach(function (card) { updateCard(card, +card.getAttribute("data-num")); });
    renderProgress();
    applyFilter();
    renderQuizIntro();
    liveEl.textContent = "Napredak je obrisan.";
  });

  /* ---------- Tabovi (Kartice / Kviz) ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var sel = t === tab;
      t.setAttribute("aria-selected", String(sel));
      t.tabIndex = sel ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !sel;
    });
    if (focus) tab.focus();
    try { history.replaceState(null, "", "#" + tab.getAttribute("aria-controls")); } catch (e) { /* ignoriši */ }
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* ---------- Kviz ---------- */
  var quiz = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function renderQuizIntro() {
    var q = state.quiz;
    var accuracy = q.answered ? Math.round((q.correct / q.answered) * 100) + " %" : "–";
    quizRoot.innerHTML =
      '<div class="quiz-card">' +
        '<h2 id="quiz-heading" tabindex="-1">Provjerite svoje znanje</h2>' +
        '<p>Kviz ima ' + QUIZ_LEN + ' pitanja s po četiri ponuđena odgovora. Kad neko ime pogodite ' + AUTO_LEARN_AFTER + ' puta zaredom, automatski se označava kao naučeno.</p>' +
        '<form class="quiz-setup" id="quiz-setup">' +
          '<fieldset><legend>Vrsta pitanja</legend>' +
            '<label class="radio"><input type="radio" name="tip" value="znacenje" checked> Vidim ime – biram značenje</label>' +
            '<label class="radio"><input type="radio" name="tip" value="ime"> Vidim značenje – biram ime</label>' +
            '<label class="radio"><input type="radio" name="tip" value="arapski"> Vidim arapski zapis – biram transliteraciju</label>' +
          '</fieldset>' +
          '<fieldset><legend>Koja imena</legend>' +
            '<label class="radio"><input type="radio" name="skup" value="sva" checked> Sva imena</label>' +
            '<label class="radio"><input type="radio" name="skup" value="nenaucena"> Samo ona koja još nisam naučio/la</label>' +
            '<label class="radio"><input type="radio" name="skup" value="prva33"> Prva 33 imena</label>' +
          '</fieldset>' +
          '<div class="btn-row"><button type="submit" class="btn">Započni kviz</button></div>' +
        '</form>' +
        '<div class="stat-row" aria-label="Vaša statistika kviza">' +
          '<div class="stat"><b>' + q.played + '</b><span>odigranih kvizova</span></div>' +
          '<div class="stat"><b>' + q.best + '/' + QUIZ_LEN + '</b><span>najbolji rezultat</span></div>' +
          '<div class="stat"><b>' + accuracy + '</b><span>tačnost ukupno</span></div>' +
        '</div>' +
      '</div>';
    document.getElementById("quiz-setup").addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      startQuiz(fd.get("tip"), fd.get("skup"));
    });
  }

  function startQuiz(tip, skup) {
    var pool = names;
    if (skup === "nenaucena") pool = names.filter(function (n) { return !isLearned(n.broj); });
    if (skup === "prva33") pool = names.slice(0, 33);
    if (pool.length === 0) {
      liveEl.textContent = "Sva imena su već označena kao naučena. Izaberite opciju „Sva imena”.";
      alert("Sva imena su već označena kao naučena – izaberite „Sva imena”.");
      return;
    }
    quiz = { tip: tip, questions: shuffle(pool).slice(0, Math.min(QUIZ_LEN, pool.length)), index: 0, score: 0, answered: false };
    renderQuestion();
  }

  function answerText(n, tip) { return tip === "znacenje" ? n.znacenje : n.transliteracija; }

  function renderQuestion() {
    var n = quiz.questions[quiz.index];
    var tip = quiz.tip;
    var distractors = shuffle(names.filter(function (x) { return x.broj !== n.broj; })).slice(0, 3);
    var options = shuffle([n].concat(distractors));
    quiz.options = options;
    quiz.answered = false;

    var prompt;
    if (tip === "znacenje") {
      prompt = '<p class="q-label">Šta znači ovo ime?</p><p class="q-ar" lang="ar" dir="rtl">' + esc(n.arapski) + '</p><p class="q-main">' + esc(n.transliteracija) + '</p>';
    } else if (tip === "ime") {
      prompt = '<p class="q-label">Koje ime ima ovo značenje?</p><p class="q-main">„' + esc(n.znacenje) + '”</p>';
    } else {
      prompt = '<p class="q-label">Kako se čita ovo ime?</p><p class="q-ar" lang="ar" dir="rtl">' + esc(n.arapski) + '</p>';
    }

    var keys = ["A", "B", "C", "D"];
    var opts = options.map(function (o, i) {
      return '<li><button type="button" class="quiz-option" data-num="' + o.broj + '"><span class="key" aria-hidden="true">' + keys[i] + '</span><span>' + esc(answerText(o, tip)) + '</span></button></li>';
    }).join("");

    quizRoot.innerHTML =
      '<div class="quiz-card">' +
        '<div class="quiz-top"><span>Pitanje ' + (quiz.index + 1) + ' od ' + quiz.questions.length + '</span><span>Tačnih: ' + quiz.score + '</span></div>' +
        '<div class="quiz-question" id="quiz-q" tabindex="-1">' + prompt + '</div>' +
        '<ul class="quiz-options" aria-labelledby="quiz-q">' + opts + '</ul>' +
        '<p class="quiz-feedback" id="quiz-feedback" role="status" aria-live="polite"></p>' +
        '<div class="quiz-actions">' +
          '<button type="button" class="btn btn--ghost btn--small" id="quiz-quit">Prekini kviz</button>' +
          '<button type="button" class="btn" id="quiz-next" hidden>' + (quiz.index + 1 < quiz.questions.length ? "Sljedeće pitanje" : "Pogledaj rezultat") + '</button>' +
        '</div>' +
      '</div>';

    quizRoot.querySelectorAll(".quiz-option").forEach(function (b) {
      b.addEventListener("click", function () { answer(+b.getAttribute("data-num")); });
    });
    document.getElementById("quiz-next").addEventListener("click", nextQuestion);
    document.getElementById("quiz-quit").addEventListener("click", function () {
      quiz = null;
      renderQuizIntro();
      document.getElementById("quiz-heading").focus();
    });
    document.getElementById("quiz-q").focus();
  }

  function answer(num) {
    if (quiz.answered) return;
    quiz.answered = true;
    var n = quiz.questions[quiz.index];
    var ok = num === n.broj;
    var fb = document.getElementById("quiz-feedback");

    state.quiz.answered++;
    if (ok) {
      quiz.score++;
      state.quiz.correct++;
      state.streak[n.broj] = (state.streak[n.broj] || 0) + 1;
    } else {
      state.streak[n.broj] = 0;
    }
    var newlyLearned = ok && !isLearned(n.broj) && state.streak[n.broj] >= AUTO_LEARN_AFTER;
    save();

    quizRoot.querySelectorAll(".quiz-option").forEach(function (b) {
      var bn = +b.getAttribute("data-num");
      b.disabled = true;
      if (bn === n.broj) {
        b.classList.add("is-correct");
        b.insertAdjacentHTML("beforeend", '<span class="visually-hidden"> (tačan odgovor)</span>');
      } else if (bn === num) {
        b.classList.add("is-wrong");
        b.insertAdjacentHTML("beforeend", '<span class="visually-hidden"> (vaš odgovor)</span>');
      }
    });

    var text = ok
      ? "Tačno! " + n.transliteracija + " – " + n.znacenje + "."
      : "Netačno. Tačan odgovor: " + n.transliteracija + " – " + n.znacenje + ".";
    if (newlyLearned) {
      setLearned(n.broj, true, false);
      text += " Ime je sada označeno kao naučeno.";
    }
    fb.textContent = text;
    fb.className = "quiz-feedback " + (ok ? "ok" : "bad");
    quizRoot.querySelector(".quiz-top span:last-child").textContent = "Tačnih: " + quiz.score;
    var next = document.getElementById("quiz-next");
    next.hidden = false;
    next.focus();
  }

  function nextQuestion() {
    quiz.index++;
    if (quiz.index < quiz.questions.length) { renderQuestion(); return; }
    var total = quiz.questions.length;
    state.quiz.played++;
    if (total === QUIZ_LEN && quiz.score > state.quiz.best) state.quiz.best = quiz.score;
    save();
    var pct = quiz.score / total;
    var msg = pct === 1 ? "Mašallah, sve tačno!" : pct >= 0.7 ? "Odlično – znanje se vidi." : pct >= 0.4 ? "Dobro je. Ponovite kartice pa pokušajte opet." : "Svaki početak je težak. Prođite kroz kartice i vratite se.";
    quizRoot.innerHTML =
      '<div class="quiz-card quiz-result">' +
        '<h2 id="quiz-heading" tabindex="-1">Rezultat kviza</h2>' +
        '<p class="score">' + quiz.score + ' / ' + total + '</p>' +
        '<p>' + msg + '</p>' +
        '<p>Naučeno ukupno: <strong>' + learnedCount() + ' od 99</strong> imena.</p>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button type="button" class="btn" id="quiz-again">Igraj ponovo</button>' +
          '<button type="button" class="btn btn--ghost" id="quiz-cards">Nazad na kartice</button>' +
        '</div>' +
      '</div>';
    var lastTip = quiz.tip;
    quiz = null;
    document.getElementById("quiz-again").addEventListener("click", function () {
      renderQuizIntro();
      var r = quizRoot.querySelector('input[name="tip"][value="' + lastTip + '"]');
      if (r) r.checked = true;
      document.getElementById("quiz-heading").focus();
    });
    document.getElementById("quiz-cards").addEventListener("click", function () {
      renderQuizIntro();
      selectTab(tabs[0], true);
    });
    document.getElementById("quiz-heading").focus();
  }

  /* ---------- Učitavanje podataka ---------- */
  fetch(ROOT + "data/imena.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      names = data.imena;
      var frag = document.createDocumentFragment();
      names.forEach(function (n) {
        n._search = norm(n.transliteracija + " " + n.znacenje) + " " + n.arapski;
        byNum[n.broj] = n;
        frag.appendChild(buildCard(n));
      });
      grid.innerHTML = "";
      grid.appendChild(frag);
      grid.setAttribute("aria-busy", "false");
      applyPracticeMode();
      applyFilter();
      renderProgress();
      renderQuizIntro();
      if (location.hash === "#panel-kviz") selectTab(tabs[1], false);
    })
    .catch(function () {
      grid.setAttribute("aria-busy", "false");
      grid.innerHTML = '<li class="notice">Imena nije moguće učitati. Ako stranicu otvarate direktno s diska, pokrenite je preko lokalnog servera (upute su u README datoteci) ili je otvorite na objavljenom sajtu.</li>';
    });
})();
