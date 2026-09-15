(function (root) {
  'use strict';
  function lines(text) { return text === '' ? [] : text.replace(/\r\n?/g, '\n').split('\n'); }
  function compare(original, changed, options = {}) {
    const a = lines(original), b = lines(changed);
    const normalize = value => {
      if (options.whitespace) value = value.replace(/\s+/g, '');
      return options.case ? value.toLowerCase() : value;
    };
    const x = a.map(normalize), y = b.map(normalize), rows = [];
    const emit = (type, i, j) => rows.push({ type, old: i === null ? null : i + 1, new: j === null ? null : j + 1, left: i === null ? '' : a[i], right: j === null ? '' : b[j] });
    let start = 0, endA = a.length, endB = b.length;
    while (start < endA && start < endB && x[start] === y[start]) { emit('equal', start, start); start++; }
    while (endA > start && endB > start && x[endA - 1] === y[endB - 1]) { endA--; endB--; }
    const n = endA - start, m = endB - start;
    const simplified = n * m > 4000000;
    if (simplified || !n || !m) {
      for (let i = start; i < endA; i++) emit('removed', i, null);
      for (let j = start; j < endB; j++) emit('added', null, j);
    } else {
      const width = m + 1, table = new Uint32Array((n + 1) * width);
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
        table[i * width + j] = x[start + i] === y[start + j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
      let i = 0, j = 0;
      while (i < n || j < m) {
        if (i < n && j < m && x[start + i] === y[start + j]) { emit('equal', start + i++, start + j++); }
        else if (i < n && (j === m || table[(i + 1) * width + j] >= table[i * width + j + 1])) emit('removed', start + i++, null);
        else emit('added', null, start + j++);
      }
    }
    for (let i = endA, j = endB; i < a.length; i++, j++) emit('equal', i, j);
    return { rows, simplified, added: rows.filter(r => r.type === 'added').length, removed: rows.filter(r => r.type === 'removed').length };
  }
  function unified(rows) { return rows.map(r => (r.type === 'added' ? '+' : r.type === 'removed' ? '-' : ' ') + (r.type === 'added' ? r.right : r.left)).join('\n'); }
  root.TextDiff = { compare, lines, unified };
  if (typeof module !== 'undefined') module.exports = root.TextDiff;
})(globalThis);
