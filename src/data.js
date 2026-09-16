export const columns = ['id', 'subject', 'product', 'priority', 'status', 'category', 'created_at', 'resolved_at'];
export const targets = { Critical: 4, High: 24, Normal: 72, Low: 120 };
export const hour = 3600000;
export function demoData(now = Date.now()) {
  return Array.from({ length: 120 }, (_, i) => {
    const created = now - ((i * 17) % 330 + 3) * hour;
    const closed = i % 5 < 3;
    const category = ['Access', 'Reporting', 'Configuration', 'Billing', 'Integrations'][i % 5];
    return { id: `SP-${1001 + i}`, subject: ['Unable to sign in', 'Report totals differ', 'Update workflow settings', 'Invoice question', 'Sync needs attention'][i % 5], product: ['Admissions', 'Student Management', 'Payments'][i % 3], priority: ['Normal', 'High', 'Low', 'Normal', 'Critical', 'Normal', 'High'][i % 7], status: closed ? 'Resolved' : i % 2 ? 'Open' : 'Pending', category, created_at: new Date(created).toISOString(), resolved_at: closed ? new Date(Math.min(now, created + (i % 36 + 1) * hour)).toISOString() : '' };
  });
}
export function validTarget(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.1 && value <= 8760;
}
export function metrics(rows, now = Date.now(), resolutionTargets = targets) {
  if (Object.keys(targets).some(priority => !validTarget(resolutionTargets?.[priority]))) {
    throw new Error('Each resolution target must be between 0.1 and 8760 hours.');
  }
  const open = rows.filter(r => r.status !== 'Resolved');
  const closed = rows.filter(r => r.status === 'Resolved');
  return { total: rows.length, open: open.length, overdue: open.filter(r => (now - Date.parse(r.created_at)) / hour > resolutionTargets[r.priority]).length, average: closed.length ? closed.reduce((sum, r) => sum + (Date.parse(r.resolved_at) - Date.parse(r.created_at)) / hour, 0) / closed.length : null, aging: [open.filter(r => now - Date.parse(r.created_at) < 24 * hour).length, open.filter(r => now - Date.parse(r.created_at) >= 24 * hour && now - Date.parse(r.created_at) < 72 * hour).length, open.filter(r => now - Date.parse(r.created_at) >= 72 * hour && now - Date.parse(r.created_at) < 168 * hour).length, open.filter(r => now - Date.parse(r.created_at) >= 168 * hour).length] };
}
export function parseCSV(text, now = Date.now()) {
  const rows = []; let row = [], value = '', quoted = false, afterQuote = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') { quoted = false; afterQuote = true; }
      else value += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(value); value = ''; afterQuote = false;
      if (c !== ',') { if (row.some(v => v.trim())) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"' && value === '' && !afterQuote) quoted = true;
    else { if (afterQuote || c === '"') throw new Error('Invalid CSV quoting. Use the sample CSV format.'); value += c; }
  }
  if (quoted) throw new Error('CSV has an unclosed quote.');
  row.push(value); if (row.some(v => v.trim())) rows.push(row);
  const headers = (rows.shift() || []).map(s => s.trim());
  if (columns.some(c => !headers.includes(c)) || new Set(headers).size !== headers.length) throw new Error('CSV headers must include: ' + columns.join(', '));
  if (!rows.length) throw new Error('The CSV has no tickets.');
  if (rows.length > 10000) throw new Error('Please import 10,000 tickets or fewer.');
  const ids = new Set();
  return rows.map((r, i) => {
    const fail = message => { throw new Error(`Ticket row ${i + 1}: ${message}`); };
    if (r.length !== headers.length) fail('column count does not match the header.');
    const ticket = Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
    if (columns.filter(c => c !== 'resolved_at').some(c => !ticket[c])) fail('a required field is blank.');
    if (ids.has(ticket.id)) fail('duplicate ticket ID.'); ids.add(ticket.id);
    if (!Object.hasOwn(targets, ticket.priority)) fail('priority must be Critical, High, Normal, or Low.');
    if (!['Open', 'Pending', 'Resolved'].includes(ticket.status)) fail('status must be Open, Pending, or Resolved.');
    for (const key of ['created_at', 'resolved_at']) {
      if (ticket[key] && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(ticket[key]) || !Number.isFinite(Date.parse(ticket[key])) || new Date(ticket[key]).toISOString().slice(0, 19) !== ticket[key].slice(0, 19) || Date.parse(ticket[key]) > now)) fail(`${key} must be a valid UTC timestamp no later than now, e.g. 2026-09-01T10:00:00Z.`);
    }
    if (ticket.status === 'Resolved' && (!ticket.resolved_at || Date.parse(ticket.resolved_at) < Date.parse(ticket.created_at))) fail('resolved tickets need a resolution date on or after creation.');
    if (ticket.status !== 'Resolved' && ticket.resolved_at) fail('unresolved tickets must have a blank resolved_at.');
    return ticket;
  });
}
export function toCSV(rows) {
  return columns.join(',') + '\r\n' + rows.map(r => columns.map(c => '"' + String(r[c]).replaceAll('"', '""') + '"').join(',')).join('\r\n');
}

