(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };

  /* ================= состояние урока ================= */
  var STEPS = ["bell", "topic", "quiz", "journal", "planes", "end"];
  var STEP_NAMES = {
    bell: "звонок", topic: "число и тема", quiz: "ответ у доски",
    journal: "журнал", planes: "самолётики", end: "звонок с урока"
  };
  var state = {
    step: "bell",
    traced: false,
    qIndex: 0,
    firstTry: 0,
    wrongThisQ: 0,
    journal: {},
    sent: {},
    picking: false,
    flying: false
  };

  function stepIdx(s) { return STEPS.indexOf(s); }
  function reached(s) { return stepIdx(state.step) >= stepIdx(s); }

  function setStep(s) {
    state.step = s;
    var items = document.querySelectorAll("#plan li");
    items.forEach(function (li) {
      var i = stepIdx(li.dataset.step), cur = stepIdx(s);
      li.classList.toggle("done", i < cur || (s === "end" && li.dataset.step === "end" && state.finished));
      li.classList.toggle("active", i === cur && !(s === "end" && state.finished));
    });
    refreshAttention();
    refreshHint();
  }

  function refreshAttention() {
    $("boardGlow").setAttribute("opacity", "0");
    $("boardGlow").classList.remove("pulse");
    $("doorGlow").classList.remove("pulse");
    $("doorGlow").setAttribute("opacity", "0");
    $("journalObj").classList.remove("attn");
    if (state.step === "topic" || state.step === "quiz") { $("boardGlow").classList.add("pulse"); }
    if (state.step === "journal") $("journalObj").classList.add("attn");
    if (state.step === "end" && !state.finished) { $("doorGlow").classList.add("pulse"); }
  }

  function remaining() {
    return STUDENTS.filter(function (s) { return !state.sent[s.name]; }).length;
  }

  function refreshHint() {
    var h = "";
    switch (state.step) {
      case "topic": h = "Начнём урок: нажмите на доску и запишите число и тему"; break;
      case "quiz": h = "Вас вызвали к доске! Нажмите на доску, чтобы ответить"; break;
      case "journal": h = "На учительском столе лежит журнал. Откройте его"; break;
      case "planes":
        h = state.picking
          ? "Кого вызвать? Нажмите на любого ученика (осталось " + remaining() + ")"
          : "Возьмите указку со стола и вызовите любого ученика";
        break;
      case "end": h = state.finished ? "" : "Все самолётики у вас! Осталось дать звонок: нажмите на дверь"; break;
    }
    $("hint").textContent = h;
  }

  /* ================= звук ================= */
  var ac = null, noiseBuf = null, chalkGain = null;
  function audio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }

  function bell() { /* звонок отключён */ }
  function bellOld(seconds) {
    var a = audio(); if (!a) return;
    var t = a.currentTime, dur = seconds || 2.6;
    var master = a.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.13, t + 0.03);
    master.gain.setValueAtTime(0.13, t + dur - 0.25);
    master.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.4);
    var trem = a.createGain(); trem.gain.value = 0.5;
    var lfo = a.createOscillator(); lfo.type = "square"; lfo.frequency.value = 24;
    var lfoAmt = a.createGain(); lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt).connect(trem.gain);
    trem.connect(master).connect(a.destination);
    [1310, 1987, 2650, 3420].forEach(function (f, i) {
      var o = a.createOscillator(); o.type = i === 0 ? "triangle" : "sine"; o.frequency.value = f;
      var g = a.createGain(); g.gain.value = [1, 0.55, 0.35, 0.2][i];
      o.connect(g).connect(trem);
      o.start(t); o.stop(t + dur + 0.5);
    });
    lfo.start(t); lfo.stop(t + dur + 0.5);
  }

  function tone(freq, dur, type, vol, slideTo) {
    var a = audio(); if (!a) return;
    var t = a.currentTime;
    var o = a.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    var g = a.createGain();
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function ding() {}
  function buzz() {}

  function noiseBurst(dur, from, to, vol, type) {
    var a = audio(); if (!a) return;
    var t = a.currentTime;
    var s = a.createBufferSource(); s.buffer = noiseBuf;
    var f = a.createBiquadFilter(); f.type = type || "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    var g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  function whoosh() { noiseBurst(1.2, 350, 2400, 0.16); }
  function paper() { noiseBurst(0.25, 2500, 5000, 0.12, "highpass"); setTimeout(function () { noiseBurst(0.2, 3000, 6000, 0.1, "highpass"); }, 160); }

  function chalkSoundStart() {
    var a = audio(); if (!a || chalkGain) return;
    var s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.9;
    chalkGain = a.createGain(); chalkGain.gain.value = 0;
    s.connect(f).connect(chalkGain).connect(a.destination); s.start();
  }
  function chalkSound(speed) {
    if (!chalkGain) return;
    var v = Math.min(0.09, speed * 0.004);
    chalkGain.gain.setTargetAtTime(v, ac.currentTime, 0.03);
  }

  /* ================= тост ================= */
  var toastTimer = null;
  function toast(text, ms) {
    var t = $("toast");
    t.hidden = false; t.textContent = text;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }

  /* ================= парты и ученики ================= */
  var BLOCKS = {
    window:     { deskX: 440,  chairX: 555,  side: "right" },
    midLeft:    { deskX: 790,  chairX: 740,  side: "left" },
    midRight:   { deskX: 892,  chairX: 1008, side: "right" },
    rightLeft:  { deskX: 1330, chairX: 1280, side: "left" },
    rightRight: { deskX: 1432, chairX: 1548, side: "right" }
  };
  var ROWS_Y = [430, 575, 720];
  var DESK_W = 100, DESK_H = 120, CHAIR = 36;
  var HAIR = ["#3b2a20", "#6b4226", "#1f1a17", "#a8743f", "#4a3626", "#7a5233", "#2c2420", "#c49a5c"];
  var SHIRT = ["#5b7fb8", "#c0584a", "#4f8f6a", "#8a6bb5", "#d39a3a", "#3f6f8f", "#b5577e", "#6d7a3b"];
  var STUDENTS = [];

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildSeats() {
    var desks = $("desks"), seats = $("seats");
    Object.keys(BLOCKS).forEach(function (key) {
      var b = BLOCKS[key], rows = (window.SEATS && SEATS[key]) || [];
      ROWS_Y.forEach(function (y, r) {
        el("rect", { x: b.deskX, y: y, width: DESK_W, height: DESK_H, rx: 4, fill: "url(#woodtop)", stroke: "#8c5a31", "stroke-width": 3, filter: "url(#soft)" }, desks);
        var pair = rows[r] || [null, null];
        [0, 1].forEach(function (k) {
          var cy = y + (k === 0 ? 14 : 70);
          var name = pair[k];
          var g = el("g", { class: "seat" + (name ? " has-student" : "") }, seats);
          var cx = b.chairX + CHAIR / 2, ccy = cy + CHAIR / 2;
          el("circle", { class: "ring", cx: cx, cy: ccy, r: 30, fill: "none", stroke: "#ffe46b", "stroke-width": 5 }, g);
          el("rect", { x: b.chairX, y: cy, width: CHAIR, height: CHAIR, rx: 8, fill: "#86b52f", stroke: "#5f8a1c", "stroke-width": 3 }, g);
          var backX = b.side === "right" ? b.chairX + CHAIR - 6 : b.chairX - 2;
          el("rect", { x: backX, y: cy - 2, width: 8, height: CHAIR + 4, rx: 3, fill: "#6e9a22" }, g);
          if (!name) return;
          var h = hash(name);
          var toDesk = b.side === "right" ? -1 : 1;
          var st = el("g", { class: "student" }, g);
          el("ellipse", { cx: cx + toDesk * 2, cy: ccy, rx: 15, ry: 21, fill: SHIRT[h % SHIRT.length] }, st);
          el("circle", { cx: cx + toDesk * 7, cy: ccy, r: 12, fill: "#f0c9a5" }, st);
          el("path", {
            d: "M" + (cx + toDesk * 7 - toDesk * 12) + " " + (ccy - 12) + " a12 12 0 0 " + (toDesk > 0 ? 0 : 1) + " 0 24 Z",
            fill: HAIR[(h >> 3) % HAIR.length]
          }, st);
          // самолётик на парте
          var px = b.side === "right" ? b.deskX + DESK_W - 26 : b.deskX + 26;
          var plane = el("g", { class: "desk-plane", transform: "translate(" + px + " " + ccy + ") rotate(" + (b.side === "right" ? 200 : -20) + ") scale(.55)" }, g);
          el("path", { d: "M-26 6 L30 -2 L-14 -14 L-6 -2 Z", fill: "#fdfcf7", stroke: "#9fb2c9", "stroke-width": 2 }, plane);
          el("path", { d: "M-6 -2 L30 -2 L-10 12 Z", fill: "#e1e8f1", stroke: "#9fb2c9", "stroke-width": 2 }, plane);
          var check = el("text", { x: px, y: ccy + 7, "text-anchor": "middle", "font-family": "Neucha, cursive", "font-size": 22, fill: "#2f6b2a", style: "display:none" }, g);
          check.textContent = "✓";
          var s = { name: name, g: g, plane: plane, check: check, x: px, y: ccy };
          STUDENTS.push(s);
          g.addEventListener("click", function () { onSeat(s); });
          g.addEventListener("mousemove", function (e) { showTip(e, name + (state.sent[name] ? " · самолётик у вас" : "")); });
          g.addEventListener("mouseleave", hideTip);
        });
      });
    });
  }

  function showTip(e, text) {
    var t = $("tooltip"); t.hidden = false; t.textContent = text;
    t.style.left = e.clientX + "px"; t.style.top = e.clientY + "px";
  }
  function hideTip() { $("tooltip").hidden = true; }

  /* ================= доска: обводка мелом ================= */
  var W = 1200, H = 600;
  var canvas = $("chalk"), ctx = canvas.getContext("2d");
  canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2);
  var LINES = [
    { text: "5 октября", y: 82, size: 56 },
    { text: "Классная работа", y: 156, size: 56 },
    { text: "Тема: «День учителя»", y: 244, size: 74 }
  ];
  var pts = [], grid = {}, covered = 0, cell = 24, tracingReady = false;

  function font(size) { return size + "px Neucha, 'Comic Sans MS', cursive"; }

  function buildMask() {
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var o = off.getContext("2d");
    o.fillStyle = "#fff"; o.textAlign = "center";
    LINES.forEach(function (l) { o.font = font(l.size); o.fillText(l.text, W / 2, l.y); });
    var img = o.getImageData(0, 0, W, H).data;
    pts = []; grid = {}; covered = 0;
    for (var y = 0; y < 270; y += 5) {
      for (var x = 0; x < W; x += 5) {
        if (img[(y * W + x) * 4 + 3] > 120) {
          var p = { x: x, y: y, c: false };
          pts.push(p);
          var k = ((x / cell) | 0) + "," + ((y / cell) | 0);
          (grid[k] || (grid[k] = [])).push(p);
        }
      }
    }
  }

  function drawGuide() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = "center";
    ctx.setLineDash([3, 7]);
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = "rgba(238,240,232,.5)";
    LINES.forEach(function (l) { ctx.font = font(l.size); ctx.strokeText(l.text, W / 2, l.y); });
    ctx.restore();
  }

  function drawFinal() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,241,233,.95)";
    ctx.shadowColor = "rgba(255,255,255,.35)"; ctx.shadowBlur = 3;
    LINES.forEach(function (l) { ctx.font = font(l.size); ctx.fillText(l.text, W / 2, l.y); });
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (var i = 0; i < 9000; i++) {
      ctx.fillStyle = "rgba(0,0,0," + (Math.random() * 0.7) + ")";
      ctx.fillRect(Math.random() * W, Math.random() * 270, Math.random() * 2 + 0.5, Math.random() * 1.5 + 0.5);
    }
    ctx.restore();
  }

  function chalkSegment(x0, y0, x1, y1) {
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(242,242,234,.82)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(255,255,255,.45)";
    for (var i = 0; i < 3; i++) {
      var j = function () { return (Math.random() - 0.5) * 6; };
      ctx.beginPath(); ctx.moveTo(x0 + j(), y0 + j()); ctx.lineTo(x1 + j(), y1 + j()); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,240,232,.5)";
    for (var k = 0; k < 4; k++) ctx.fillRect(x1 + (Math.random() - 0.5) * 18, y1 + (Math.random() - 0.5) * 18, 1.2, 1.2);
    ctx.restore();
    // покрытие
    var len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / 3));
    for (var s = 0; s <= n; s++) {
      var x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n;
      var gx = (x / cell) | 0, gy = (y / cell) | 0;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var arr = grid[(gx + dx) + "," + (gy + dy)]; if (!arr) continue;
        for (var q = 0; q < arr.length; q++) {
          var p = arr[q];
          if (!p.c && (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < 17 * 17) { p.c = true; covered++; }
        }
      }
    }
  }

  var drawing = false, last = null, lastT = 0;
  function toBoard(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (!tracingReady) return;
    drawing = true; last = toBoard(e); lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    chalkSoundStart();
    chalkSegment(last.x, last.y, last.x + 0.1, last.y + 0.1);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drawing || !tracingReady) return;
    var p = toBoard(e), now = performance.now();
    var speed = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, now - lastT) * 16;
    chalkSegment(last.x, last.y, p.x, p.y);
    chalkSound(speed);
    last = p; lastT = now;
    updateTraceProgress();
  });
  function stopDraw() { drawing = false; chalkSound(0); }
  canvas.addEventListener("pointerup", stopDraw);
  canvas.addEventListener("pointercancel", stopDraw);
  canvas.addEventListener("pointerleave", stopDraw);

  function updateTraceProgress() {
    var pct = pts.length ? covered / pts.length : 0;
    var bar = document.querySelector("#boardUi .progress > span");
    var lbl = $("traceLabel");
    var shown = Math.min(100, Math.round(pct / 0.7 * 100));
    if (bar) bar.style.width = shown + "%";
    if (lbl) lbl.textContent = "Обведено " + shown + "%";
    if (pct >= 0.7) finishTrace();
  }

  function startTracing() {
    $("board").classList.add("tracing");
    $("trayNote").textContent = "Мел в руке. Обводите буквы мышкой";
    var ui = $("boardUi");
    ui.innerHTML =
      '<div class="center-msg">' +
      '<p>Обведите мелом число и тему урока, как в прописях</p>' +
      '<div class="progress" style="width:min(420px,70%)"><span></span></div>' +
      '<p id="traceLabel">Обведено 0%</p></div>';
    var go = function () { buildMask(); drawGuide(); tracingReady = true; };
    if (document.fonts && document.fonts.load) document.fonts.load(font(56)).then(go, go); else go();
  }

  function finishTrace() {
    if (state.traced) return;
    state.traced = true; tracingReady = false; drawing = false; chalkSound(0);
    $("board").classList.remove("tracing");
    drawFinal(); ding();
    $("boardMini").setAttribute("opacity", "1");
    $("trayNote").textContent = "";
    setStep("quiz");
    quizIntroUi();
  }

  function quizIntroUi() {
    var ui = $("boardUi");
    ui.innerHTML =
      '<div class="center-msg">' +
      '<h3>Записано! Сегодня всё наоборот:</h3>' +
      '<p>к доске вызывается… Елена Феликсовна!</p>' +
      '<p style="font-size:.95em">20 вопросов по HTML, CSS, JavaScript и немного о нашей группе</p>' +
      '<button class="btn" id="toQuiz" type="button" style="margin-top:.4em">Выйти к доске</button></div>';
    $("toQuiz").addEventListener("click", function () { state.quizStarted = true; renderQuestion(); });
  }

  /* ================= квест ================= */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function renderQuestion() {
    var Q = QUESTIONS[state.qIndex];
    state.wrongThisQ = 0;
    var ui = $("boardUi");
    var stars = "";
    for (var i = 0; i < state.firstTry; i++) stars += "★";
    ui.innerHTML =
      '<div class="q-head"><span>Вопрос ' + (state.qIndex + 1) + " из " + QUESTIONS.length + " · " + esc(Q.tag) + "</span>" +
      '<span class="q-stars" aria-label="Звёзд: ' + state.firstTry + '">' + stars + "</span></div>" +
      '<div class="q-text">' + esc(Q.q) + "</div>" +
      '<div class="q-options">' + Q.options.map(function (o, i) {
        return '<button class="q-opt" type="button" data-i="' + i + '">' + esc(o) + "</button>";
      }).join("") + "</div>" +
      '<div class="q-reply" id="qReply"></div>';
    ui.querySelectorAll(".q-opt").forEach(function (b) {
      b.addEventListener("click", function () { answer(+b.dataset.i, b); });
    });
  }

  var answering = false;
  function answer(i, btn) {
    if (answering || btn.classList.contains("wrong")) return;
    var Q = QUESTIONS[state.qIndex];
    if (i === Q.answer) {
      answering = true;
      btn.classList.add("right"); ding();
      if (state.wrongThisQ === 0) state.firstTry++;
      $("qReply").textContent = ["Верно!", "Пять!", "Отлично!", "Так держать!", "В точку!"][state.qIndex % 5];
      setTimeout(function () {
        answering = false;
        state.qIndex++;
        if (state.qIndex >= QUESTIONS.length) diploma(); else renderQuestion();
      }, 950);
    } else {
      state.wrongThisQ++;
      btn.classList.add("wrong"); buzz();
      $("qReply").textContent = WRONG_REPLIES[(state.qIndex + state.wrongThisQ) % WRONG_REPLIES.length];
    }
  }

  function diploma() {
    bell(1.2);
    var ui = $("boardUi");
    ui.innerHTML =
      '<div class="center-msg"><div class="diploma">' +
      "<h3>Диплом веб-разработчика</h3>" +
      "<p>выдан Елене Феликсовне за блестящий ответ у доски</p>" +
      "<p>С первой попытки: " + state.firstTry + " из " + QUESTIONS.length + '</p>' +
      '<p>Оценка: <span class="five">5</span></p></div>' +
      '<button class="btn" id="afterQuiz" type="button" style="margin-top:.5em">Вернуться в класс</button></div>';
    state.quizDone = true;
    $("pointerObj").style.display = "";
    setStep("journal");
    $("afterQuiz").addEventListener("click", function () {
      closeBoard();
      toast("На столе появилась указка. Но сначала журнал!", 3600);
    });
  }

  function boardStatic() {
    var ui = $("boardUi");
    ui.innerHTML = '<div class="center-msg"><h3>Тема записана, ответ у доски на пятёрку</h3><p>Дальше урок продолжается в классе</p></div>';
  }

  function openBoard() {
    $("boardView").hidden = false;
    if (!state.traced) {
      startTracing();
    } else if (!state.quizDone) {
      drawFinal();
      if (state.quizStarted) renderQuestion(); else quizIntroUi();
    } else {
      drawFinal(); boardStatic();
    }
  }
  function closeBoard() { $("boardView").hidden = true; stopDraw(); }

  /* ================= журнал ================= */
  var CRITERIA = [
    "Терпение",
    "Чувство юмора",
    "Объясняет понятно",
    "Классный руководитель",
    "Спасает перед сессией",
    "Не задаёт на выходные"
  ];
  var journalClicks = [];

  function buildJournal() {
    var body = $("jBody");
    CRITERIA.forEach(function (c, i) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + c + '</td><td><button class="j-cell" type="button" aria-label="Поставить оценку: ' + c + '"></button></td>';
      body.appendChild(tr);
      var cellBtn = tr.querySelector(".j-cell");
      cellBtn.addEventListener("click", function () {
        if (state.journal[i]) { toast("Выше пятёрки не бывает!"); return; }
        state.journal[i] = true;
        cellBtn.textContent = "5"; cellBtn.classList.add("filled"); paper();
        if (c === "Не задаёт на выходные") toast("Ну… пусть будет пять. Авансом!");
        updateJournal();
      });
    });
    updateJournal();
  }
  function updateJournal() {
    var n = Object.keys(state.journal).length;
    $("jProgress").textContent = n === CRITERIA.length
      ? "Все пятёрки на месте. Средний балл: 5,0"
      : "Поставлено " + n + " из " + CRITERIA.length;
  }

  function onJournal() {
    if (!state.quizDone) {
      var now = Date.now();
      journalClicks = journalClicks.filter(function (t) { return now - t < 2500; });
      journalClicks.push(now);
      if (journalClicks.length >= 5) { journalClicks = []; toast("Родителей в школу! …Шутка. Журнал откроется после ответа у доски", 3600); return; }
      toast("Журнал откроется после ответа у доски");
      return;
    }
    $("journalView").hidden = false; paper();
  }
  $("journalClose").addEventListener("click", function () {
    $("journalView").hidden = true;
    if (state.step === "journal" && Object.keys(state.journal).length === CRITERIA.length) {
      setStep("planes");
      toast("Журнал заполнен. Теперь берите указку!", 3200);
    } else if (state.step === "journal") {
      toast("В журнале ещё есть пустые клетки");
    }
  });

  /* ================= указка и самолётики ================= */
  function onPointer() {
    if (stepIdx(state.step) < stepIdx("planes")) { toast("Указка пригодится чуть позже. Сначала журнал!"); return; }
    if (remaining() === 0) { toast("Все уже отправили самолётики!"); return; }
    setPicking(!state.picking);
  }
  function setPicking(on) {
    state.picking = on;
    $("room").classList.toggle("picking", on);
    STUDENTS.forEach(function (s) { s.g.classList.toggle("ready", on && !state.sent[s.name]); });
    refreshHint();
  }

  function onSeat(s) {
    if (!state.picking) {
      if (state.step === "planes") toast("Сначала возьмите указку со стола");
      return;
    }
    if (state.flying) return;
    if (state.sent[s.name]) { toast("Самолётик от " + s.name + " уже прилетел"); return; }
    launch(s);
  }

  function launch(s) {
    state.flying = true;
    s.plane.style.display = "none";
    s.g.classList.remove("ready");
    var flight = $("flight"), planeG = $("flightPlane"), shadow = $("flightShadow");
    flight.style.display = "";
    var x0 = s.x, y0 = s.y;
    var x1 = 900 + Math.random() * 80, y1 = 300 + Math.random() * 60;
    var cx = (x0 + x1) / 2 + (Math.random() - 0.5) * 120, cy = Math.min(y0, y1) - 230;
    var t0 = performance.now(), dur = 1500;
    whoosh();
    function frame(now) {
      var t = Math.min(1, (now - t0) / dur);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1;
      var y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1;
      var dx = 2 * (1 - e) * (cx - x0) + 2 * e * (x1 - cx);
      var dy = 2 * (1 - e) * (cy - y0) + 2 * e * (y1 - cy);
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      var lift = Math.sin(Math.PI * e);
      var sc = 1 + lift * 1.3;
      planeG.setAttribute("transform", "translate(" + x + " " + (y - lift * 30) + ") rotate(" + ang + ") scale(" + sc + ")");
      var gx = x0 + (x1 - x0) * e, gy = y0 + (y1 - y0) * e;
      shadow.setAttribute("cx", gx); shadow.setAttribute("cy", gy + 10);
      shadow.setAttribute("opacity", (0.25 - lift * 0.15).toFixed(2));
      if (t < 1) requestAnimationFrame(frame);
      else land(s, x1, y1, ang);
    }
    requestAnimationFrame(frame);
  }

  function land(s, x, y, ang) {
    $("flight").style.display = "none";
    var g = el("g", { transform: "translate(" + x + " " + y + ") rotate(" + (ang * 0.3) + ") scale(.7)" }, $("landed"));
    el("path", { d: "M-26 6 L30 -2 L-14 -14 L-6 -2 Z", fill: "#fdfcf7", stroke: "#9fb2c9", "stroke-width": 2 }, g);
    el("path", { d: "M-6 -2 L30 -2 L-10 12 Z", fill: "#e1e8f1", stroke: "#9fb2c9", "stroke-width": 2 }, g);
    state.sent[s.name] = true;
    s.check.style.display = "";
    setTimeout(function () { openLetter(s); }, 250);
  }

  function openLetter(s) {
    var wish = (window.WISHES && WISHES[s.name]) || "";
    $("letterFrom").textContent = "От кого: " + s.name;
    var t = $("letterText");
    t.textContent = wish || "Этот самолётик ещё в пути: пожелание скоро появится здесь.";
    t.classList.toggle("empty", !wish);
    $("letterClose").textContent = remaining() ? "Сложить и вызвать следующего" : "Сложить";
    var lv = $("letterView"); lv.hidden = false;
    var L = $("letter"); L.style.animation = "none"; void L.offsetWidth; L.style.animation = "";
    paper();
  }
  $("letterClose").addEventListener("click", function () {
    $("letterView").hidden = true;
    state.flying = false;
    if (remaining() === 0) {
      setPicking(false);
      setStep("end");
      toast("Все самолётики у вас! Можно давать звонок", 3600);
    } else {
      setPicking(true);
    }
  });

  /* ================= пасхалки ================= */
  var windowLines = [
    "За окном октябрь. Сосредоточимся на уроке!",
    "Мимо пролетел голубь. Он тоже поздравляет!",
    "Со двора кричат: «С Днём учителя!»",
    "В окно смотреть можно. Но недолго"
  ], windowI = 0;

  function onHot(kind) {
    switch (kind) {
      case "board": openBoard(); break;
      case "journal": onJournal(); break;
      case "pointer": onPointer(); break;
      case "door": onDoor(); break;
      case "window": toast(windowLines[windowI++ % windowLines.length]); break;
      case "balcony": toast("На балкон во время урока нельзя! Даже учителю"); break;
      case "cabinet": {
        var p = $("cabinetPapers");
        p.setAttribute("opacity", "1");
        paper();
        toast("Из шкафа выпала пачка двойных листочков. Сегодня они не понадобятся!", 3600);
        setTimeout(function () { p.setAttribute("opacity", "0"); }, 3600);
        break;
      }
      case "trash":
        toast("В мусорке нашлась шпаргалка: if (урок === 'скучный') спать(); Это не наша!", 4200);
        break;
      case "clock": {
        var h = $("clockHands");
        h.style.transition = "transform 1.6s cubic-bezier(.3,0,.2,1)";
        h.style.transformOrigin = "1100px 32px";
        clockSpin += 1440;
        h.style.transform = "rotate(" + clockSpin + "deg)";
        toast("Время пролетело, а до перемены всё ещё далеко");
        break;
      }
    }
  }
  var clockSpin = 0;

  function setClock() {
    var d = new Date(), m = d.getMinutes(), hr = d.getHours() % 12 + m / 60;
    var cx = 1100, cy = 32;
    var ha = (hr / 12) * 2 * Math.PI - Math.PI / 2, ma = (m / 60) * 2 * Math.PI - Math.PI / 2;
    $("hourHand").setAttribute("x2", cx + Math.cos(ha) * 12); $("hourHand").setAttribute("y2", cy + Math.sin(ha) * 12);
    $("minHand").setAttribute("x2", cx + Math.cos(ma) * 19); $("minHand").setAttribute("y2", cy + Math.sin(ma) * 19);
  }

  /* ================= финал ================= */
  function onDoor() {
    if (state.step !== "end") {
      toast("Рано! Урок ещё не закончен. Сейчас по плану: " + STEP_NAMES[state.step], 3200);
      return;
    }
    state.finished = true;
    setStep("end");
    bell(3);
    $("finalView").hidden = false;
    confetti();
  }

  var confettiRun = false;
  function confetti() {
    var c = $("confetti"), x = c.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    var COLORS = ["#ff8fa3", "#ffd166", "#f4a261", "#c77dff", "#ff6b6b", "#ffffff"];
    var parts = [];
    for (var i = 0; i < 140; i++) parts.push(newPart(true));
    function newPart(initial) {
      var chalk = Math.random() < 0.3;
      return {
        x: Math.random() * innerWidth, y: initial ? Math.random() * -innerHeight : -30,
        vy: 1 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.8,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.08,
        s: 7 + Math.random() * 9, chalk: chalk, col: COLORS[(Math.random() * COLORS.length) | 0]
      };
    }
    if (confettiRun) return; confettiRun = true;
    (function loop() {
      if ($("finalView").hidden) { confettiRun = false; return; }
      x.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p, i) {
        p.y += p.vy; p.x += p.vx + Math.sin(p.y / 40) * 0.4; p.r += p.vr;
        if (p.y > innerHeight + 30) parts[i] = newPart(false);
        x.save(); x.translate(p.x, p.y); x.rotate(p.r);
        if (p.chalk) { x.fillStyle = "#f4f1e8"; x.fillRect(-p.s, -2.5, p.s * 2, 5); }
        else {
          x.fillStyle = p.col;
          for (var k = 0; k < 5; k++) { x.rotate(1.2566); x.beginPath(); x.ellipse(0, -p.s * 0.55, p.s * 0.32, p.s * 0.55, 0, 0, 6.28); x.fill(); }
          x.fillStyle = "#ffd84d"; x.beginPath(); x.arc(0, 0, p.s * 0.22, 0, 6.28); x.fill();
        }
        x.restore();
      });
      requestAnimationFrame(loop);
    })();
  }
  $("restartBtn").addEventListener("click", function () { $("finalView").hidden = true; });

  /* ================= запуск ================= */
  document.querySelectorAll(".hot").forEach(function (n) {
    n.addEventListener("click", function () { onHot(n.dataset.hot); });
    n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHot(n.dataset.hot); } });
  });
  $("boardClose").addEventListener("click", closeBoard);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("boardView").hidden) closeBoard();
    else if (!$("journalView").hidden) $("journalClose").click();
  });

  $("startBtn").addEventListener("click", function () {
    audio(); bell(2.8);
    var intro = $("intro");
    intro.classList.add("lights-on");
    setTimeout(function () { intro.hidden = true; }, 900);
    setStep("topic");
  });

  buildSeats();
  buildJournal();
  setClock(); setInterval(setClock, 30000);
  setStep("bell");
})();
