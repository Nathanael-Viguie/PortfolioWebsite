/* NAV sticky */
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 60), {passive:true});

/* REVEAL */
const revealEls = document.querySelectorAll('.reveal');
new IntersectionObserver((entries) => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:0.08, rootMargin:'0px 0px -30px 0px'}).observe
? (() => { const io = new IntersectionObserver((entries) => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:0.08, rootMargin:'0px 0px -30px 0px'}); revealEls.forEach(el => io.observe(el)); })() : null;

/* STREAMLINES CANVAS */
(function() {
  const canvas = document.getElementById('streamCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, lines = [], f1Points = [], scrollProgress = 0, animFrame;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildF1();
    buildLines();
  }

  /* F1 silhouette — normalized path points, scaled to canvas */
  function buildF1() {
    const s = W * 0.52;
    const ox = W * 0.52, oy = H * 0.5;
    /* Simplified F1 side-view outline as series of hull points */
    /* We store as array of {x,y} in canvas coords */
    const raw = [
      /* nose tip */ [0.02, 0.0],
      [0.10, -0.02],[0.18,-0.04],[0.26,-0.04],[0.32,-0.02],
      /* cockpit rise */ [0.38, -0.02],[0.43,-0.10],[0.48,-0.13],[0.52,-0.13],[0.56,-0.10],
      /* engine cover */ [0.62,-0.07],[0.68,-0.05],[0.72,-0.04],
      /* rear wing */ [0.76,-0.14],[0.80,-0.14],[0.82,-0.07],
      /* diffuser/tail */ [0.85,-0.04],[0.90,-0.02],[0.95,0.0],
      /* floor line back */[0.95,0.04],[0.85,0.04],
      /* rear wheel hump */ [0.80,0.04],[0.78,0.07],[0.74,0.09],[0.70,0.07],[0.66,0.04],
      /* sidepod floor */ [0.60,0.04],[0.52,0.04],
      /* front wheel hump */ [0.44,0.04],[0.40,0.08],[0.35,0.09],[0.30,0.07],[0.26,0.04],
      /* undertray to nose */ [0.18,0.03],[0.10,0.02],[0.02,0.0]
    ];
    f1Points = raw.map(([nx,ny]) => ({ x: ox + (nx - 0.48)*s, y: oy + ny*s }));
  }

  /* Streamline particles */
  function buildLines() {
    lines = [];
    const count = Math.floor(W / 8);
    for (let i = 0; i < count; i++) {
      lines.push(makeLine(i, count));
    }
  }

  function makeLine(i, total) {
    const yFrac = (i / total);
    const startX = -W * 0.05 - Math.random() * 80;
    const baseY = H * 0.15 + yFrac * H * 0.7 + (Math.random() - 0.5) * (H * 0.1 / total);
    const speed = 0.6 + Math.random() * 0.9;
    return {
      x: startX, y: baseY, baseY,
      speed, length: 60 + Math.random() * 120,
      alpha: 0,
      offset: Math.random() * W * 1.5,
      deflected: false,
      deflectY: 0,
    };
  }

  function getDeflection(x, y) {
    /* Check proximity to F1 outline — push streamlines around it */
    if (f1Points.length < 3) return 0;
    /* Find closest segment */
    let minDist = Infinity, deflect = 0;
    for (let i = 0; i < f1Points.length - 1; i++) {
      const a = f1Points[i], b = f1Points[i+1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x-a.x)*dx + (y-a.y)*dy)/(dx*dx+dy*dy)));
      const cx = a.x + t*dx, cy = a.y + t*dy;
      const dist = Math.hypot(x-cx, y-cy);
      if (dist < minDist) { minDist = dist; deflect = y - cy; }
    }
    const influence = 90;
    if (minDist < influence) {
      return (deflect / Math.abs(deflect || 1)) * (influence - minDist) * 0.55;
    }
    return 0;
  }

  function drawF1() {
    if (f1Points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(f1Points[0].x, f1Points[0].y);
    for (let i = 1; i < f1Points.length; i++) {
      ctx.lineTo(f1Points[i].x, f1Points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,8,8,0.0)'; /* transparent fill — just the outline */
    ctx.strokeStyle = 'rgba(200,169,110,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    /* Fade in based on scroll */
    const heroH = document.querySelector('.hero')?.offsetHeight || H;
    scrollProgress = Math.min(1, scrollY / (heroH * 0.6));

    drawF1();

    const now = performance.now() * 0.001;
    lines.forEach((l, idx) => {
      l.x += l.speed;
      if (l.x > W + l.length + 80) {
        /* reset */
        l.x = -l.length - Math.random() * 60;
        l.y = l.baseY + (Math.random() - 0.5) * 6;
      }

      const def = getDeflection(l.x, l.y);
      const targetY = l.baseY + def;
      l.y += (targetY - l.y) * 0.08;

      /* alpha: dim lines far from F1 region, brighten as scroll increases */
      const distToCenter = Math.abs(l.y - H * 0.5) / (H * 0.35);
      l.alpha = Math.max(0, (1 - distToCenter * 0.7)) * scrollProgress * (0.25 + Math.random() * 0.05);

      if (l.alpha < 0.005) return;
      ctx.beginPath();
      ctx.moveTo(l.x - l.length, l.y);
      ctx.lineTo(l.x, l.y);
      const grad = ctx.createLinearGradient(l.x - l.length, 0, l.x, 0);
      grad.addColorStop(0, `rgba(200,169,110,0)`);
      grad.addColorStop(0.5, `rgba(200,169,110,${l.alpha})`);
      grad.addColorStop(1, `rgba(200,169,110,0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    animFrame = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => { resize(); }, {passive:true});
  resize();
  canvas.classList.add('loaded');
  tick();
})();
