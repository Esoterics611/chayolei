// Compare two versions of a document: paragraphs are matched first, and
// paragraphs that changed are compared word by word.

export type WordOp = { op: 'eq' | 'del' | 'ins'; text: string };

export type ParaDiff =
  | { kind: 'same'; text: string; toIndex: number }
  | { kind: 'added'; text: string; toIndex: number }
  | { kind: 'removed'; text: string }
  | { kind: 'changed'; ops: WordOp[]; toIndex: number };

/** Longest-common-subsequence table over two sequences. */
function lcsTable<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): number[][] {
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = eq(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  return t;
}

/** Edit script turning `a` into `b`: equal, delete and insert steps in order. */
function editScript<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean) {
  const t = lcsTable(a, b, eq);
  const out: { op: 'eq' | 'del' | 'ins'; a?: number; b?: number }[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (eq(a[i], b[j])) { out.push({ op: 'eq', a: i++, b: j++ }); }
    else if (t[i + 1][j] >= t[i][j + 1]) { out.push({ op: 'del', a: i++ }); }
    else { out.push({ op: 'ins', b: j++ }); }
  }
  while (i < a.length) out.push({ op: 'del', a: i++ });
  while (j < b.length) out.push({ op: 'ins', b: j++ });
  return out;
}

export function diffWords(from: string, to: string): WordOp[] {
  const a = from.split(/(\s+)/).filter(Boolean);
  const b = to.split(/(\s+)/).filter(Boolean);
  const ops: WordOp[] = [];
  for (const step of editScript(a, b, (x, y) => x === y)) {
    const text = step.op === 'ins' ? b[step.b!] : a[step.a!];
    const last = ops[ops.length - 1];
    if (last && last.op === step.op) last.text += text;
    else ops.push({ op: step.op, text });
  }
  return ops;
}

/** Share of `to`'s characters that are unchanged in a word diff (0..1). */
function similarity(ops: WordOp[]): number {
  const kept = ops.filter(o => o.op === 'eq' && o.text.trim()).reduce((n, o) => n + o.text.length, 0);
  const total = ops.filter(o => o.op !== 'del').reduce((n, o) => n + o.text.length, 0);
  return total ? kept / total : 0;
}

export function diffParagraphs(from: string[], to: string[]): ParaDiff[] {
  const out: ParaDiff[] = [];
  let dels: number[] = [];
  let inss: number[] = [];

  // Pair removed and added paragraphs in a run: similar pairs become "changed".
  const flush = () => {
    const pairs = Math.min(dels.length, inss.length);
    for (let k = 0; k < pairs; k++) {
      const ops = diffWords(from[dels[k]], to[inss[k]]);
      if (similarity(ops) >= 0.3) out.push({ kind: 'changed', ops, toIndex: inss[k] });
      else {
        out.push({ kind: 'removed', text: from[dels[k]] });
        out.push({ kind: 'added', text: to[inss[k]], toIndex: inss[k] });
      }
    }
    for (const d of dels.slice(pairs)) out.push({ kind: 'removed', text: from[d] });
    for (const i of inss.slice(pairs)) out.push({ kind: 'added', text: to[i], toIndex: i });
    dels = []; inss = [];
  };

  for (const step of editScript(from, to, (x, y) => x === y)) {
    if (step.op === 'eq') { flush(); out.push({ kind: 'same', text: to[step.b!], toIndex: step.b! }); }
    else if (step.op === 'del') dels.push(step.a!);
    else inss.push(step.b!);
  }
  flush();
  return out;
}

/** Counts for a change summary: paragraphs added, removed and changed. */
export function diffStats(d: ParaDiff[]) {
  return {
    added: d.filter(p => p.kind === 'added').length,
    removed: d.filter(p => p.kind === 'removed').length,
    changed: d.filter(p => p.kind === 'changed').length,
  };
}
