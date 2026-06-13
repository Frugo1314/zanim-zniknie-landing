/* hero3d.js — magiczna mgławica WebGL + parallax 3D dla hero.
   CSP-safe (ładowany jako 'self'). Lekkie: fullscreen fragment shader,
   DPR capowany, pauza w tle, fallback do istniejącego gradientu gdy brak WebGL. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // statyczny gradient zostaje — zero animacji

  function init() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var canvas = hero.querySelector('.hero-webgl');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'hero-webgl';
      canvas.setAttribute('aria-hidden', 'true');
      hero.insertBefore(canvas, hero.firstChild);
    }

    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false })
          || canvas.getContext('experimental-webgl');
    if (!gl) return; // brak WebGL → zostaje gradient z CSS

    var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

    // Mgławica: domain-warped fbm + paleta marki (cyan→magenta) + znikające glints.
    var FRAG = [
      'precision highp float;',
      'uniform vec2 u_res; uniform float u_t; uniform vec2 u_m;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
      '  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));',
      '  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
      'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p*=2.02;a*=.5;}return s;}',
      'void main(){',
      '  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;',
      '  vec2 par=u_m*.12;',                       // parallax z kursora
      '  uv+=par;',
      '  float t=u_t*.045;',
      '  vec2 q=vec2(fbm(uv*1.6+vec2(0.,t)),fbm(uv*1.6+vec2(5.2,-t)));', // domain warp
      '  float n=fbm(uv*2.3+q*1.8+vec2(t*.5,-t*.3));',
      '  float depth=fbm(uv*0.8-q+vec2(-t*.2,t*.15));',
      '  vec3 cyan=vec3(0.0,1.0,0.9), mag=vec3(1.0,0.0,0.43), deep=vec3(0.02,0.02,0.05);',
      '  vec3 col=mix(deep,cyan,smoothstep(.25,.95,n));',
      '  col=mix(col,mag,smoothstep(.35,1.0,depth)*.7);',
      '  col*=0.55+0.7*n;',                        // wolumetryczny blask
      '  float vig=smoothstep(1.25,.2,length(uv));col*=vig;', // winieta = głębia
      // znikające glints (motyw „zanim zniknie")
      '  float g=0.;',
      '  for(int i=0;i<6;i++){',
      '    float fi=float(i);',
      '    vec2 gp=vec2(hash(vec2(fi,1.))*2.-1.,hash(vec2(fi,7.))*1.2-.6);',
      '    gp.x+=.25*sin(t*6.+fi);gp.y+=.18*cos(t*5.+fi*1.7);',
      '    float life=fract(t*0.9+hash(vec2(fi,3.)));',     // 0..1 cyklicznie
      '    float fade=sin(life*3.14159);',                  // pojawia się i znika
      '    float d=length((uv-gp));',
      '    g+=fade*0.012/(d*d+0.0008);',
      '  }',
      '  col+=g*mix(cyan,mag,0.4);',
      '  col=pow(col,vec3(.85));',                  // delikatny gamma lift
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uT   = gl.getUniformLocation(prog, 'u_t');
    var uM   = gl.getUniformLocation(prog, 'u_m');

    var mobile = window.matchMedia('(max-width: 900px)').matches;
    var dprCap = mobile ? 1.0 : 1.5;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      var w = hero.clientWidth, h = hero.clientHeight;
      canvas.width = Math.max(1, (w * dpr) | 0);
      canvas.height = Math.max(1, (h * dpr) | 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Parallax: kursor (desktop) + żyroskop (mobile) → uniform + zmienne CSS warstw
    var mx = 0, my = 0, tx = 0, ty = 0;
    if (!mobile) {
      window.addEventListener('pointermove', function (e) {
        tx = (e.clientX / window.innerWidth) * 2 - 1;
        ty = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    } else if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        tx = Math.max(-1, Math.min(1, (e.gamma || 0) / 35));
        ty = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
      }, { passive: true });
    }

    var start = performance.now(), running = true;
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) { start = performance.now() - elapsed; loop(); }
    });

    var elapsed = 0;
    canvas.classList.add('is-live');
    function loop() {
      if (!running) return;
      elapsed = performance.now() - start;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, elapsed * 0.001);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // warstwy CSS (tylko desktop — mobile ma transform:none)
      if (!mobile) {
        hero.style.setProperty('--px', mx.toFixed(3));
        hero.style.setProperty('--py', my.toFixed(3));
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
