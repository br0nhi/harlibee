/* Harlibee — zajednički JavaScript za sve stranice. Bez biblioteka. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  // Relativna putanja do korijena sajta (npr. "../"), postavljena na <html data-root>.
  var ROOT = doc.getAttribute("data-root") || "./";
  var CHANNEL_URL = "https://www.youtube.com/@harlibee";

  /* ---------- Navigacija na mobitelu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
  }

  /* ---------- Godina u podnožju ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Pomoćne funkcije ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // Ručno formatiranje: ne oslanjamo se na to da preglednik ima podatke za bosanski jezik.
  var MONTHS = ["januar", "februar", "mart", "april", "maj", "juni", "juli", "august", "septembar", "oktobar", "novembar", "decembar"];
  function formatDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.getDate() + ". " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ".";
  }

  // "PT1H8M9S" -> "1:08:09"
  function formatDuration(iso) {
    var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
    if (!m) return "";
    var h = +m[1] || 0, min = +m[2] || 0, s = +m[3] || 0;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return h ? h + ":" + pad(min) + ":" + pad(s) : min + ":" + pad(s);
  }
  function durationWords(iso) {
    var m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || "");
    if (!m) return "";
    var total = (+m[1] || 0) * 60 + (+m[2] || 0);
    return total ? total + " min" : "";
  }

  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_CLOCK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- Lagani YouTube player ----------
     <div class="yt" data-id="VIDEO_ID" data-title="Naslov"></div>
     Iframe (youtube-nocookie) se učitava tek kad posjetilac klikne. */
  function initYt(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    var id = box.getAttribute("data-id");
    var title = box.getAttribute("data-title") || "YouTube video";
    var start = box.getAttribute("data-start");
    var btn = el("button", { type: "button", class: "yt-button", "aria-label": "Pokreni video: " + title });
    var img = el("img", {
      src: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
      alt: "", loading: "lazy", decoding: "async", width: "480", height: "360"
    });
    var label = el("span", { class: "yt-play", "aria-hidden": "true", html: ICON_PLAY + "<span>Pogledaj video</span>" });
    btn.appendChild(img);
    btn.appendChild(label);
    box.innerHTML = "";
    box.appendChild(btn);
    btn.addEventListener("click", function () {
      var src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) +
        "?autoplay=1&rel=0&modestbranding=1" + (start ? "&start=" + encodeURIComponent(start) : "");
      var iframe = el("iframe", {
        src: src,
        title: title,
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowfullscreen: "",
        referrerpolicy: "strict-origin-when-cross-origin"
      });
      box.innerHTML = "";
      box.appendChild(iframe);
      iframe.focus();
    });
  }
  document.querySelectorAll(".yt[data-id]").forEach(initYt);

  /* ---------- Najnoviji videi (data/videos.json) ---------- */
  function videoCard(v) {
    var url = "https://www.youtube.com/watch?v=" + encodeURIComponent(v.id);
    var li = el("li", { class: "card card--link video-card" });
    var thumb = el("div", { class: "thumb" }, [
      el("img", { src: "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg", alt: "", loading: "lazy", decoding: "async", width: "480", height: "360" }),
      el("span", { class: "play", "aria-hidden": "true", html: ICON_PLAY })
    ]);
    var a = el("a", { class: "stretched", href: url, target: "_blank", rel: "noopener", text: v.title });
    a.appendChild(el("span", { class: "visually-hidden", text: " (otvara YouTube u novom prozoru)" }));
    var meta = el("p", { class: "meta" }, [
      v.published ? el("span", {}, [el("time", { datetime: v.published.slice(0, 10), text: formatDate(v.published) })]) : null,
      v.duration ? el("span", { html: ICON_CLOCK + "<span class=\"visually-hidden\">Trajanje: </span>" + durationWords(v.duration) }) : null
    ]);
    var body = el("div", { class: "body" }, [el("h3", {}, [a]), meta]);
    li.appendChild(thumb);
    li.appendChild(body);
    return li;
  }

  var latest = document.querySelector("[data-latest-videos]");
  if (latest) {
    var count = parseInt(latest.getAttribute("data-count"), 10) || 6;
    var featured = document.querySelector("[data-featured-video]");
    fetch(ROOT + "data/videos.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var list = (data.videos || []).slice();
        list.sort(function (a, b) { return new Date(b.published) - new Date(a.published); });
        if (featured && list.length) {
          var first = list.shift();
          featured.querySelector("[data-fv-title]").textContent = first.title;
          var fvMeta = featured.querySelector("[data-fv-meta]");
          fvMeta.innerHTML = "";
          fvMeta.appendChild(el("span", {}, [el("time", { datetime: first.published.slice(0, 10), text: formatDate(first.published) })]));
          if (first.duration) fvMeta.appendChild(el("span", { html: ICON_CLOCK + "<span class=\"visually-hidden\">Trajanje: </span>" + formatDuration(first.duration) }));
          var link = featured.querySelector("[data-fv-link]");
          link.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(first.id);
          var box = featured.querySelector(".yt");
          box.setAttribute("data-id", first.id);
          box.setAttribute("data-title", first.title);
          initYt(box);
          featured.hidden = false;
        }
        latest.innerHTML = "";
        list.slice(0, count).forEach(function (v) { latest.appendChild(videoCard(v)); });
        latest.setAttribute("aria-busy", "false");
      })
      .catch(function () {
        latest.setAttribute("aria-busy", "false");
        latest.innerHTML = "";
        var li = el("li", { class: "notice" });
        li.innerHTML = 'Videe trenutno nije moguće učitati. Pogledajte ih direktno na <a class="ext" href="' + CHANNEL_URL + '/videos" target="_blank" rel="noopener">YouTube kanalu Harlibee</a>.';
        latest.appendChild(li);
      });
  }

  /* ---------- Newsletter (Formspree) ---------- */
  document.querySelectorAll("form[data-newsletter]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var submit = form.querySelector("[type=submit]");
    var email = form.querySelector("input[type=email]");

    function show(msg, ok) {
      status.textContent = msg;
      status.className = "form-status " + (ok ? "ok" : "bad");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!email.value || !email.checkValidity()) {
        show("Molimo upišite ispravnu e-mail adresu (npr. ime@primjer.ba).", false);
        email.setAttribute("aria-invalid", "true");
        email.focus();
        return;
      }
      email.removeAttribute("aria-invalid");
      var consent = form.querySelector("input[name=saglasnost]");
      if (consent && !consent.checked) {
        show("Da bismo vam slali newsletter, potrebna je vaša saglasnost.", false);
        consent.focus();
        return;
      }
      var original = submit.textContent;
      submit.disabled = true;
      submit.textContent = "Šaljem…";
      status.textContent = "";
      status.className = "form-status";

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, data: d }; });
        })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            show("Hvala! Prijava je primljena. Provjerite e-poštu – ako stigne poruka za potvrdu, kliknite na link u njoj.", true);
          } else {
            var msg = (res.data && res.data.errors && res.data.errors.map(function (x) { return x.message; }).join(" ")) || "";
            show("Prijava nije uspjela. " + (msg ? msg + " " : "") + "Pokušajte ponovo za nekoliko minuta.", false);
          }
        })
        .catch(function () {
          show("Nema veze s internetom ili je servis nedostupan. Pokušajte ponovo.", false);
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = original;
        });
    });
  });

  /* ---------- Dijeljenje članka ---------- */
  document.querySelectorAll("[data-share]").forEach(function (box) {
    var canonical = document.querySelector('link[rel="canonical"]');
    var url = canonical ? canonical.href : location.href;
    var title = document.title;
    var fb = box.querySelector("[data-share-facebook]");
    var wa = box.querySelector("[data-share-whatsapp]");
    var copy = box.querySelector("[data-share-copy]");
    var copied = box.querySelector("[data-share-status]");
    if (fb) fb.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
    if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(title + " " + url);
    if (copy) {
      copy.addEventListener("click", function () {
        var done = function () { if (copied) copied.textContent = "Link je kopiran."; };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("Kopirajte link:", url); });
        else prompt("Kopirajte link:", url);
      });
    }
  });
})();
