// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the deep colour. The river is painted in layers —
// water and light, bed and reeds, things, the koi, then the HUD and panels —
// so a screenshot reads at a glance even when it is shrunk.

import { FIELD, FONT, HEARTS, KOI, NET, PALETTE, REACHES } from './config.js';
import {
  KIND_BUBBLE, KIND_EEL, KIND_LOTUS, KIND_NET, KIND_PEARL,
  KIND_ROCK, KIND_SCALE, KIND_WHIRL,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_REACH = 'reach';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const PANEL = { width: 640, top: 150, line: 34, bottom: 72 };

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function heart(x, y, size, filled) {
    context.save();
    context.translate(x, y);
    context.scale(size / 20, size / 20);
    context.beginPath();
    context.moveTo(0, 6);
    context.bezierCurveTo(-11, -4, -6, -12, 0, -5);
    context.bezierCurveTo(6, -12, 11, -4, 0, 6);
    context.closePath();
    context.fillStyle = filled ? '#ff5d73' : '#ffffff33';
    context.fill();
    context.restore();
  }

  function drawWater(state) {
    const g = context.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.surface);
    g.addColorStop(0.35, PALETTE.water);
    g.addColorStop(1, PALETTE.deep);
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sunlight shafts, swaying slowly with the river's clock.
    context.save();
    context.globalAlpha = 0.06;
    context.fillStyle = '#eafff5';
    for (let i = 0; i < 5; i += 1) {
      const x = 180 + i * 240 + Math.sin(state.elapsed * 0.24 + i * 1.7) * 26;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 90, 0);
      context.lineTo(x + 190, FIELD.height);
      context.lineTo(x + 40, FIELD.height);
      context.closePath();
      context.fill();
    }
    context.restore();
    // Riverbed: sand, stones and a few shells, placed by a fixed hash.
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, FIELD.height - 52, FIELD.width, 52);
    context.fillStyle = PALETTE.sandDark;
    for (let i = 0; i < 26; i += 1) {
      const x = hash(i) * FIELD.width;
      const y = FIELD.height - 46 + hash(i + 40) * 38;
      context.beginPath();
      context.ellipse(x, y, 14 + hash(i + 9) * 22, 6 + hash(i + 3) * 5, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Reeds along both banks, swaying.
    for (const side of [0, 1]) {
      for (let i = 0; i < 9; i += 1) {
        const baseX = side === 0 ? 18 + hash(i + 70) * 46 : FIELD.width - 18 - hash(i + 70) * 46;
        const baseY = FIELD.height - 52;
        const sway = Math.sin(state.elapsed * 1.1 + i * 0.9 + side * 2) * 12;
        const height = 90 + hash(i + 11) * 90;
        context.strokeStyle = i % 2 ? PALETTE.reed : PALETTE.reedDark;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(baseX, baseY);
        context.quadraticCurveTo(baseX + sway * 0.4, baseY - height * 0.6, baseX + sway, baseY - height);
        context.stroke();
      }
    }
  }

  function drawPearl(e) {
    const pulse = 1 + Math.sin(e.phase) * 0.08;
    const r = e.radius * pulse;
    const glow = context.createRadialGradient(e.x, e.y, 1, e.x, e.y, r * 2.4);
    glow.addColorStop(0, '#ffffffaa');
    glow.addColorStop(1, '#ffffff00');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(e.x, e.y, r * 2.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.pearl;
    context.beginPath();
    context.arc(e.x, e.y, r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(e.x - r * 0.3, e.y - r * 0.35, r * 0.32, 0, Math.PI * 2);
    context.fill();
  }

  function drawEntity(e, state) {
    if (e.kind === KIND_PEARL) { drawPearl(e); return; }
    if (e.kind === KIND_SCALE) {
      context.save();
      context.translate(e.x, e.y);
      context.rotate(Math.sin(e.phase) * 0.3);
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const a2 = a + Math.PI / 5;
        context.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
        context.lineTo(Math.cos(a2) * e.radius * 0.45, Math.sin(a2) * e.radius * 0.45);
      }
      context.closePath();
      context.fill();
      context.restore();
      return;
    }
    if (e.kind === KIND_LOTUS) {
      context.fillStyle = PALETTE.lotus;
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        context.beginPath();
        context.ellipse(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, 8, 5, a, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#ffd166';
      context.beginPath();
      context.arc(e.x, e.y, 4, 0, Math.PI * 2);
      context.fill();
      return;
    }
    if (e.kind === KIND_BUBBLE) {
      context.strokeStyle = '#bff0ffcc';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = '#ffffff88';
      context.beginPath();
      context.arc(e.x - 3, e.y - 3, 2.5, 0, Math.PI * 2);
      context.fill();
      return;
    }
    if (e.kind === KIND_ROCK) {
      context.fillStyle = PALETTE.rock;
      context.beginPath();
      const n = 7;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        const r = e.radius * (0.8 + hash(i + e.seed * 10) * 0.4);
        const px = e.x + Math.cos(a) * r;
        const py = e.y + Math.sin(a) * r * 0.85;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.fillStyle = '#ffffff22';
      context.beginPath();
      context.ellipse(e.x - e.radius * 0.25, e.y - e.radius * 0.3, e.radius * 0.4, e.radius * 0.2, -0.4, 0, Math.PI * 2);
      context.fill();
      return;
    }
    if (e.kind === KIND_NET) {
      context.save();
      context.translate(e.x, e.y);
      context.strokeStyle = PALETTE.net;
      context.lineWidth = 4;
      context.strokeRect(-NET.width / 2, -NET.height / 2, NET.width, NET.height);
      context.lineWidth = 2;
      context.beginPath();
      for (let i = -2; i <= 2; i += 1) {
        context.moveTo(-NET.width / 2, (i * NET.height) / 4);
        context.lineTo(NET.width / 2, (i * NET.height) / 4);
        context.moveTo((i * NET.width) / 4, -NET.height / 2);
        context.lineTo((i * NET.width) / 4, NET.height / 2);
      }
      context.stroke();
      context.restore();
      return;
    }
    if (e.kind === KIND_EEL) {
      context.strokeStyle = PALETTE.eel;
      context.lineCap = 'round';
      context.lineWidth = e.radius * 1.5;
      context.beginPath();
      const dir = e.vx >= 0 ? 1 : -1;
      for (let i = 0; i <= 8; i += 1) {
        const px = e.x - dir * i * 12;
        const py = e.y + Math.sin(state.elapsed * 6 + e.phase - i * 0.7) * 10;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.stroke();
      context.fillStyle = '#cfe8d8';
      context.beginPath();
      context.arc(e.x + dir * 6, e.y - 3, 2.5, 0, Math.PI * 2);
      context.fill();
      return;
    }
    // Whirlpool: turning arcs over dark water.
    context.save();
    context.strokeStyle = '#dff7ff88';
    context.lineWidth = 3;
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      const r = e.radius * (0.35 + ring * 0.3);
      const start = e.phase * (1 + ring * 0.4);
      context.arc(e.x, e.y, r, start, start + Math.PI * 1.4);
      context.stroke();
    }
    context.restore();
  }

  function drawKoi(state) {
    const k = state.koi;
    if (k.invulnerable > 0 && Math.floor(k.invulnerable * 10) % 2 === 0) return;
    const flap = Math.sin(k.tail) * 0.45;
    context.save();
    context.translate(k.x, k.y);
    context.rotate(k.angle);
    // Tail, flapping with the swim.
    context.fillStyle = PALETTE.koiOrange;
    context.beginPath();
    context.moveTo(-KOI.length / 2 + 6, 0);
    context.lineTo(-KOI.length / 2 - 22, -12 - flap * 14);
    context.lineTo(-KOI.length / 2 - 14, 0);
    context.lineTo(-KOI.length / 2 - 22, 12 + flap * 14);
    context.closePath();
    context.fill();
    // Body: cream belly, orange back, one dark spot.
    const body = context.createLinearGradient(0, -12, 0, 12);
    body.addColorStop(0, PALETTE.koiOrange);
    body.addColorStop(0.55, '#f9b26b');
    body.addColorStop(1, PALETTE.koiCream);
    context.fillStyle = body;
    context.beginPath();
    context.ellipse(0, 0, KOI.length / 2, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.koiSpot;
    context.beginPath();
    context.ellipse(2, -5, 8, 4.5, 0.3, 0, Math.PI * 2);
    context.fill();
    // Dorsal fin and eye.
    context.fillStyle = '#e06e1f';
    context.beginPath();
    context.ellipse(-4, -12, 10, 4, -0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1c1c';
    context.beginPath();
    context.arc(KOI.length / 2 - 10, -4, 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(KOI.length / 2 - 9, -5, 1.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Dash shimmer.
    if (k.dashTime > 0) {
      context.strokeStyle = '#bff0ffaa';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(k.x, k.y, 34, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawStrikes(state) {
    for (const s of state.strikes) {
      if (!s.active) continue;
      if (s.phase === 'warn') {
        const r = 26 + (0.7 - s.timer) * 30;
        context.strokeStyle = '#ffffff99';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(s.x, s.y, r, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = '#00000033';
        context.beginPath();
        context.ellipse(s.x, s.y, 34, 12, 0, 0, Math.PI * 2);
        context.fill();
        text('!', s.x, s.y - 34, 30, PALETTE.danger, 'center', 'bold');
      } else {
        context.fillStyle = PALETTE.heron;
        context.beginPath();
        context.moveTo(s.x - 14, -10);
        context.lineTo(s.x + 14, -10);
        context.lineTo(s.x + 5, s.y + 6);
        context.lineTo(s.x - 5, s.y + 6);
        context.closePath();
        context.fill();
        context.fillStyle = '#f4d35e';
        context.beginPath();
        context.moveTo(s.x - 5, s.y + 6);
        context.lineTo(s.x + 5, s.y + 6);
        context.lineTo(s.x, s.y + 34);
        context.closePath();
        context.fill();
      }
    }
  }

  function drawHud(state) {
    const reach = REACHES[state.reachIndex];
    context.textBaseline = 'top';
    // Hearts, top left.
    for (let i = 0; i < HEARTS; i += 1) heart(36 + i * 32, 34, 22, i < state.hearts);
    text(`Score ${state.score}`, 24, 66, 30, PALETTE.text, 'left', 'bold');
    text(`Pearls ${state.pearls}`, 24, 100, 20, PALETTE.muted, 'left');
    if (state.combo >= 2) {
      context.fillStyle = '#ffd16622';
      context.fillRect(20, 128, 150, 34);
      text(`x${state.combo} COMBO`, 30, 152, 22, PALETTE.gold, 'left', 'bold');
    }
    // Reach progress, top centre.
    const barW = 380;
    const barX = (FIELD.width - barW) / 2;
    text(reach.name, FIELD.width / 2, 36, 22, PALETTE.text, 'center', 'bold');
    context.fillStyle = '#ffffff26';
    context.fillRect(barX, 52, barW, 12);
    context.fillStyle = PALETTE.gold;
    context.fillRect(barX, 52, barW * Math.min(1, state.progress / reach.distance), 12);
    const markerX = barX + barW * Math.min(1, state.progress / reach.distance);
    context.fillStyle = PALETTE.koiOrange;
    context.beginPath();
    context.arc(markerX, 58, 8, 0, Math.PI * 2);
    context.fill();
    text(`Reach ${state.reachIndex + 1} of ${REACHES.length}`, FIELD.width / 2, 84, 18, PALETTE.muted, 'center');
    // Dash gauge, top right.
    const ready = state.koi.dashCooldown <= 0;
    const frac = ready ? 1 : 1 - state.koi.dashCooldown / 1.1;
    context.strokeStyle = '#ffffff33';
    context.lineWidth = 6;
    context.beginPath();
    context.arc(FIELD.width - 52, 44, 20, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = ready ? PALETTE.gold : '#9fe8ff';
    context.beginPath();
    context.arc(FIELD.width - 52, 44, 20, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    context.stroke();
    text(ready ? 'DASH READY' : 'DASH…', FIELD.width - 84, 40, 16, ready ? PALETTE.gold : PALETTE.muted, 'right', 'bold');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || '#ffd16666';
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 82, 46, PALETTE.text, 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center', 'bold');
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.deep;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 91) * state.shake * 22 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 83) * state.shake * 22 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawWater(state);
    for (const e of state.entities) if (e.active) drawEntity(e, state);
    drawStrikes(state);
    drawKoi(state);
    // Particles and floating scores.
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    for (const f of state.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.min(1, f.life / 0.4);
      text(f.text, f.x, f.y, 20, '#ffffff', 'center', 'bold');
    }
    context.globalAlpha = 1;

    if (screen === SCREEN_TITLE) {
      drawPanel('UPSTREAM', [
        'A koi’s journey home, through three reaches of river.',
        'Swim up with the mouse or WASD. Space or click to dash.',
        'Gather pearls to build a combo. Dodge rocks, nets, eels —',
        'and the heron. Reach the spawning pool to win.',
        best > 0 ? `Best score ${best}` : 'No journey yet — yours will be the first.',
      ], 'Click or press Enter to begin', '#ffd16666');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The river waits for you.'], 'Press P to keep swimming');
    } else if (screen === SCREEN_REACH) {
      const done = REACHES[state.reachIndex];
      drawPanel(`${done.name} — complete!`, [
        `Bonus +${done.bonus}. Score ${state.score}.`,
        `Hearts ${state.hearts} of ${HEARTS} · Pearls ${state.pearls} · Best combo x${state.bestCombo}`,
        state.reachIndex + 1 < REACHES.length
          ? `Next: ${REACHES[state.reachIndex + 1].name} — the current runs faster.`
          : 'One reach left to swim.',
      ], 'Press Enter for the next reach');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The river wins this time', [
        `Score ${state.score} · Pearls ${state.pearls} · Best combo x${state.bestCombo}`,
        `Best ${best}`,
        'The koi rests. The river keeps flowing.',
      ], 'Press Space or click to swim again', '#ff6b5e88');
    } else if (screen === SCREEN_VICTORY) {
      drawPanel('Home at last', [
        'Three reaches swum. The spawning pool, at last.',
        `Score ${state.score} · Pearls ${state.pearls} · Best combo x${state.bestCombo}`,
        `Best ${best}`,
      ], 'Press Space or click to swim it again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Canvas fractions (0..1) to playfield coordinates, for pointer steering. */
    toField(fx, fy) {
      const ratio = window.devicePixelRatio || 1;
      return {
        x: (fx * window.innerWidth * ratio - view.x) / view.scale,
        y: (fy * window.innerHeight * ratio - view.y) / view.scale,
      };
    },
  };
}
