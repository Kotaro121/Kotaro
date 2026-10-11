// 血液透析のダイアライザーで薬がどれだけ抜けるか — anatomy スキルで作った図。
// node build.mjs [--light]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640, HEIGHT = 420;

// ---- 世界の寸法(1単位 ≈ 1px) ----
const PLATE = { x: -135, y: -72, w: 270, d: 144, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const AX = { y: 0, z: 24, s0: -62, len: 120 };          // カートリッジの軸(x方向)
const BODY_R = 11, HEAD_R = 13.5, NIP_R = 4;
const PORT_X = [-48, 44];                                // 透析液ポート(左: 排出, 右: 供給)
const PORT_Z = AX.z + BODY_R + 6;
const CRADLE_X = [-38, 32];
const PUMP = [-104, 24], PUMP_R = 16;
const TANK = [-104, -34];
const VD_STEPS = [0.2, 0.7, 2, 7];
const tankR = (vd) => 6.5 + 4.2 * Math.sqrt(vd);
const TANK_H = 26;
const BLOCK = { x: -30, y: -60, w: 76, d: 22, r: 3 }, BLOCK_H = 16;
const BPORT = [[-18, -49], [18, -49]];                   // ブロック上のポート(排液入, 新液出)
const BEAKER = [62, -50], BEAKER_R = 7, BEAKER_H = 17;
const PANEL = { x: -72, y: 40, w: 152, d: 24, r: 3 }, PANEL_H = 10;
const KNOBS = [[-52, 52], [-18, 52], [16, 52]];          // MW, PB, Vd
const KNOB_R = 6;
const GAUGE = [54, 52], GAUGE_R = 13, GAUGE_Z = PANEL_H, GAUGE_H = 4, GAUGE_TOP = GAUGE_Z + GAUGE_H;
const RETURN_PORT = [104, 20];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [AX.s0 - 8, 0, PORT_Z + 10], [TANK[0] + tankR(7), TANK[1], TANK_H + 4], [BEAKER[0], BEAKER[1], BEAKER_H]],
  WIDTH, HEIGHT, { pad: 26, azimuth: 36, elevation: 32 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const F = G.frameOf([AX.s0, AX.y, AX.z], [1, 0, 0], [0, 0, 1], [0, 1, 0]);   // angle 0 = 真上, +90° = +y(手前)
const V = G.viewOf(P);
const FRONT_ANGLE = G.angleToward(F, V);                   // 視線に向く母線の角度

// ---- 台座 ----
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // 前縁の目盛り帯
  const strip = { x: -120, y: PLATE.y + PLATE.d - 14, w: 240, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // 銘板(3本の罫)
  const plateL = { x: 84, y: -66, w: 40, d: 12, r: 1 };
  out.push(S(k.slabOf(plateL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  for (const dy of [3, 6, 9]) out.push(L(k.lineOnTop([plateL.x + 3, plateL.y + dy], [plateL.x + plateL.w - 3 - (dy === 9 ? 12 : 0), plateL.y + dy], 0.8, P), { tone: "lo", free: true }));
  out.push(D([[plateL.x + 1.5, plateL.y + 1.5], [plateL.x + plateL.w - 1.5, plateL.y + 1.5], [plateL.x + 1.5, plateL.y + plateL.d - 1.5], [plateL.x + plateL.w - 1.5, plateL.y + plateL.d - 1.5]].map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  return out.join("");
}

// ---- タンク(患者 = 分布容積) ----
function tankSvg(vd) {
  const r = tankR(vd);
  const [x, y] = TANK;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - r, y: y - r, w: 2 * r, d: 2 * r, r }, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(x, y, r + 1.5, 0, 2, P, 48), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, r, 2, TANK_H - 2, P, 48, 0.6), { tone: "mid", inner: [9, 17].map((z) => k.sideArc(x, y, r, z, P, 40)).join("") }));
  out.push(L(k.ring(x, y, r - 2.2, TANK_H, P, 48), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 3.2, TANK_H, 3, P, 20), { tone: "mid" }));   // 吸引口
  out.push(S(k.cylinder(x + r * 0.55, y - r * 0.55, 2.4, TANK_H, 2.4, P, 16), { tone: "mid" }));   // 返血口
  return out.join("");
}

// ---- ローラーポンプ ----
function pumpBase() {
  const [x, y] = PUMP;
  const out = [];
  out.push(S(k.cylinder(x, y, PUMP_R + 2, 0, 3, P, 56), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, PUMP_R, 3, 11, P, 56, 0.6), { tone: "mid", inner: k.sideArc(x, y, PUMP_R, 8, P, 40) }));
  out.push(L(k.ring(x, y, PUMP_R - 1.6, 14, P, 56), { tone: "lo" }));       // レースウェイ(チューブが沿う溝)
  out.push(L(k.ring(x, y, PUMP_R - 4.2, 14, P, 56), { tone: "faint" }));
  const screws = [0, 1, 2, 3].map((i) => [x + Math.cos(i * Math.PI / 2 + 0.4) * (PUMP_R - 2.2), y + Math.sin(i * Math.PI / 2 + 0.4) * (PUMP_R - 2.2)]);
  out.push(D(screws.map(([sx, sy]) => at([sx, sy, 14])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 3, 14, 7, P, 20), { tone: "mid" }));          // 軸
  return out.join("");
}
const rollersAt = (angle) => {
  const [x, y] = PUMP;
  const out = [];
  const rs = [0, 1].map((i) => [x + Math.cos(angle + i * Math.PI) * 9, y + Math.sin(angle + i * Math.PI) * 9]);
  for (const [rx, ry] of byDepth(rs)) {
    out.push(S(k.slabOf({ x: Math.min(x, rx) - 1.2, y: Math.min(y, ry) - 1.2, w: Math.abs(rx - x) + 2.4, d: Math.abs(ry - y) + 2.4, r: 1 }, 18, 1.6, P, 2), { tone: "mid", crease: "none" }));
  }
  for (const [rx, ry] of byDepth(rs)) {
    out.push(S(k.cylinder(rx, ry, 3.2, 14, 6, P, 20), { tone: "hi" }));
    out.push(D([at([rx, ry, 20])], { size: 0.4, tone: "lo" }));
  }
  return out.join("");
};

// ---- カートリッジ(中空糸型ダイアライザー) ----
function cradles() {
  const out = [];
  for (const x of CRADLE_X) {
    const plan = { x: x - 6, y: AX.y - 15, w: 12, d: 30, r: 2 };
    out.push(S(k.slabOf(plan, 0, 14, P, 4, 0.6), { tone: "mid" }));
    out.push(D([at([x, AX.y - 12, 14]), at([x, AX.y + 12, 14])], { size: 0.45 }));
    const thumb = [x, AX.y + 18];
    out.push(S(k.cylinder(thumb[0], thumb[1], 2.4, 0, 6, P, 18), { tone: "mid" }));
    out.push(L(k.knurl(thumb[0], thumb[1], 2.4, 0, 6, 16, P), { tone: "lo" }));
  }
  return out.join("");
}
function cartridge() {
  const out = [];
  const Lm = AX.len;
  const profile = [[-9, NIP_R], [-1, NIP_R], [-1, HEAD_R - 2], [0, HEAD_R], [10, HEAD_R], [12, BODY_R], [Lm - 12, BODY_R], [Lm - 10, HEAD_R], [Lm, HEAD_R], [Lm + 1, HEAD_R - 2], [Lm + 1, NIP_R], [Lm + 9, NIP_R]];
  const ribs = G.ribsOf(F, 14, Lm - 14, BODY_R, 44, P, { fade: [0.45, 0.8], seams: true });   // 中空糸の束
  out.push(S(G.solidOf(profile, F, P), { tone: "hi", crease: "lo", inner: k.fadedSvg(ribs, { tone: "lo" }) + [5, Lm - 5].map((s) => G.arcOf(F, s, HEAD_R, P)).join("") }));
  for (const x of PORT_X) {
    out.push(S(k.cylinder(x, AX.y, 3.4, AX.z + BODY_R - 1, 4, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, AX.y, 2.6, AX.z + BODY_R + 3, PORT_Z - (AX.z + BODY_R + 3), P, 18), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(x, AX.y, 2.6, PORT_Z - 1.5, P, 12), { tone: "lo" }));
  }
  return out.join("");
}

// ---- 透析液ブロック・排液ビーカー ----
function block() {
  const out = [];
  out.push(S(k.slabOf(BLOCK, 0, BLOCK_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BLOCK, 3), BLOCK_H, P), { tone: "faint" }));
  out.push(D(k.corners(BLOCK, 4).map(([x, y]) => at([x, y, BLOCK_H])), { size: 0.45 }));
  for (const [x, y] of BPORT) {
    out.push(S(k.cylinder(x, y, 3.6, BLOCK_H, 2, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 2.6, BLOCK_H + 2, 4, P, 18), { tone: "mid" }));
  }
  const vent = { x: BLOCK.x + 44, y: BLOCK.y + 6, w: 20, d: 10, r: 1 };
  for (let i = 0; i < 4; i++) out.push(L(k.planOutline({ x: vent.x, y: vent.y + i * 2.6, w: vent.w, d: 1, r: 0.5 }, BLOCK_H, P, 2), { tone: "faint" }));
  // ビーカー
  const [bx, by] = BEAKER;
  out.push(S(k.cylinder(bx, by, BEAKER_R + 1.2, 0, 1.2, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(bx, by, BEAKER_R, 1.2, BEAKER_H - 1.2, P, 32), { tone: "hi", crease: "lo", inner: [5, 9, 13].map((z) => k.sideArc(bx, by, BEAKER_R, z, P, 24)).join("") }));
  out.push(L(k.ring(bx, by, BEAKER_R - 1.4, BEAKER_H, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(bx, by, 2.2, BEAKER_H - 1, 3, P, 14), { tone: "mid" }));  // 排液の落とし口
  // 返血ポート(患者側へ)
  const [rx, ry] = RETURN_PORT;
  out.push(S(k.slabOf({ x: rx - 7, y: ry - 7, w: 14, d: 14, r: 2 }, 0, 12, P, 3, 0.6), { tone: "mid" }));
  out.push(D([at([rx - 4.5, ry - 4.5, 12]), at([rx + 4.5, ry + 4.5, 12])], { size: 0.45 }));
  out.push(S(k.cylinder(rx, ry, 3, 12, 4, P, 20), { tone: "mid" }));
  return out.join("");
}

// ---- 操作パネル ----
function panel() {
  const out = [];
  out.push(S(k.slabOf(PANEL, 0, PANEL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PANEL, 3), PANEL_H, P), { tone: "faint" }));
  out.push(D(k.corners(PANEL, 4).map(([x, y]) => at([x, y, PANEL_H])), { size: 0.45 }));
  KNOBS.forEach(([x, y]) => {
    out.push(L(k.ring(x, y, KNOB_R + 2.4, PANEL_H, P, 40), { tone: "lo" }));
    const t = k.radialTicks(x, y, KNOB_R + 2.2, 10, 5, PANEL_H, [0.9, 1.6], P, -Math.PI * 0.75, Math.PI * 1.5);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(S(k.cylinder(x, y, KNOB_R, PANEL_H, 5, P, 32, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(x, y, KNOB_R, PANEL_H, PANEL_H + 5, 30, P), { tone: "lo" }));
  });
  const [gx, gy] = GAUGE;
  out.push(S(k.cylinder(gx, gy, GAUGE_R, GAUGE_Z, GAUGE_H, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(gx, gy, GAUGE_R - 1.8, GAUGE_TOP, P, 56), { tone: "lo" }));
  const t = k.radialTicks(gx, gy, GAUGE_R - 2.6, 25, 5, GAUGE_TOP, [1.2, 2.4], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(gx, gy, 1.4, GAUGE_TOP, P, 14), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([gx, gy + 7.5], GAUGE_TOP, P, "x"), "mL/min", { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const pointerAt = ([x, y], share, z, rIn, rOut) => {
  const a = -Math.PI * 0.75 + share * Math.PI * 1.5;
  return k.lineOnTop([x + Math.sin(a) * rIn, y - Math.cos(a) * rIn], [x + Math.sin(a) * rOut, y - Math.cos(a) * rOut], z, P);
};

// ---- 配管(wire) ----
const W = (pts, opt) => k.wireSvg(at(pts[0]), at(pts[pts.length - 1]), { via: pts.slice(1, -1).map(at), tone: "lo", size: 1.1, ...opt });
const nipL = [AX.s0 - 9, AX.y, AX.z], nipR = [AX.s0 + AX.len + 9, AX.y, AX.z];
const ROUTE = {
  draw: [[TANK[0], TANK[1], TANK_H + 3], [TANK[0] + 6, TANK[1] + 20, 26], [PUMP[0] - 14, PUMP[1] - 4, 21]],
  pumpIn: [[PUMP[0] - 14, PUMP[1] - 4, 21], [PUMP[0] - 14, PUMP[1], 17]],
  pumpOut: [[PUMP[0] + 14, PUMP[1], 17], [PUMP[0] + 14, PUMP[1] - 4, 21]],
  inlet: [[PUMP[0] + 14, PUMP[1] - 4, 21], [AX.s0 - 22, AX.y + 4, AX.z], nipL],
  outlet: [nipR, [AX.s0 + AX.len + 22, AX.y, AX.z], [RETURN_PORT[0], RETURN_PORT[1], 16]],
  fresh: [[BPORT[1][0], BPORT[1][1], BLOCK_H + 6], [PORT_X[1], -24, PORT_Z + 4], [PORT_X[1], AX.y, PORT_Z]],
  used: [[PORT_X[0], AX.y, PORT_Z], [PORT_X[0], -24, PORT_Z + 4], [BPORT[0][0], BPORT[0][1], BLOCK_H + 6]],
  drain: [[BLOCK.x + BLOCK.w, BLOCK.y + 11, BLOCK_H - 4], [BEAKER[0] - 4, BEAKER[1] - 3, BEAKER_H + 2]],
};
// 粒の通り道(血液): タンク → ポンプ → 入口 → 膜の前面(視線に向く母線) → 出口 → 返血
const FACE_IN = G.pointOf(F, 13, BODY_R + 0.4, FRONT_ANGLE), FACE_OUT = G.pointOf(F, AX.len - 13, BODY_R + 0.4, FRONT_ANGLE);
const BLOOD_PATH = [...ROUTE.draw, ...ROUTE.pumpIn.slice(1), ...ROUTE.pumpOut, ...ROUTE.inlet.slice(1), FACE_IN, FACE_OUT, ...ROUTE.outlet];
// 膜を抜けた粒: 抜けた位置 → 上面を左へ → 排出ポート → ブロック → ビーカー
const TOP_AT = (s) => G.pointOf(F, s, BODY_R + 0.4, 0);
const DIALYSATE_TAIL = [[PORT_X[0], AX.y, AX.z + BODY_R + 0.4], ...ROUTE.used, [BLOCK.x + BLOCK.w, BLOCK.y + 11, BLOCK_H - 4], ...ROUTE.drain.slice(1), [BEAKER[0], BEAKER[1], 6]];
const WINDOW_S = [13, AX.len - 13];

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "血液透析のダイアライザーを載せた試験台。左奥のタンクが患者の分布容積、ローラーポンプが血液を中空糸カートリッジへ送り、奥のブロックから透析液が向流で流れる。薬の粒が回路を回り、膜を抜けた粒だけが排液ビーカーに落ちる。パネルの三つのつまみが分子量・蛋白結合率・分布容積、ダイヤルが透析クリアランスを示す。",
  body: [
    plate(),
    `<g data-part="tank">${tankSvg(VD_STEPS[1])}</g>`,
    W(ROUTE.draw, { ends: "both" }),
    block(),
    W(ROUTE.used), W(ROUTE.drain), W(ROUTE.fresh),
    pumpBase(),
    W(ROUTE.pumpIn, { ends: "to" }), W(ROUTE.pumpOut, { ends: "from" }),
    `<g data-part="rollers">${rollersAt(0)}</g>`,
    W(ROUTE.inlet, { ends: "to" }),
    cradles(),
    cartridge(),
    W(ROUTE.outlet),
    panel(),
    `<g data-part="beads"></g>`,
    `<g data-part="pointers"></g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const F = ${JSON.stringify(F)};
const KNOBS = ${JSON.stringify(KNOBS)}, KNOB_R = ${KNOB_R}, PANEL_H = ${PANEL_H};
const GAUGE = ${JSON.stringify(GAUGE)}, GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP};
const PUMP = ${JSON.stringify(PUMP)}, TANK = ${JSON.stringify(TANK)}, TANK_H = ${TANK_H}, VD_STEPS = ${JSON.stringify(VD_STEPS)};
const BLOOD_PATH = ${JSON.stringify(BLOOD_PATH)}, DIALYSATE_TAIL = ${JSON.stringify(DIALYSATE_TAIL)}, WINDOW_S = ${JSON.stringify(WINDOW_S)};
const BODY_R = ${BODY_R}, AXLEN = ${AX.len};
const byDepth = ${byDepth.toString().replace(/k\./g, "")};
const tankR = ${tankR.toString()};
const tankSvg = ${tankSvg.toString().replace(/k\./g, "")};
const rollersAt = ${rollersAt.toString().replace(/k\./g, "")};
const pointerAt = ${pointerAt.toString().replace(/k\./g, "")};
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const D = (points, style) => dotsSvg(points, style);
const at = (p) => iso(p, P);
const pointOf = (F, s, r, angle) => { const c = Math.cos(angle), n = Math.sin(angle); return [F.o[0] + F.a[0]*s + (F.u[0]*c + F.v[0]*n)*r, F.o[1] + F.a[1]*s + (F.u[1]*c + F.v[1]*n)*r, F.o[2] + F.a[2]*s + (F.u[2]*c + F.v[2]*n)*r]; };

// ---- 真実: 簡略化した透析薬物動態モデル ----
const QB = 250;                                   // 血流量 mL/min
const K_UREA = 230;                                // 尿素(60 Da)の透析クリアランス mL/min(高性能膜, QB 250, QD 500)
const kDiff = (mw) => K_UREA * Math.pow(60 / Math.max(60, mw), 0.17);   // 分子量で拡散が落ちる
const sieve = (mw) => 1 / (1 + Math.exp(Math.log(mw / 12000) / 0.45));  // 高性能膜のふるい係数(カットオフ付近で急落)
const model = (mw, pb, vd) => {
  const fu = 1 - pb / 100;
  const cl = fu * kDiff(mw) * sieve(mw);                                  // 透析クリアランス mL/min
  const removed = 1 - Math.exp(-cl * 240 / (vd * 70 * 1000));              // 4時間・70kg・1-コンパートメント
  return { cl, extraction: cl / QB, removed };
};
const PRESETS = [
  { name: "リチウム", mw: 7, pb: 0, vd: 0.8 },
  { name: "バンコマイシン", mw: 1449, pb: 50, vd: 0.7 },
  { name: "ジゴキシン", mw: 781, pb: 25, vd: 7 },
  { name: "ワルファリン", mw: 308, pb: 99, vd: 0.14 },
];
const MW_LO = Math.log(7), MW_HI = Math.log(150000);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtMW = (mw) => (mw >= 1000 ? (mw / 1000).toFixed(mw >= 10000 ? 0 : 1) + " kDa" : Math.round(mw) + " Da");

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const tankG = svg.querySelector('[data-part="tank"]');
const rollersG = svg.querySelector('[data-part="rollers"]');
const beadsG = svg.querySelector('[data-part="beads"]');
const pointersG = svg.querySelector('[data-part="pointers"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// 状態(目標値と、なめらかに追う現在値)
let want = { lmw: Math.log(PRESETS[0].mw), pb: PRESETS[0].pb, vd: PRESETS[0].vd };
let now = { ...want };
let shownVd = -1, pumpAngle = 0, frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
let passed = 0, crossed = 0;

// 粒: 血液の道を進み、膜の窓で抜けるかどうかを決める
const lengths = (pts) => { const out = [0]; for (let i = 1; i < pts.length; i++) out.push(out[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2])); return out; };
const BL = lengths(BLOOD_PATH), BLOOD_LEN = BL[BL.length - 1];
const along = (pts, cum, d) => { let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const t = clamp((d - cum[i-1]) / (cum[i] - cum[i-1] || 1), 0, 1); const a = pts[i-1], b = pts[i]; return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; };
const faceIn = BLOOD_PATH.findIndex((p, i) => i > 0 && Math.abs(p[0] - (F.o[0] + WINDOW_S[0])) < 0.01 && Math.abs(p[2] - F.o[2]) < BODY_R + 1);
const WIN_FROM = BL[faceIn], WIN_TO = BL[faceIn + 1];
const SPEED = 46;                                                  // 単位/秒
const beads = Array.from({ length: 22 }, (_, i) => ({ d: (i / 22) * BLOOD_LEN, roll: Math.random(), where: Math.random(), side: "blood", tail: null, decided: false }));
const tailOf = (s) => { const pts = []; for (let q = s; q > WINDOW_S[0] + 2; q -= 8) pts.push(pointOf(F, q, BODY_R + 0.4, 0)); pts.push(pointOf(F, WINDOW_S[0] - 0.6, BODY_R + 0.4, 0)); return [...pts, ...DIALYSATE_TAIL]; };
function stepBeads(dt, extraction) {
  for (const b of beads) {
    if (b.side === "blood") {
      const before = b.d;
      b.d += SPEED * dt;
      if (before < WIN_FROM && b.d >= WIN_FROM) { b.decided = true; b.cross = b.roll < extraction; b.crossAt = WIN_FROM + (WIN_TO - WIN_FROM) * (0.1 + 0.8 * b.where); }
      if (b.decided && b.cross && b.d >= b.crossAt) {
        const s = WINDOW_S[0] + (b.crossAt - WIN_FROM) / (WIN_TO - WIN_FROM) * (WINDOW_S[1] - WINDOW_S[0]);
        const face = along(BLOOD_PATH, BL, b.crossAt);
        const top = pointOf(F, s, BODY_R + 0.4, 0);
        b.tail = [face, top, ...tailOf(s)]; b.cum = lengths(b.tail); b.side = "dialysate"; b.d = 0; b.decided = false; crossed++;
      } else if (before < WIN_TO && b.d >= WIN_TO && b.decided) { b.decided = false; passed++; }
      if (b.d >= BLOOD_LEN) { b.d -= BLOOD_LEN; b.roll = Math.random(); b.where = Math.random(); }
    } else {
      b.d += SPEED * 0.7 * dt;
      if (b.d >= b.cum[b.cum.length - 1]) { b.side = "blood"; b.d = 0; b.roll = Math.random(); b.where = Math.random(); b.tail = null; }
    }
  }
}
function beadPoints() {
  return beads.map((b) => (b.side === "blood" ? along(BLOOD_PATH, BL, b.d) : along(b.tail, b.cum, b.d)));
}

function draw() {
  const mw = Math.exp(now.lmw);
  const m = model(mw, now.pb, now.vd);
  const vdStep = VD_STEPS.reduce((best, v) => (Math.abs(Math.log(v) - Math.log(now.vd)) < Math.abs(Math.log(best) - Math.log(now.vd)) ? v : best), VD_STEPS[0]);
  if (vdStep !== shownVd) { shownVd = vdStep; tankG.innerHTML = tankSvg(vdStep); }
  rollersG.innerHTML = rollersAt(pumpAngle);
  const pts = beadPoints().map((p) => [p, depthOf(p, P)]).sort((a, b) => a[1] - b[1]).map(([p]) => at(p));
  beadsG.innerHTML = D(pts, { size: 1.6, tone: "lit" });
  const shares = [(now.lmw - MW_LO) / (MW_HI - MW_LO), now.pb / 100, (Math.log(now.vd) - Math.log(0.1)) / (Math.log(10) - Math.log(0.1))];
  let p = "";
  KNOBS.forEach((kn, i) => { p += L(pointerAt(kn, clamp(shares[i], 0, 1), PANEL_H + 5.2, 1, KNOB_R), { tone: "hi", free: "start" }); });
  p += L(pointerAt(GAUGE, clamp(m.cl / 250, 0, 1), GAUGE_TOP + 0.2, -2.6, GAUGE_R - 3.4), { tone: "lit", free: "start", className: "needle" });
  pointersG.innerHTML = p;
  const preset = PRESETS.find((q) => Math.abs(Math.log(q.mw) - want.lmw) < 0.01 && q.pb === want.pb && q.vd === want.vd);
  const text = (preset ? preset.name : fmtMW(mw) + " · " + Math.round(now.pb) + "% · " + now.vd.toFixed(now.vd < 1 ? 2 : 1) + " L/kg") + " · CL " + m.cl.toFixed(0) + " mL/min · 4 h で " + (m.removed * 100).toFixed(m.removed < 0.1 ? 1 : 0) + "%";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(m.cl)));
  stage.setAttribute("aria-valuetext", text);
  return m;
}
function tick(t) {
  const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
  last = t;
  const calm = still.matches;
  if (touring) { clock += dt; const q = PRESETS[Math.floor(clock / 5) % PRESETS.length]; want = { lmw: Math.log(q.mw), pb: q.pb, vd: q.vd }; }
  const ease = calm ? 1 : 1 - Math.exp(-dt / 0.35);
  now.lmw += (want.lmw - now.lmw) * ease; now.pb += (want.pb - now.pb) * ease; now.vd += (want.vd - now.vd) * ease;
  if (Math.abs(want.lmw - now.lmw) < 1e-3) now.lmw = want.lmw;
  if (Math.abs(want.pb - now.pb) < 1e-2) now.pb = want.pb;
  if (Math.abs(want.vd - now.vd) < 1e-3) now.vd = want.vd;
  if (!calm) { pumpAngle += dt * 2.4; stepBeads(dt, model(Math.exp(now.lmw), now.pb, now.vd).extraction); }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; want = { ...want, ...next }; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 6000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const sx = clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1);
  const sy = clamp(((event.clientY - box.top) / box.height - 0.15) / 0.7, 0, 1);
  steer({ lmw: MW_LO + sx * (MW_HI - MW_LO), pb: Math.round(sy * 99) });
});
stage.addEventListener("pointerleave", () => steer({}));
stage.addEventListener("keydown", (event) => {
  const i = VD_STEPS.reduce((best, v, idx) => (Math.abs(Math.log(v) - Math.log(want.vd)) < Math.abs(Math.log(VD_STEPS[best]) - Math.log(want.vd)) ? idx : best), 0);
  const map = {
    ArrowRight: { lmw: clamp(want.lmw + Math.log(2), MW_LO, MW_HI) }, ArrowLeft: { lmw: clamp(want.lmw - Math.log(2), MW_LO, MW_HI) },
    ArrowUp: { pb: clamp(want.pb + 10, 0, 99) }, ArrowDown: { pb: clamp(want.pb - 10, 0, 99) },
    PageUp: { vd: VD_STEPS[Math.min(VD_STEPS.length - 1, i + 1)] }, PageDown: { vd: VD_STEPS[Math.max(0, i - 1)] },
  };
  const digit = /^[1-4]$/.test(event.key) ? PRESETS[Number(event.key) - 1] : null;
  const next = digit ? { lmw: Math.log(digit.mw), pb: digit.pb, vd: digit.vd } : map[event.key];
  if (!next) return;
  event.preventDefault();
  steer(next);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "ダイアライザーと薬物除去",
  hint: "横: 分子量 · 縦: 結合率 · 1〜4: 薬",
  readout: "リチウム · CL 230 mL/min · 4 h で 63%",
  keys: [
    { mark: "lit", label: "薬の粒と針: 膜を抜けた粒だけが排液ビーカーへ落ちる" },
    { mark: "raised", label: "左奥のタンクの太さが分布容積(Vd)" },
  ],
  caption:
    "左奥のタンク(患者の分布容積)からローラーポンプが血液を 250 mL/min で中空糸カートリッジに送り、奥のブロックから透析液が向流で流れる。薬の粒は、蛋白に結合していない分だけ膜に近づけ、膜のふるい(約 12 kDa で急落)を抜けた分だけ排液へ落ちる。つまみは左から分子量・蛋白結合率・Vd(PageUp/Down で段階を変える)、ダイヤルは透析クリアランス、読み出しは 4 時間・70 kg・1-コンパートメントで計算した除去率。分子量 7 Da のリチウムは大半が抜け、ジゴキシンは Vd 7 L/kg の広さに、ワルファリンは結合 99% に阻まれる。数値は尿素クリアランス 230 mL/min を基準にした簡略モデルで、実測値の代わりにはならない。",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="ダイアライザー: 矢印キーで分子量と蛋白結合率、PageUp/Down で分布容積を変える" aria-valuemin="0" aria-valuemax="250" aria-valuenow="230">${svg}</div>`,
});

const name = theme === "light" ? "dialyzer-light.html" : "dialyzer.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "ダイアライザーと薬物除去", theme, body, script: kitScript() + live }));
console.log("wrote", name);
