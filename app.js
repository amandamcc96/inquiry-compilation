// app.js

const API = 'http://localhost:4000/api/systems';
const UPDATE_API = 'http://localhost:4000/api/system-field';

let systems = [];
let selectedSystem = null;

const listEl = document.getElementById('list');
const detailsEl = document.getElementById('details');
const searchEl = document.getElementById('search');

async function loadSystems() {
  const res = await fetch(API);
  systems = await res.json();
  renderList(systems);
  if (selectedSystem) {
    const updated = systems.find(
      (s) => s.sheet === selectedSystem.sheet && s._rowIndex === selectedSystem._rowIndex
    );
    if (updated) {
      selectedSystem = updated;
      showDetails(selectedSystem);
      highlightSelected();
    }
  }
}

loadSystems();

searchEl.oninput = () => {
  const q = searchEl.value.toLowerCase();
  const filtered = systems.filter((s) =>
    getSystemName(s).toLowerCase().includes(q)
  );
  renderList(filtered);
};

function getSystemName(system) {
  return (
    system['ERP'] ||
    system['CRM'] ||
    system['Other System'] ||
    system['Software'] ||
    '(no name)'
  );
}

function renderList(items) {
  listEl.innerHTML = '';
  items.forEach((system) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.sheet = system.sheet;
    item.dataset.rowIndex = system._rowIndex;

    const title = document.createElement('div');
    title.className = 'list-item-title';
    title.textContent = getSystemName(system);

    const subtitle = document.createElement('div');
    subtitle.className = 'list-item-subtitle';
    subtitle.textContent = `Type: ${system.sheet}`;

    item.appendChild(title);
    item.appendChild(subtitle);

    item.onclick = () => {
      selectedSystem = system;
      showDetails(system);
      highlightSelected();
    };

    listEl.appendChild(item);
  });
}

function highlightSelected() {
  const items = listEl.querySelectorAll('.list-item');
  items.forEach((item) => {
    const sheet = item.dataset.sheet;
    const rowIndex = Number(item.dataset.rowIndex);
    if (
      selectedSystem &&
      sheet === selectedSystem.sheet &&
      rowIndex === selectedSystem._rowIndex
    ) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function showDetails(system) {
  detailsEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'details-header';

  const title = document.createElement('div');
  title.className = 'details-title';
  title.textContent = getSystemName(system);

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = system.sheet;

  header.appendChild(title);
  header.appendChild(badge);
  detailsEl.appendChild(header);

  // Research doc button from Information column
  const info = (system['Information'] || '').trim();
  if (info && (info.startsWith('http://') || info.startsWith('https://'))) {
    const btn = document.createElement('button');
    btn.className = 'research-btn';
    btn.textContent = 'Open Research Google Doc';
    btn.onclick = () => window.open(info, '_blank', 'noopener,noreferrer');
    detailsEl.appendChild(btn);
  }

  // Render fields
  for (const key in system) {
    if (['id', 'sheet', '_rowIndex'].includes(key)) continue;

    const row = document.createElement('div');
    row.className = 'field-row';

    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = key;
    row.appendChild(label);

    const valueWrapper = document.createElement('div');
    valueWrapper.className = 'field-value';

    if (key === 'Scope') {
      // Editable field
      const valueText = document.createElement('div');
      valueText.textContent = system[key] || '-';
      valueWrapper.appendChild(valueText);

      const actions = document.createElement('div');
      actions.className = 'field-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => startEditingScope(system, row, key);
      actions.appendChild(editBtn);

      row.appendChild(valueWrapper);
      row.appendChild(actions);
    } else {
      // Non-editable: show as read-only dropdown
      valueWrapper.classList.add('readonly-select');
      const select = document.createElement('select');
      const opt = document.createElement('option');
      opt.textContent = system[key] || '-';
      opt.value = system[key] || '';
      select.appendChild(opt);
      select.disabled = true;
      valueWrapper.appendChild(select);
      row.appendChild(valueWrapper);
    }

    detailsEl.appendChild(row);
  }
}

function startEditingScope(system, row, columnName) {
  row.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = columnName;
  row.appendChild(label);

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'field-value field-edit-input';

  const textarea = document.createElement('textarea');
  textarea.value = system[columnName] || '';
  inputWrapper.appendChild(textarea);
  row.appendChild(inputWrapper);

  const actions = document.createElement('div');
  actions.className = 'field-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-save';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = async () => {
    await saveScope(system, columnName, textarea.value);
  };
  actions.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => showDetails(system);
  actions.appendChild(cancelBtn);

  row.appendChild(actions);
}

async function saveScope(system, columnName, newValue) {
  const payload = {
    sheet: system.sheet,
    rowIndex: system._rowIndex,
    columnName: columnName,
    value: newValue,
  };

  const res = await fetch(UPDATE_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    alert('Failed to update Scope. ' + errorText);
    return;
  }

  await loadSystems();
}
