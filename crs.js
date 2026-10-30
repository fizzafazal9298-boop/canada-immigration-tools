// NorthEntry CRS engine — implements the IRCC Comprehensive Ranking System tables
// (current rules; arranged-employment points removed 25 Mar 2025 are NOT included).
function agePts(age, spouse) {
  if (age <= 17) return 0;
  if (age === 18) return spouse ? 90 : 99;
  if (age === 19) return spouse ? 95 : 105;
  if (age >= 20 && age <= 29) return spouse ? 100 : 110;
  const S = {30:105,31:99,32:94,33:88,34:83,35:77,36:72,37:66,38:61,39:55,40:50,41:39,42:28,43:17,44:6};
  const W = {30:95,31:90,32:85,33:80,34:75,35:70,36:65,37:60,38:55,39:50,40:45,41:35,42:25,43:15,44:5};
  if (age >= 45) return 0;
  return (spouse ? W : S)[age] || 0;
}
const EDU = {none:[0,0], secondary:[30,28], one:[90,84], two:[98,91], bachelor:[120,112], twoplus:[128,119], masters:[135,126], phd:[150,140]};
function l1(clb, spouse) {
  if (clb <= 3) return 0;
  if (clb <= 5) return 6;
  if (clb === 6) return spouse ? 8 : 9;
  if (clb === 7) return spouse ? 16 : 17;
  if (clb === 8) return spouse ? 22 : 23;
  if (clb === 9) return spouse ? 29 : 31;
  return spouse ? 32 : 34;
}
function l2(clb) { if (clb <= 4) return 0; if (clb <= 6) return 1; if (clb <= 8) return 3; return 6; }
const CANW = {0:[0,0], 1:[40,35], 2:[53,46], 3:[64,56], 4:[72,63], 5:[80,70]};
const SP_EDU = {none:0, secondary:2, one:6, two:7, bachelor:8, twoplus:9, masters:10, phd:10};
function spLang(clb) { if (clb <= 4) return 0; if (clb <= 6) return 1; if (clb <= 8) return 3; return 5; }
const SP_CANW = {0:0, 1:5, 2:7, 3:8, 4:9, 5:10};
function eduRow(edu) { if (edu === 'none' || edu === 'secondary') return 0; if (edu === 'twoplus') return 2; return 1; }
function allMin(arr, n) { return arr.every(v => v >= n); }

function calcCRS(o) {
  const sp = !!o.spouse, idx = sp ? 1 : 0, L = {};
  // A. Core
  L.age = agePts(o.age, sp);
  L.edu = EDU[o.edu][idx];
  L.lang1 = o.lang1.reduce((s, c) => s + l1(c, sp), 0);
  L.lang2 = o.lang2 ? Math.min(sp ? 22 : 24, o.lang2.reduce((s, c) => s + l2(c), 0)) : 0;
  L.canw = CANW[o.canWork][idx];
  const core = L.age + L.edu + L.lang1 + L.lang2 + L.canw;
  // B. Spouse
  let spousePts = 0;
  if (sp) {
    L.spEdu = SP_EDU[o.spEdu];
    L.spLang = o.spLang.reduce((s, c) => s + spLang(c), 0);
    L.spCanw = SP_CANW[o.spCanWork];
    spousePts = L.spEdu + L.spLang + L.spCanw;
  }
  // C. Skill transferability
  const row = eduRow(o.edu), can = o.canWork, f = o.foreignWork;
  L.tEduLang = row === 0 ? 0 : (allMin(o.lang1, 9) ? (row === 2 ? 50 : 25) : (allMin(o.lang1, 7) ? (row === 2 ? 25 : 13) : 0));
  L.tEduCan = (row === 0 || can === 0) ? 0 : (row === 2 ? (can === 1 ? 25 : 50) : (can === 1 ? 13 : 25));
  const eduSec = Math.min(50, L.tEduLang + L.tEduCan);
  L.tForLang = f === 0 ? 0 : (allMin(o.lang1, 9) ? (f === 3 ? 50 : 25) : (allMin(o.lang1, 7) ? (f === 3 ? 25 : 13) : 0));
  L.tForCan = (f === 0 || can === 0) ? 0 : (f === 3 ? (can === 1 ? 25 : 50) : (can === 1 ? 13 : 25));
  const forSec = Math.min(50, L.tForLang + L.tForCan);
  L.tCert = !o.cert ? 0 : (allMin(o.lang1, 7) ? 50 : (allMin(o.lang1, 5) ? 25 : 0));
  const transfer = Math.min(100, eduSec + forSec + L.tCert);
  // D. Additional
  L.pnp = o.pnp ? 600 : 0;
  L.sibling = o.sibling ? 15 : 0;
  L.canStudy = o.canStudy === 'ca12' ? 15 : (o.canStudy === 'ca3' ? 30 : 0);
  let fAb = null, oAb = null;
  if (o.lang1Type === 'fr') { fAb = o.lang1; oAb = o.lang2; }
  else if (o.lang2 && o.lang2Type === 'fr') { fAb = o.lang2; oAb = o.lang1; }
  L.french = (fAb && allMin(fAb, 7)) ? ((oAb && allMin(oAb, 5)) ? 50 : 25) : 0;
  const additional = Math.min(600, L.pnp + L.sibling + L.canStudy + L.french);
  return { lines: L, core, spousePts, transfer, additional, total: core + spousePts + transfer + additional };
}
if (typeof module !== 'undefined') module.exports = { calcCRS };
