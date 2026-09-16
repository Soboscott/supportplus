import { demoData, metrics, parseCSV, toCSV, targets, validTarget, filterExplorer } from './data.js';
const $ = id => document.getElementById(id);
let rows = demoData(), page = 0;
const size = 20;
let activeTargets = { ...targets };
function element(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
function products() { $('product').replaceChildren(new Option('All products', '')); [...new Set(rows.map(r => r.product))].sort().forEach(p => $('product').add(new Option(p, p))); }
function reset() { ['product', 'priority', 'from', 'to', 'search'].forEach(id => $(id).value = ''); $('overdue-only').checked = false; page = 0; }
function bars(id, pairs) {
  const root = $(id); root.replaceChildren();
  if (!pairs.length) { root.append(element('p', 'No tickets match these filters.', 'empty')); return; }
  const max = Math.max(...pairs.map(p => p[1]), 1);
  pairs.forEach(([label, n]) => { const row = element('div', undefined, 'bar-row'); row.append(element('span', label)); const track = element('div', undefined, 'track'); const fill = element('div', undefined, 'fill'); fill.style.width = `${n / max * 100}%`; track.append(fill); row.append(track, element('strong', n)); root.append(row); });
}
function grouped(data, key) { const groups = new Map(); data.forEach(r => { const k = key(r); groups.set(k, (groups.get(k) || 0) + 1); }); return [...groups]; }
function render() {
  const invalidRange = $('from').value && $('to').value && $('from').value > $('to').value;
  $('to').setCustomValidity(invalidRange ? 'End date must be on or after start date.' : '');
  if (invalidRange) { $('message').textContent = 'Choose an end date on or after the start date.'; $('message').dataset.range = 'true'; }
  else if ($('message').dataset.range) { $('message').textContent = ''; delete $('message').dataset.range; }
  const data = rows.filter(r => !invalidRange && (!$('product').value || r.product === $('product').value) && (!$('priority').value || r.priority === $('priority').value) && (!$('from').value || r.created_at.slice(0, 10) >= $('from').value) && (!$('to').value || r.created_at.slice(0, 10) <= $('to').value));
  const now = Date.now();
  const m = metrics(data, now, activeTargets);
  $('metrics').replaceChildren();
  [['Tickets in selection', m.total, 'Filtered by creation date'], ['Open backlog', m.open, 'Open and pending tickets'], ['Overdue tickets', m.overdue, 'Unresolved, past selected target'], ['Avg. resolution', m.average === null ? '—' : `${m.average.toFixed(1)}h`, 'Resolved tickets in selection']].forEach(([label, value, hint], i) => { const card = element('article', undefined, 'metric' + (i === 2 ? ' warning' : '')); card.append(element('p', label), element('strong', value), element('small', hint)); $('metrics').append(card); });
  bars('volume', grouped(data, r => r.created_at.slice(0, 10)).sort((a, b) => a[0].localeCompare(b[0])));
  bars('categories', grouped(data, r => r.category).sort((a, b) => b[1] - a[1]));
  $('aging').replaceChildren(); m.aging.forEach((n, i) => { const card = element('div'); card.append(element('strong', n), element('span', ['Under 1 day', '1–3 days', '3–7 days', '7+ days'][i])); $('aging').append(card); });
  const query = $('search').value.toLowerCase();
  const overdueOnly = $('overdue-only').checked;
  const visible = filterExplorer(data, query, overdueOnly, now, activeTargets);
  page = Math.min(page, Math.max(0, Math.ceil(visible.length / size) - 1));
  $('count').textContent = `${visible.length} ${overdueOnly ? 'overdue tickets' : 'tickets'} • Search and Overdue only apply to this table only`;
  $('tickets').replaceChildren();
  visible.slice(page * size, (page + 1) * size).forEach(r => {
    const tr = element('tr'), subject = element('td'); subject.append(element('strong', r.id), element('span', r.subject)); tr.append(subject, element('td', r.product));
    const priority = element('td'); priority.append(element('span', r.priority, 'badge ' + r.priority.toLowerCase())); tr.append(priority, element('td', r.status), element('td', r.created_at.slice(0, 10))); $('tickets').append(tr);
  });
  if (!visible.length) { const tr = element('tr'), td = element('td', overdueOnly ? 'No overdue tickets match. Adjust your search, filters, or targets, or turn off Overdue only.' : 'No tickets match. Try resetting your filters.', 'empty'); td.colSpan = 5; tr.append(td); $('tickets').append(tr); }
  $('page').textContent = `Page ${page + 1} of ${Math.max(1, Math.ceil(visible.length / size))}`;
  $('prev').disabled = page === 0; $('next').disabled = (page + 1) * size >= visible.length;
}
['product', 'priority', 'from', 'to', 'search'].forEach(id => $(id).addEventListener('input', () => { page = 0; render(); }));
$('reset').onclick = () => { reset(); render(); };
$('prev').onclick = () => { page--; render(); }; $('next').onclick = () => { page++; render(); };
$('demo').onclick = () => { rows = demoData(); products(); reset(); $('source').textContent = 'Fictional demo data'; $('message').textContent = 'Demo data loaded.'; render(); };
$('upload').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Please select a CSV smaller than 5 MB.');
    const imported = parseCSV(await file.text()); rows = imported; products(); reset(); $('source').textContent = `Imported: ${file.name}`; $('message').textContent = `${rows.length} tickets imported successfully.`; render();
  } catch (error) { $('message').textContent = error.message + ' Your previous data is unchanged.'; }
  finally { event.target.value = ''; }
};
$('template').onclick = () => { const url = URL.createObjectURL(new Blob([toCSV(demoData())], { type: 'text/csv;charset=utf-8' })); const a = element('a'); a.href = url; a.download = 'supportpulse-sample.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
function setupTargets() {
  const panel = element('section', undefined, 'panel target-panel');
  panel.setAttribute('aria-labelledby', 'targets-title');
  const heading = element('h2', 'Resolution targets');
  heading.id = 'targets-title';
  const description = element('p', 'Edit elapsed hours by priority to recalculate overdue tickets. These are not business-hour SLAs. Refreshing restores defaults.');
  description.id = 'targets-help';
  const controls = element('div', undefined, 'target-controls');
  const status = element('p');
  status.id = 'targets-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const inputs = new Map();
  const updateStatus = () => {
    const invalid = [...inputs].filter(([, input]) => input.getAttribute('aria-invalid') === 'true').map(([priority]) => priority);
    status.textContent = invalid.length
      ? `Enter 0.1–8,760 hours for ${invalid.join(', ')}. Their last valid targets remain in use.`
      : 'Targets applied. Overdue tickets reflect your current filters.';
    status.className = invalid.length ? 'target-error' : '';
  };
  Object.entries(targets).forEach(([priority, hours]) => {
    const label = element('label', priority + ' (hours)');
    const input = element('input');
    input.id = 'target-' + priority.toLowerCase();
    input.type = 'number'; input.min = '0.1'; input.max = '8760'; input.step = 'any';
    input.required = true; input.value = hours;
    input.setAttribute('aria-describedby', 'targets-help targets-status');
    inputs.set(priority, input);
    input.addEventListener('input', () => {
      const valid = validTarget(input.valueAsNumber);
      input.setAttribute('aria-invalid', String(!valid));
      if (valid) {
        activeTargets = { ...activeTargets, [priority]: input.valueAsNumber };
        render();
      }
      updateStatus();
    });
    label.append(input);
    controls.append(label);
  });
  const resetButton = element('button', 'Reset targets');
  resetButton.type = 'button'; resetButton.id = 'reset-targets';
  resetButton.onclick = () => {
    activeTargets = { ...targets };
    inputs.forEach((input, priority) => {
      input.value = targets[priority]; input.setAttribute('aria-invalid', 'false');
    });
    render(); updateStatus();
    status.textContent = 'Default targets restored: Critical 4h, High 24h, Normal 72h, Low 120h.';
  };
  controls.append(resetButton);
  panel.append(heading, description, controls, status);
  $('metrics').before(panel);
  document.querySelector('footer').textContent = 'CSV files are processed in your browser and are not uploaded. Refreshing restores demo data and default resolution targets. Overdue tickets use the selected elapsed-hour targets above; these are not business-hour SLAs.';
}
function setupExplorerFilter() {
  const searchLabel = $('search').closest('label');
  const controls = element('div', undefined, 'explorer-controls');
  searchLabel.before(controls);
  const label = element('label', undefined, 'overdue-toggle');
  const input = element('input');
  input.type = 'checkbox'; input.id = 'overdue-only';
  input.setAttribute('aria-controls', 'tickets');
  input.setAttribute('aria-describedby', 'count');
  input.addEventListener('change', () => { page = 0; render(); });
  label.append(input, element('span', 'Overdue only'));
  controls.append(searchLabel, label);
  $('count').setAttribute('role', 'status');
  $('count').setAttribute('aria-live', 'polite');
}
setupExplorerFilter();
setupTargets();
products(); render();


