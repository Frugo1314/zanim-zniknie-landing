/* zz-galaxy.js — współdzielony silnik tła: galaktyka Three.js + grain + kursor.
   Używany przez landing ORAZ wszystkie branded strony produktów (jeden plik =
   spójny wygląd, zero duplikacji). Self-contained: własne mini-helpery.
   Wymaga w <head>: three.min.js (r128), opcjonalnie GSAP+ScrollTrigger. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ── GALAKTYKA — globalny fixed canvas, lot przez kosmos sterowany scrollem ── */
  function initGalaxy() {
    var canvas = $('#galaxy-canvas'); if (!canvas) return;
    if (!window.THREE || reduce) {
      canvas.style.background = 'radial-gradient(ellipse at 50% 18%,rgba(0,255,178,.10),transparent 55%),radial-gradient(ellipse at 75% 85%,rgba(255,45,120,.08),transparent 55%)';
      return;
    }
    var MU = THREE.MathUtils;
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .1, 260); cam.position.z = 26;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);

    var N = touch ? 2600 : 5200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var cMint = new THREE.Color(0x00FFB2), cPink = new THREE.Color(0xFF2D78), cWhite = new THREE.Color(0xffffff);
    for (var i = 0; i < N; i++) {
      var a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), .82) * 34;
      pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = (Math.random() - .5) * 52; pos[i * 3 + 2] = Math.sin(a) * rr - Math.random() * 14;
      var u = Math.random(), c = u < .55 ? cWhite.clone() : (u < .8 ? cMint.clone() : cPink.clone());
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: .11, vertexColors: true, transparent: true, opacity: .92, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending });
    var pts = new THREE.Points(geo, mat); scene.add(pts);

    var K = touch ? 16 : 30, np = new Float32Array(K * 3), nc = new Float32Array(K * 3);
    var cGold = new THREE.Color(0xFFD700), neb = [cMint, cPink, cGold];
    for (var j = 0; j < K; j++) {
      np[j * 3] = (Math.random() - .5) * 50; np[j * 3 + 1] = (Math.random() - .5) * 70; np[j * 3 + 2] = -10 - Math.random() * 22;
      var cc = neb[j % 3]; nc[j * 3] = cc.r; nc[j * 3 + 1] = cc.g; nc[j * 3 + 2] = cc.b;
    }
    var ngeo = new THREE.BufferGeometry();
    ngeo.setAttribute('position', new THREE.BufferAttribute(np, 3));
    ngeo.setAttribute('color', new THREE.BufferAttribute(nc, 3));
    var nmat = new THREE.PointsMaterial({ size: 18, vertexColors: true, transparent: true, opacity: .1, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending });
    var nebula = new THREE.Points(ngeo, nmat); scene.add(nebula);

    var tints = [new THREE.Color(0xffdce8), new THREE.Color(0xc4ffec), new THREE.Color(0xfff0c2), new THREE.Color(0xb6ffe9)];
    var tintFor = function (p) { return tints[p < .25 ? 0 : p < .5 ? 1 : p < .78 ? 2 : 3]; };

    var target = 0, sp = 0;
    if (window.gsap && window.ScrollTrigger) {
      ScrollTrigger.create({ trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1, onUpdate: function (self) { target = self.progress; } });
    } else {
      addEventListener('scroll', function () { var h = document.documentElement; target = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1); }, { passive: true });
    }
    var mxn = 0, myn = 0;
    addEventListener('pointermove', function (e) { mxn = e.clientX / innerWidth - .5; myn = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener('resize', function () { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }, { passive: true });

    var run = true; document.addEventListener('visibilitychange', function () { run = !document.hidden; if (run) anim(); });
    var t0 = performance.now();
    function anim() {
      if (!run) return;
      var t = (performance.now() - t0) / 1000;
      sp += (target - sp) * .07;
      var spread = MU.smoothstep(sp, .20, .50) * (1 - MU.smoothstep(sp, .80, .96));
      var stream = MU.smoothstep(sp, .50, .60) * (1 - MU.smoothstep(sp, .74, .84));
      var gather = MU.smoothstep(sp, .86, 1);
      pts.rotation.y = t * .04 + sp * .5 + stream * t * .12;
      pts.rotation.z = spread * .12;
      pts.scale.set(1 + spread * .5, (1 + stream * .12) * (1 - gather * .4), 1 + spread * .2);
      pts.position.x = Math.sin(t * .4) * stream * 4;
      var camY = -sp * 6;
      cam.position.x += (mxn * 5 - cam.position.x) * .04;
      cam.position.y += ((camY - myn * 3) - cam.position.y) * .05;
      cam.lookAt(0, camY - gather * 5, 0);
      nmat.opacity += ((.1 + .2 * stream) - nmat.opacity) * .05;
      nebula.rotation.y = -t * .02;
      mat.color.lerp(tintFor(sp), .04);
      renderer.render(scene, cam);
      requestAnimationFrame(anim);
    }
    anim();
  }

  /* ── KURSOR (celownik marki) — tylko desktop ── */
  function initCursor() {
    if (touch || reduce) return;
    var dot = $('[data-cursor-dot]'), ring = $('[data-cursor-ring]');
    if (!dot || !ring) return;
    var rx = 0, ry = 0, mx = 0, my = 0;
    addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)'; });
    (function loop() { rx += (mx - rx) * .18; ry += (my - ry) * .18; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)'; requestAnimationFrame(loop); })();
    $$('[data-hover],a,button').forEach(function (el) {
      el.addEventListener('pointerenter', function () { ring.classList.add('is-hover'); });
      el.addEventListener('pointerleave', function () { ring.classList.remove('is-hover'); });
    });
  }

  function start() { initGalaxy(); initCursor(); }
  if (document.readyState !== 'loading') start();
  else addEventListener('DOMContentLoaded', start);
})();
