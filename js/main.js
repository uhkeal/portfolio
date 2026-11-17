/* ==========================================================================
   Tariq Ebo — portfolio scripts
   Three small features, each in its own function:
     1. setupReveal()   fades sections in as you scroll
     2. setupLightbox() click an image to see it full size
     3. setupRace()     the two pixel cars lapping the nav bar
   You can delete any one call at the bottom and the rest keeps working.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Scroll reveal ------------------------------------------------------- */
  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (el) { observer.observe(el); });
  }

  /* 2. Lightbox ------------------------------------------------------------ */
  function setupLightbox() {
    var images = document.querySelectorAll("img[data-zoom]");
    if (!images.length || !window.HTMLDialogElement) return;

    var dialog = document.createElement("dialog");
    dialog.className = "lightbox fit";
    dialog.setAttribute("aria-label", "Image viewer");
    var big = document.createElement("img");
    dialog.appendChild(big);
    document.body.appendChild(dialog);

    images.forEach(function (img) {
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "View full size: " + (img.alt || "image"));
      function open() {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        dialog.showModal();
      }
      img.addEventListener("click", open);
      img.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });

    // Click the image or the dark backdrop to close. Esc also works.
    dialog.addEventListener("click", function () { dialog.close(); });
  }

  /* 3. The nav race -------------------------------------------------------- */
  var LAP_MS = 7000;        // your car: one lap every 7 seconds
  var RIVAL_LAP_MS = 7700;  // the blue car is a little slower
  var RIVAL_HEAD_START = 3500; // ...but starts half a lap ahead
  var DRS_SPEED = 1.9;      // speed boost while the mouse is over the nav

  // An original 8-bit car, seen from above, nose pointing right.
  function carSvg(body, helmet, wing) {
    return (
      '<svg viewBox="0 0 16 8" width="32" height="16" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="0" y="1" width="2" height="6" fill="' + wing + '"/>' +
      '<rect x="2" y="0" width="3" height="2" fill="#111"/><rect x="2" y="6" width="3" height="2" fill="#111"/>' +
      '<rect x="10" y="0" width="3" height="2" fill="#111"/><rect x="10" y="6" width="3" height="2" fill="#111"/>' +
      '<rect x="4" y="2" width="6" height="4" fill="' + body + '"/>' +
      '<rect x="2" y="3" width="12" height="2" fill="' + body + '"/>' +
      '<rect x="5" y="2" width="1" height="4" fill="' + wing + '"/>' +
      '<rect x="7" y="3" width="2" height="2" fill="' + helmet + '"/>' +
      '<rect x="9" y="3" width="1" height="2" fill="#111"/>' +
      '<rect x="14" y="3" width="1" height="2" fill="' + body + '"/>' +
      '<rect x="14" y="1" width="2" height="6" fill="' + wing + '"/>' +
      "</svg>"
    );
  }

  function setupRace() {
    var nav = document.querySelector(".nav");
    if (!nav || !("offsetPath" in document.documentElement.style)) return;

    var accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#FF6A3D";
    var rivalColor = "#3978F6";

    var race = document.createElement("div");
    race.className = "race";
    race.setAttribute("aria-hidden", "true");
    race.innerHTML = '<div class="race-track"></div><div class="race-flag"></div>';
    nav.prepend(race);

    // Build one car plus the fading streak behind it.
    function buildTeam(color, carMarkup, trailCount) {
      var parts = [];
      for (var i = 0; i < trailCount; i++) {
        var trail = document.createElement("div");
        trail.className = "race-trail";
        trail.style.background = color;
        trail.style.opacity = String(0.5 - i * (0.42 / trailCount));
        race.appendChild(trail);
        parts.push({ el: trail, lag: 40 + i * 30 });
      }
      var car = document.createElement("div");
      car.className = "race-car";
      car.innerHTML = carMarkup;
      race.appendChild(car);
      parts.push({ el: car, lag: 0, isCar: true });
      return parts;
    }

    var rival = buildTeam(rivalColor, carSvg(rivalColor, "#EDEDED", "#111"), 4);
    var team = buildTeam(accent, carSvg(accent, "#F5D547", "#EDEDED"), 5);
    var movers = rival.concat(team);

    // The track is a rounded "stadium" shape 8px outside the nav pill.
    function layoutTrack() {
      var w = nav.offsetWidth;
      var h = nav.offsetHeight;
      var x0 = -8, y0 = -8, x1 = w + 8, y1 = h + 8;
      var r = Math.min((y1 - y0) / 2, (x1 - x0) / 2);
      var d =
        "M" + (x0 + r) + "," + y0 +
        " H" + (x1 - r) +
        " A" + r + "," + r + " 0 0 1 " + (x1 - r) + "," + y1 +
        " H" + (x0 + r) +
        " A" + r + "," + r + " 0 0 1 " + (x0 + r) + "," + y0 + " Z";
      movers.forEach(function (m) { m.el.style.offsetPath = 'path("' + d + '")'; });
    }
    layoutTrack();
    if ("ResizeObserver" in window) new ResizeObserver(layoutTrack).observe(nav);

    // With reduced motion the cars stay parked on the start line.
    if (reduceMotion || !Element.prototype.animate) {
      rival.forEach(function (m) { m.el.style.offsetDistance = "45%"; });
      return;
    }

    function drive(parts, lapMs, headStart) {
      return parts.map(function (m) {
        var anim = m.el.animate(
          [{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
          { duration: lapMs, iterations: Infinity, delay: -(headStart + lapMs - m.lag) }
        );
        if (m.isCar) anim.isCar = true;
        return anim;
      });
    }

    var rivalAnims = drive(rival, RIVAL_LAP_MS, RIVAL_HEAD_START);
    var teamAnims = drive(team, LAP_MS, 0);
    var mainAnim = teamAnims[teamAnims.length - 1];
    var rivalAnim = rivalAnims[rivalAnims.length - 1];
    var mainStart = mainAnim.currentTime || 0;
    var rivalStart = (rivalAnim.currentTime || 0) - RIVAL_HEAD_START;

    function setSpeed(rate) {
      teamAnims.forEach(function (a) { a.updatePlaybackRate(rate); });
    }

    // The little "P2  LAP 01" readout in the nav.
    var chip = document.querySelector(".lap-chip");
    var state = { lap: 1, pos: 2, drs: false, fastest: false, pitting: false };
    var bestLap = null;
    var lapStartedAt = performance.now();
    var fastestTimer = null;

    function renderChip() {
      if (!chip) return;
      chip.classList.toggle("is-fastest", state.fastest);
      var lap = state.lap < 10 ? "0" + state.lap : String(state.lap);
      chip.innerHTML = state.fastest
        ? "FASTEST LAP"
        : "<b>P" + state.pos + "</b><span>LAP <b>" + lap + "</b></span>" +
          (state.drs ? '<span class="drs">DRS</span>' : "");
    }
    renderChip();

    setInterval(function () {
      var mainLaps = ((mainAnim.currentTime || 0) - mainStart) / LAP_MS;
      var rivalLaps = ((rivalAnim.currentTime || 0) - rivalStart) / RIVAL_LAP_MS;
      var lap = Math.floor(mainLaps) + 1;
      var pos = rivalLaps > mainLaps ? 2 : 1;
      var changed = pos !== state.pos;
      state.pos = pos;

      if (lap !== state.lap) {
        var now = performance.now();
        var lapTime = now - lapStartedAt;
        lapStartedAt = now;
        // A lap clearly quicker than your best (only possible with DRS) flashes purple.
        if (state.lap >= 2 && bestLap !== null && lapTime < bestLap - 300) {
          state.fastest = true;
          clearTimeout(fastestTimer);
          fastestTimer = setTimeout(function () { state.fastest = false; renderChip(); }, 2500);
        }
        if (state.lap >= 2 && (bestLap === null || lapTime < bestLap)) bestLap = lapTime;
        state.lap = lap;
        changed = true;
      }
      if (changed) renderChip();
    }, 200);

    // DRS: hover the nav and your car speeds up.
    nav.addEventListener("mouseenter", function () {
      if (state.pitting) return;
      setSpeed(DRS_SPEED);
      state.drs = true;
      renderChip();
    });
    nav.addEventListener("mouseleave", function () {
      if (state.pitting) return;
      setSpeed(1);
      state.drs = false;
      renderChip();
    });

    // Pit stop: clicking Resume stops the car for a moment and plays team radio.
    var pitTimer = null;
    document.querySelectorAll("[data-pit]").forEach(function (link) {
      link.addEventListener("click", function () {
        setSpeed(0);
        state.pitting = true;
        state.drs = false;
        renderChip();

        var old = nav.querySelector(".radio");
        if (old) old.remove();
        var radio = document.createElement("div");
        radio.className = "radio glass";
        radio.setAttribute("role", "status");
        radio.innerHTML = "<span><b>RADIO</b> · Box, box. Resume incoming.</span>";
        nav.appendChild(radio);

        clearTimeout(pitTimer);
        pitTimer = setTimeout(function () {
          radio.remove();
          setSpeed(1);
          state.pitting = false;
        }, 1800);
      });
    });
  }

  setupReveal();
  setupLightbox();
  setupRace();
})();
