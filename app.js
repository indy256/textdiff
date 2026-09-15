(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let result = { rows: [] }, view = 'side', timer, toastTimer;
  const MAX_SIZE = 2 * 1024 * 1024;
  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function highlight(container, value, other) {
    let start = 0, end = value.length, otherEnd = other.length;
    while (start < end && start < otherEnd && value[start] === other[start]) start++;
    while (end > start && otherEnd > start && value[end - 1] === other[otherEnd - 1]) { end--; otherEnd--; }
    container.append(document.createTextNode(value.slice(0, start)), node('mark', '', value.slice(start, end)), document.createTextNode(value.slice(end)));
  }
  function cell(row, side, other) {
    if (!row) return node('div', 'diff-cell blank');
    const element = node('div', `diff-cell ${row.type}`);
    if (view === 'unified') {
      element.append(node('span', 'line-number', row.old ?? ''), node('span', 'line-number', row.new ?? ''));
    } else element.append(node('span', 'line-number', (side === 'left' ? row.old : row.new) ?? ''));
    element.append(node('span', 'line-sign', row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '));
    const content = node('span', 'line-content');
    if (other !== undefined && row[side] !== other) highlight(content, row[side], other);
    else content.textContent = row[side];
    element.append(content);
    return element;
  }
  function render() {
    const output = $('diff-output');
    output.classList.toggle('unified', view === 'unified');
    $('column-headings').hidden = view === 'unified';
    const fragment = document.createDocumentFragment();
    let count = 0;
    const append = (...cells) => { if (count++ >= 3000) return; const row = node('div', 'diff-row'); row.append(...cells); fragment.append(row); };
    if (!result.rows.length) {
      const empty = node('div', 'empty-state');
      empty.append(node('h3', '', 'A fresh pair of eyes for your text.'), node('p', '', 'Paste text above or try an example to see what changed.'));
      fragment.append(empty);
    } else if (view === 'unified') {
      for (const row of result.rows) { if (count >= 3000) { count = result.rows.length; break; } append(cell(row, row.type === 'added' ? 'right' : 'left')); }
    } else {
      for (let i = 0; i < result.rows.length;) {
        const row = result.rows[i];
        if (row.type === 'equal') { if (count < 3000) append(cell(row, 'left'), cell(row, 'right')); else count++; i++; continue; }
        const removed = [], added = [];
        while (i < result.rows.length && result.rows[i].type !== 'equal') { const item = result.rows[i++]; (item.type === 'removed' ? removed : added).push(item); }
        for (let k = 0; k < Math.max(removed.length, added.length); k++) {
          if (count >= 3000) { count++; continue; }
          append(cell(removed[k], 'left', added[k]?.right), cell(added[k], 'right', removed[k]?.left));
        }
      }
    }
    output.replaceChildren(fragment);
    const notes = [];
    if (result.simplified) notes.push('This large comparison uses a simplified diff: the changed middle section is shown as removed and added, and may include matching lines.');
    if (count > 3000) notes.push('Showing the first 3,000 rows. Copy or download includes the full comparison.');
    $('limit-note').textContent = notes.join(' ');
    $('limit-note').hidden = !notes.length;
  }
  function update() {
    clearTimeout(timer);
    for (const side of ['original', 'changed']) {
      const value = $(side).value;
      $(`${side}-count`).textContent = `${TextDiff.lines(value).length.toLocaleString()} lines · ${value.length.toLocaleString()} characters`;
    }
    if ($('original').value.length > MAX_SIZE || $('changed').value.length > MAX_SIZE) {
      result = { rows: [] };
      render();
      $('summary').textContent = 'Text exceeds the 2 MB limit';
      $('limit-note').textContent = 'Shorten each text to at most 2,097,152 characters to compare.';
      $('limit-note').hidden = false;
      $('copy-diff').disabled = $('download-diff').disabled = true;
      return;
    }
    result = TextDiff.compare($('original').value, $('changed').value, { whitespace: $('ignore-space').checked, case: $('ignore-case').checked });
    $('summary').textContent = !result.rows.length ? 'Ready to compare' : !result.added && !result.removed ? 'No differences found' : `${result.removed.toLocaleString()} removed · ${result.added.toLocaleString()} added`;
    $('copy-diff').disabled = $('download-diff').disabled = !result.rows.length;
    render();
  }
  for (const side of ['original', 'changed']) {
    $(side).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 180); });
    $(`${side}-file`).addEventListener('change', async event => { const file = event.target.files[0]; if (file) await openFile(file, side); event.target.value = ''; });
    const editor = $(side).closest('.editor');
    editor.addEventListener('dragover', event => { event.preventDefault(); editor.classList.add('dragging'); });
    editor.addEventListener('dragleave', event => { if (!editor.contains(event.relatedTarget)) editor.classList.remove('dragging'); });
    editor.addEventListener('drop', event => { event.preventDefault(); editor.classList.remove('dragging'); if (event.dataTransfer.files[0]) openFile(event.dataTransfer.files[0], side); });
  }
  async function openFile(file, side) {
    if (file.size > MAX_SIZE) { toast('Please choose a text file smaller than 2 MB.'); return; }
    if (/\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|gif|exe)$/i.test(file.name)) { toast('Export this document as plain text before comparing.'); return; }
    try {
      const text = await file.text();
      if (text.includes('\0')) { toast('This file appears to contain binary data. Please use plain text.'); return; }
      $(side).value = text;
      update();
      toast(`Opened ${file.name}`);
    } catch { toast('Could not read this file. Please try another file.'); }
  }
  document.querySelectorAll('.upload').forEach(button => button.addEventListener('click', () => $(`${button.dataset.for}-file`).click()));
  for (const id of ['ignore-space', 'ignore-case']) $(id).addEventListener('change', update);
  for (const [id, mode] of [['side-view', 'side'], ['unified-view', 'unified']]) $(id).addEventListener('click', () => {
    view = mode;
    for (const key of ['side-view', 'unified-view']) { const selected = key === id; $(key).classList.toggle('selected', selected); $(key).setAttribute('aria-pressed', String(selected)); }
    update();
  });
  $('swap').addEventListener('click', () => { const previous = $('original').value; $('original').value = $('changed').value; $('changed').value = previous; update(); });
  $('clear').addEventListener('click', () => { $('original').value = $('changed').value = ''; update(); $('original').focus(); });
  $('example').addEventListener('click', () => {
    $('original').value = 'A little tool for everyday work.\n\nCompare two versions of your text.\nFind the small details.\nKeep what matters.\n\nMade with care.';
    $('changed').value = 'A little tool for everyday work.\n\nCompare two versions of any text.\nFind every small detail.\nKeep what matters.\nShare what changed.\n\nMade with care.';
    update();
  });
  $('copy-diff').addEventListener('click', async () => {
    update();
    if ($('copy-diff').disabled) return;
    const value = TextDiff.unified(result.rows);
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const area = node('textarea', ''); area.value = value; area.style.cssText = 'position:fixed;opacity:0'; document.body.append(area); area.select();
        const success = document.execCommand('copy'); area.remove(); $('copy-diff').focus();
        if (!success) throw new Error('Clipboard unavailable');
      }
      toast('Diff copied to clipboard');
    } catch { toast('Could not access the clipboard. Use Download diff to save your comparison.'); }
  });
  $('download-diff').addEventListener('click', () => {
    update();
    if ($('download-diff').disabled) return;
    const url = URL.createObjectURL(new Blob([TextDiff.unified(result.rows)], { type: 'text/plain;charset=utf-8' }));
    const link = node('a', ''); link.href = url; link.download = 'text-diff.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Diff downloaded');
  });
  update();
})();
