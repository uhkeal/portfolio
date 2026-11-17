/* ==========================================================================
   Tariq Ebo — koi pond background
   A koi swims behind the page. Moving the mouse leaves a trail in the water,
   and clicking (or tapping) drops a ripple that the fish comes to look at.
   Click right next to the fish and it darts away.

   Everything you might want to tweak is in KOI below.
   To turn the pond off, delete the <script src="js/koi.js"> line in the HTML.
   ========================================================================== */

(function () {
  "use strict";

  var KOI = {
    count: 1,          // how many fish
    size: 0.42,        // fish length as a share of the smaller screen side
    minLength: 190,    // ...but never shorter than this (px)
    maxLength: 400,    // ...or longer than this (px)
    opacity: 0.5,      // 1 = solid, lower = further "under the water"
    speed: 0.26,       // cruising speed, in body lengths per second
    body: "#f3ede2",   // base color
    fin: "#f7f1e8",    // fins and tail
    water: "190, 220, 255", // ripple + trail color, as "r, g, b"
    trailLife: 0.9,    // seconds a cursor trail lasts
    rippleLife: 1.6    // seconds a click ripple lasts
    // The patches use the site's --accent color from css/style.css.
  };

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // no moving background for people who ask for less motion

  var canvas = document.createElement("canvas");
  canvas.className = "pond";
  canvas.setAttribute("aria-hidden", "true");
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.body.prepend(canvas);

  var accent =
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff6a3d";

  var W = 0, H = 0, fishLength = 0;
  var TAU = Math.PI * 2;
  var JOINTS = 14;
  // Half-width of the body at each joint, head to tail (1 = widest point).
  var PROFILE = [0.6, 0.84, 0.97, 1, 0.98, 0.92, 0.84, 0.74, 0.63, 0.52, 0.42, 0.33, 0.25, 0.19];
  // Orange patches: which joint they sit on, how far off-center, how big.
  var PATCHES = [
    { joint: 1, side: 0.1, size: 0.8 },
    { joint: 4, side: -0.6, size: 0.75 },
    { joint: 6, side: 0.55, size: 0.6 },
    { joint: 9, side: -0.15, size: 0.7 },
    { joint: 12, side: 0.2, size: 0.45 }
  ];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fishLength = Math.max(KOI.minLength, Math.min(KOI.maxLength, Math.min(W, H) * KOI.size));
  }
  resize();
  window.addEventListener("resize", resize);

  function wrapAngle(a) {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  }

  /* The fish ---------------------------------------------------------------- */
  function makeFish(index) {
    var fish = {
      x: W * (0.7 - index * 0.4),
      y: H * (0.6 - index * 0.2),
      heading: Math.PI + index,
      speed: 0,
      phase: Math.random() * TAU,
      target: null,
      curious: false,
      joints: []
    };
    for (var i = 0; i < JOINTS; i++) {
      fish.joints.push({
        x: fish.x - Math.cos(fish.heading) * i * (fishLength / JOINTS),
        y: fish.y - Math.sin(fish.heading) * i * (fishLength / JOINTS)
      });
    }
    pickTarget(fish);
    return fish;
  }

  function pickTarget(fish) {
    var m = fishLength * 0.25;
    fish.target = { x: m + Math.random() * (W - m * 2), y: m + Math.random() * (H - m * 2) };
    fish.curious = false;
  }

  function updateFish(fish, dt, time) {
    var cruise = fishLength * KOI.speed;
    var dx = fish.target.x - fish.x;
    var dy = fish.target.y - fish.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < fishLength * 0.4) pickTarget(fish);

    // Ease toward cruising speed (faster when something caught its eye).
    var wanted = cruise * (fish.curious ? 1.7 : 0.8 + 0.3 * Math.sin(time * 0.4));
    fish.speed += (wanted - fish.speed) * Math.min(1, dt * 1.2);

    // Turn toward the target, a bit at a time.
    // (Turning is tied to speed so the fish swims wide arcs instead of folding in half.)
    var turn = (fish.speed / (fishLength * 0.6)) * dt;
    var diff = wrapAngle(Math.atan2(dy, dx) - fish.heading);
    fish.heading += Math.max(-turn, Math.min(turn, diff));

    fish.phase += dt * (2.2 + (fish.speed / fishLength) * 9);
    var wobble = 0.12 * Math.sin(fish.phase);
    fish.x += Math.cos(fish.heading + wobble) * fish.speed * dt;
    fish.y += Math.sin(fish.heading + wobble) * fish.speed * dt;

    // The body is a chain: each joint is pulled along behind the one in front.
    var seg = fishLength / JOINTS;
    var joints = fish.joints;
    joints[0].x = fish.x;
    joints[0].y = fish.y;
    for (var i = 1; i < JOINTS; i++) {
      var ax = joints[i - 1].x - joints[i].x;
      var ay = joints[i - 1].y - joints[i].y;
            var angle = Math.atan2(ay, ax);
      if (i > 1) {
        // Don't let any one joint bend more than a real spine would.
        var before = Math.atan2(joints[i - 2].y - joints[i - 1].y, joints[i - 2].x - joints[i - 1].x);
        angle = before + Math.max(-0.28, Math.min(0.28, wrapAngle(angle - before)));
      }
      joints[i].x = joints[i - 1].x - Math.cos(angle) * seg;
      joints[i].y = joints[i - 1].y - Math.sin(angle) * seg;
    }
  }

  function smoothClosedPath(points) {
    var n = points.length;
    ctx.beginPath();
    ctx.moveTo((points[n - 1].x + points[0].x) / 2, (points[n - 1].y + points[0].y) / 2);
    for (var i = 0; i < n; i++) {
      var next = points[(i + 1) % n];
      ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) / 2, (points[i].y + next.y) / 2);
    }
    ctx.closePath();
  }

  function drawFin(x, y, angle, length, width) {
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(angle) * length * 0.5, y + Math.sin(angle) * length * 0.5,
      length * 0.5, width * 0.5, angle, 0, TAU);
    ctx.fill();
  }

  function drawFish(fish) {
    var joints = fish.joints;
    var maxW = fishLength * 0.105;
    var pts = [];   // spine points with the swimming wave applied
    var i;

    for (i = 0; i < JOINTS; i++) {
      var prev = i === 0 ? null : joints[i - 1];
      var angle = prev
        ? Math.atan2(prev.y - joints[i].y, prev.x - joints[i].x)
        : Math.atan2(joints[0].y - joints[1].y, joints[0].x - joints[1].x);
      // Side-to-side wave that gets bigger toward the tail.
      var t = i / (JOINTS - 1);
      var wave = Math.sin(fish.phase - i * 0.5) * fishLength * 0.045 * (0.15 + t * t);
      var nx = Math.cos(angle + Math.PI / 2);
      var ny = Math.sin(angle + Math.PI / 2);
      pts.push({
        x: joints[i].x + nx * wave, y: joints[i].y + ny * wave,
        nx: nx, ny: ny, angle: angle, w: PROFILE[i] * maxW
      });
    }

    var head = pts[0];
    var tail = pts[JOINTS - 1];
    var flap = Math.sin(fish.phase) * 0.22;

    ctx.save();
    ctx.globalAlpha = KOI.opacity;

    // Fins and tail sit under the body and are see-through.
    ctx.fillStyle = KOI.fin;
    ctx.globalAlpha = KOI.opacity * 0.55;
    [[3, 0.17, 0.42], [8, 0.085, 0.45]].forEach(function (f) {
      var p = pts[f[0]];
      var len = fishLength * f[1];
      for (var s = -1; s <= 1; s += 2) {
        drawFin(p.x + p.nx * s * p.w * 0.8, p.y + p.ny * s * p.w * 0.8,
          p.angle + s * (Math.PI / 2 + 0.6 + flap * s), len, len * f[2]);
      }
    });

    var back = tail.angle + Math.PI + wrapAngle(tail.angle - pts[JOINTS - 4].angle) * 1.6;
    var tl = fishLength * 0.27;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.quadraticCurveTo(
      tail.x + Math.cos(back - 0.75) * tl * 0.6, tail.y + Math.sin(back - 0.75) * tl * 0.6,
      tail.x + Math.cos(back - 0.42) * tl, tail.y + Math.sin(back - 0.42) * tl);
    ctx.quadraticCurveTo(
      tail.x + Math.cos(back) * tl * 0.55, tail.y + Math.sin(back) * tl * 0.55,
      tail.x + Math.cos(back + 0.42) * tl, tail.y + Math.sin(back + 0.42) * tl);
    ctx.quadraticCurveTo(
      tail.x + Math.cos(back + 0.75) * tl * 0.6, tail.y + Math.sin(back + 0.75) * tl * 0.6,
      tail.x, tail.y);
    ctx.fill();

    // Body outline: down the left side, round the tail, back up the right, round the nose.
    var outline = [];
    for (i = 0; i < JOINTS; i++) outline.push({ x: pts[i].x + pts[i].nx * pts[i].w, y: pts[i].y + pts[i].ny * pts[i].w });
    outline.push({ x: tail.x - Math.cos(tail.angle) * maxW * 0.3, y: tail.y - Math.sin(tail.angle) * maxW * 0.3 });
    for (i = JOINTS - 1; i >= 0; i--) outline.push({ x: pts[i].x - pts[i].nx * pts[i].w, y: pts[i].y - pts[i].ny * pts[i].w });
    outline.push({ x: head.x + Math.cos(head.angle) * maxW * 1.05, y: head.y + Math.sin(head.angle) * maxW * 1.05 });

    ctx.globalAlpha = KOI.opacity;
    ctx.fillStyle = KOI.body;
    smoothClosedPath(outline);
    ctx.fill();

    // Patches, clipped so they stay inside the body.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = accent;
    PATCHES.forEach(function (patch) {
      var p = pts[patch.joint];
      ctx.beginPath();
      ctx.ellipse(p.x + p.nx * p.w * patch.side, p.y + p.ny * p.w * patch.side,
        maxW * patch.size * 1.15, maxW * patch.size * 0.8, p.angle, 0, TAU);
      ctx.fill();
    });
    ctx.restore();

    // Dorsal fin: a thin darker line along the back.
    ctx.strokeStyle = "rgba(20, 16, 14, 0.28)";
    ctx.lineWidth = Math.max(1.5, maxW * 0.12);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[4].x, pts[4].y);
    for (i = 5; i <= 9; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Eyes.
    ctx.fillStyle = "#151312";
    for (var side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.arc(head.x + Math.cos(head.angle) * maxW * 0.25 + head.nx * side * head.w * 0.78,
        head.y + Math.sin(head.angle) * maxW * 0.25 + head.ny * side * head.w * 0.78,
        maxW * 0.11, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* The water: cursor trail + ripples --------------------------------------- */
  var trail = [];    // recent cursor positions: { x, y, born }
  var ripples = [];  // expanding rings: { x, y, born, life, size, delay }
  var lastRing = null;

  function addRipple(x, y, size, life, rings) {
    for (var i = 0; i < rings; i++) {
      ripples.push({ x: x, y: y, born: now() + i * 0.16, life: life, size: size * (1 - i * 0.18) });
    }
  }

  function now() {
    return performance.now() / 1000;
  }

  function drawWater(time) {
    var i;
    // Cursor trail: each stretch widens and fades as it gets older.
    ctx.lineCap = "round";
    for (i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      if (b.born - a.born > 0.12) continue; // the mouse paused or left; don't join the gap
      var age = (time - b.born) / KOI.trailLife;
      if (age >= 1) continue;
      ctx.strokeStyle = "rgba(" + KOI.water + ", " + (0.22 * (1 - age) * (1 - age)) + ")";
      ctx.lineWidth = 2 + age * 16;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    while (trail.length && time - trail[0].born > KOI.trailLife) trail.shift();

    // Ripples.
    for (i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      var t = (time - r.born) / r.life;
      if (t < 0) continue;
      if (t >= 1) { ripples.splice(i, 1); continue; }
      var eased = 1 - Math.pow(1 - t, 3);
      ctx.strokeStyle = "rgba(" + KOI.water + ", " + (0.5 * (1 - t) * (1 - t)) + ")";
      ctx.lineWidth = 0.6 + 2 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 4 + r.size * eased, 0, TAU);
      ctx.stroke();
    }
  }

  /* Mouse + touch ----------------------------------------------------------- */
  var school = [];
  for (var n = 0; n < KOI.count; n++) school.push(makeFish(n));

  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return; // a moving finger is scrolling, not stirring
    var time = now();
    var x = event.clientX, y = event.clientY;
    var last = trail[trail.length - 1];
    if (last && time - last.born < 0.3) {
      var moved = Math.sqrt((x - last.x) * (x - last.x) + (y - last.y) * (y - last.y));
      if (moved < 3) return;
      // A quick swipe right over the fish spooks it.
      var speed = moved / Math.max(0.001, time - last.born);
      if (speed > 1800) school.forEach(function (fish) { startle(fish, x, y, 0.45); });
    }
    trail.push({ x: x, y: y, born: time });
    if (trail.length > 160) trail.shift();
    // Drop a small ring every so often along the path.
    if (!lastRing || Math.abs(x - lastRing.x) + Math.abs(y - lastRing.y) > 70) {
      addRipple(x, y, 22, 0.9, 1);
      lastRing = { x: x, y: y };
    }
  }, { passive: true });

  window.addEventListener("pointerdown", function (event) {
    var x = event.clientX, y = event.clientY;
    addRipple(x, y, Math.max(110, fishLength * 0.5), KOI.rippleLife, 3);
    school.forEach(function (fish) {
      if (!startle(fish, x, y, 0.7)) {
        fish.target = { x: x, y: y }; // far enough away: come and investigate
        fish.curious = true;
      }
    });
  }, { passive: true });

  // If (x, y) is within `reach` body lengths of the fish, it darts away. Returns true if it did.
  function startle(fish, x, y, reach) {
    var mid = fish.joints[4];
    var dx = mid.x - x, dy = mid.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > fishLength * reach) return false;
    var away = dist > 1 ? Math.atan2(dy, dx) : fish.heading;
    fish.speed = fishLength * 2.6;
    fish.curious = false;
    var m = fishLength * 0.25;
    fish.target = {
      x: Math.max(m, Math.min(W - m, fish.x + Math.cos(away) * fishLength * 2.2)),
      y: Math.max(m, Math.min(H - m, fish.y + Math.sin(away) * fishLength * 2.2))
    };
    return true;
  }

  /* The loop ---------------------------------------------------------------- */
  var lastFrame = now();
  function frame() {
    var time = now();
    var dt = Math.min(0.05, time - lastFrame);
    lastFrame = time;
    ctx.clearRect(0, 0, W, H);
    school.forEach(function (fish) {
      updateFish(fish, dt, time);
      drawFish(fish);
    });
    drawWater(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
