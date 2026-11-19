const MAX_N = 7;  // solves automatically up to here; above it, Solve starts the calculation
let N = 3, A = [], tmr, seq = 0;
const needsSolve = () => N > MAX_N;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fix = s => String(s).replaceAll('-', '−');
const commas = s => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fact = n => { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; return commas(f); };

const PRESETS = {
  sample: [[2, 1, 3], [1, 3, 1], [1, 2, 4]],
  two: [[2, 1], [5, 3]],
  sing: [[1, 2], [2, 4]]
};

function load(m) { N = m.length; A = m.map(r => r.map(String)); build(); }

function setSize(n) {
  A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (A[i] && A[i][j] !== undefined) ? A[i][j] : '0'));
  N = n;
  build();
}

function build() {
  $('size').value = N;
  $('solveBar').hidden = !needsSolve();
  document.querySelectorAll('#chips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === N)));
  $('form').innerHTML = `<table class="cg"><tbody>${A.map((row, i) => '<tr>' + row.map((v, j) =>
    `<td><input inputmode="decimal" aria-label="Row ${i + 1}, column ${j + 1}" data-r="${i}" data-c="${j}" value="${esc(v)}"></td>`).join('') + '</tr>').join('')}</tbody></table>`;
  compute();
}

const mat = M => `<div class="box"><table class="m" role="presentation">${M.map(r => '<tr>' + r.map(v => `<td>${esc(fix(v))}</td>`).join('') + '</tr>').join('')}</table></div>`;

const FORMULA = `<p class="fm">det(A) =
  <span class="op"><span>Σ</span><small>σ∈S<sub>n</sub></small></span>
  sgn(σ)
  <span class="op"><small>n</small><span>Π</span><small>i=1</small></span>
  a<sub>i,σ(i)</sub></p>`;

const matCard = `<section class="card span"><h2><span class="n">1</span>Matrix A</h2>`;

const th = ['#', 'σ', 'Inversions (pairs out of order)', 'Count', 'sgn(σ)', 'Entries a<sub>i,σ(i)</sub> and their values', 'Product', 'sgn × product', 'Running sum'];
const table = rows => `<div class="box"><table class="vt"><tr>${th.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(t =>
  `<tr><td>${t[0]}</td><td>${t[1]}</td><td class="wk">${t[2]}</td><td>${t[3]}</td><td>${fix(t[4])}</td><td class="wk">${fix(t[5])}</td><td>${fix(t[6])}</td><td>${fix(t[7])}</td><td>${fix(t[8])}</td></tr>`).join('')}</table></div>`;
const transposeA = () => A[0].map((_, j) => A.map(r => r[j]));

function verifyCard(r) {
  const items = [
    [r.counted, `${commas(r.count)} permutations were added, which equals n! = ${commas(r.factorial)}`],
    ...(r.n >= 2 ? [[r.balanced, `Even and odd permutations are equal in number (${commas(r.even)} even, ${commas(BigInt(r.count) - BigInt(r.even))} odd)`]] : []),
    [r.same, `det(Aᵀ) by the same formula equals det(A) (${fix(r.check)} and ${fix(r.det)})`]
  ];
  const ok = items.every(q => q[0]);
  return `<section class="card span"><h2><span class="n">4</span>Verification</h2>
   <p class="mut">Swapping rows and columns does not change the determinant, so the same formula is applied to Aᵀ.</p>
   <p class="lab">Aᵀ</p>${mat(transposeA())}
   <p class="lab">All ${commas(r.count)} permutations for Aᵀ</p>${table(r.terms_t)}
   <ul class="chk" style="margin-top:12px">${items.map(q => `<li class="${q[0] ? 'ok' : 'bad'}">${q[0] ? '✔' : '✘'} ${q[1]}</li>`).join('')}</ul>
   <p class="big ${ok ? 'ok' : 'bad'}">${ok ? '✔ The determinant is verified.' : '✘ Verification failed. Recheck your entries.'}</p></section>`;
}

const report = r => `${matCard}${mat(A)}</section>
  <section class="card span"><h2><span class="n">2</span>All ${commas(r.count)} permutations</h2>
   <p class="mut">Each row picks one entry from every row of A, with row i using column σ(i). Inversions are the pairs of columns that are out of order: an even count gives sgn = +1 and an odd count gives −1. The last column adds the signed products one at a time.</p>
   ${table(r.terms)}</section>
  <section class="card span"><h2><span class="n">3</span>Sum</h2>${FORMULA}
   <div class="ans"><div>det(A) = ${fix(r.det)}</div></div></section>
  ${verifyCard(r)}`;

async function compute(force) {
  if (needsSolve()) {
    if (!force) {
      seq++;
      $('err').textContent = '';
      $('out').innerHTML = '';
      $('solveHint').textContent = `${N}×${N} has ${fact(N)} permutations, and all of them are listed twice (for A and for Aᵀ). Press Solve to start. ${N >= 9 ? 'This builds millions of rows: it can use several GB of memory and freeze the page or the server. Stop the server to cancel.' : 'This can take several seconds.'}`;
      return;
    }
    $('out').innerHTML = '<p class="mut">Solving…</p>';
    $('solveBtn').disabled = true;
    $('solveHint').textContent = '';
  }
  const mine = ++seq;
  try {
    const r = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ A })
    });
    if (mine !== seq) return;
    if (r.status === 422) {
      const j = await r.json().catch(() => ({}));
      $('err').textContent = typeof j.detail === 'string' ? j.detail : 'The API could not read this matrix.';
      $('out').innerHTML = '';
      return;
    }
    if (!r.ok) throw new Error('API returned ' + r.status);
    const j = await r.json();
    if (mine !== seq) return;
    $('err').textContent = '';
    $('out').innerHTML = report(j);
  } catch (e) {
    $('err').textContent = 'Could not reach the Python API. Run det_api.py first.';
    $('out').innerHTML = '';
  } finally {
    $('solveBtn').disabled = false;
  }
}

$('chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSize(+b.dataset.n); });
$('size').addEventListener('change', () => {
  const v = parseInt($('size').value, 10);
  setSize(v >= 1 ? v : N);
});
$('presets').addEventListener('click', e => {
  const p = e.target.dataset.p;
  if (!p) return;
  if (p === 'clear') { A = A.map(r => r.map(() => '0')); build(); }
  else if (p === 'rand') { A = A.map(r => r.map(() => String(Math.floor(Math.random() * 19) - 9))); build(); }
  else load(PRESETS[p]);
});
$('form').addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.r === undefined) return;
  A[+el.dataset.r][+el.dataset.c] = el.value;
  clearTimeout(tmr);
  tmr = setTimeout(compute, 150);
});
$('solveBtn').addEventListener('click', () => compute(true));
load(PRESETS.sample);