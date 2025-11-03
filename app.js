/* v3 app with Chart.js charts and SVG icons */
const LS_KEY = 'smartbox:v3:data';

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));

const boxList = $('#boxList');
const btnNew = $('#btnNew');
const btnExport = $('#btnExport');
const importFile = $('#importFile');
const searchInput = $('#search');
const emptyMessage = $('#emptyMessage');
const detailSection = $('#detail');
const modal = $('#modal');
const modalTitle = $('#modalTitle');
const boxForm = $('#boxForm');
const modalCancel = $('#modalCancel');
const btnSimulate = $('#btnSimulate');
const btnEdit = $('#btnEdit');
const btnDelete = $('#btnDelete');
const detailIcon = $('#detailIcon');
const detailSub = $('#detailSub');
const chartCanvas = document.getElementById('chartCanvas').getContext('2d');

let boxes = [];
let activeId = null;
let chart = null;

// sample boxes with history arrays (last 12)
const sample = [
  { ulid:'BOX-1001', name:'Cold Pack A', location:'Warehouse A', owner:'Team Alpha', notes:'Fragile', type:'temperature', battery:92, status:'Active', history: generateHistory() },
  { ulid:'BOX-1002', name:'Dry Goods', location:'Warehouse B', owner:'Team Beta', notes:'', type:'humidity', battery:78, status:'Idle', history: generateHistory() }
];

function generateHistory(){
  const h=[];
  for(let i=0;i<12;i++){
    h.push({ t: Date.now() - (11-i)*60000, temp: (Math.random()*10 + 15).toFixed(1), hum: Math.floor(Math.random()*60 + 20), battery: Math.floor(Math.random()*40 + 50) });
  }
  return h;
}

function load(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){ try{ boxes = JSON.parse(raw); }catch(e){ boxes = sample; } }
  else { boxes = sample; save(); }
  renderList();
}

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(boxes)); renderList(); }

function renderList(filter=''){
  boxList.innerHTML = '';
  const items = boxes.filter(b=>(`${b.ulid} ${b.name} ${b.location} ${b.owner}`).toLowerCase().includes(filter.toLowerCase()));
  if(items.length===0){ boxList.innerHTML = '<div class="card">No boxes found</div>'; showEmpty(); return; }
  items.forEach(b=>{
    const el = document.createElement('div');
    el.className = 'card-item';
    el.dataset.id = b.ulid;
    el.innerHTML = `
      <div class="meta">
        <div class="title">${escape(b.name)}</div>
        <div class="sub">${escape(b.ulid)} • ${escape(b.location)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end">
        <div class="badge">${escape(b.status)}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">${escape(b.type)}</div>
      </div>
    `;
    el.addEventListener('click', ()=>selectBox(b.ulid));
    boxList.appendChild(el);
  });
  if(activeId) selectBox(activeId);
}

function selectBox(id){
  const b = boxes.find(x=>x.ulid===id);
  if(!b){ activeId=null; showEmpty(); return; }
  activeId = id;
  emptyMessage.classList.add('hidden');
  detailSection.classList.remove('hidden');
  $('#detailName').textContent = b.name;
  $('#detailId').textContent = b.ulid;
  $('#detailLocation').textContent = b.location || '-';
  $('#detailOwner').textContent = b.owner || '-';
  $('#detailNotes').textContent = b.notes || '-';
  $('#detailTemp').textContent = lastValue(b.history, 'temp') ?? '-';
  $('#detailHum').textContent = lastValue(b.history, 'hum') ?? '-';
  $('#detailStatus').textContent = b.status || '-';
  $('#detailBattery').textContent = b.battery + '%';
  detailSub.textContent = b.ulid + ' • ' + b.location;
  renderIcon(b.type);
  renderChart(b.history);
  $$('.card-item').forEach(el=>el.classList.toggle('selected', el.dataset.id===id));
}

function showEmpty(){ detailSection.classList.add('hidden'); emptyMessage.classList.remove('hidden'); }

function openModal(mode='new', data=null){
  modal.classList.remove('hidden');
  modalTitle.textContent = mode==='edit' ? 'Edit Box' : 'New Box';
  const form = boxForm;
  form.ulid.value = data?.ulid ?? generateULID();
  form.name.value = data?.name ?? '';
  form.location.value = data?.location ?? '';
  form.owner.value = data?.owner ?? '';
  form.type.value = data?.type ?? 'storage';
  form.notes.value = data?.notes ?? '';
  form.ulid.disabled = mode==='edit';
  form.dataset.mode = mode;
}

function closeModal(){ modal.classList.add('hidden'); boxForm.dataset.mode=''; }

function generateULID(){ return 'BOX-' + Math.floor(Math.random()*9000 + 1000); }
function escape(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function lastValue(history, key){ if(!history || history.length===0) return null; return history[history.length-1][key]; }

boxForm.addEventListener('submit', e=>{
  e.preventDefault();
  const mode = boxForm.dataset.mode || 'new';
  const fd = new FormData(boxForm);
  const obj = {
    ulid: fd.get('ulid').trim(),
    name: fd.get('name').trim(),
    location: fd.get('location').trim(),
    owner: fd.get('owner').trim(),
    notes: fd.get('notes').trim(),
    type: fd.get('type'),
    battery: 100,
    status: 'Idle',
    history: []
  };
  if(mode==='new'){
    if(boxes.some(b=>b.ulid===obj.ulid)){ alert('ULID exists'); return; }
    // init history with some points
    obj.history = generateHistory();
    boxes.unshift(obj);
    save();
    closeModal();
    selectBox(obj.ulid);
  } else {
    const idx = boxes.findIndex(b=>b.ulid===obj.ulid);
    if(idx>-1){ boxes[idx] = {...boxes[idx], ...obj}; save(); closeModal(); selectBox(obj.ulid); }
  }
});

modalCancel.addEventListener('click', closeModal);
btnNew.addEventListener('click', ()=>openModal('new'));

// edit/delete
btnEdit.addEventListener('click', ()=>{ const b = boxes.find(x=>x.ulid===activeId); if(!b) return alert('Select a box'); openModal('edit', b); });
btnDelete.addEventListener('click', ()=>{ if(!activeId) return alert('Select a box'); if(!confirm('Delete this box?')) return; boxes = boxes.filter(b=>b.ulid!==activeId); save(); activeId=null; showEmpty(); });

// simulate reading adds a new random reading to history
btnSimulate.addEventListener('click', ()=>{
  if(!activeId) return alert('Select a box first');
  const b = boxes.find(x=>x.ulid===activeId);
  const point = { t: Date.now(), temp: (Math.random()*12 + 14).toFixed(1), hum: Math.floor(Math.random()*50 + 30), battery: Math.max(5, b.battery - Math.floor(Math.random()*6)) };
  b.history.push(point);
  if(b.history.length>24) b.history.shift();
  b.temp = point.temp;
  b.hum = point.hum;
  b.battery = point.battery;
  b.status = ['Active','Idle','Offline'][Math.floor(Math.random()*3)];
  save();
  selectBox(activeId);
});

// search & import/export
searchInput.addEventListener('input', e=>renderList(e.target.value));
btnExport.addEventListener('click', ()=>{ const data = JSON.stringify(boxes, null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='smartboxes_v3.json'; a.click(); URL.revokeObjectURL(a.href); });
importFile.addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const parsed=JSON.parse(r.result); if(!Array.isArray(parsed)) throw new Error('Expected array'); parsed.forEach(it=>{ if(!it.ulid) it.ulid = generateULID(); if(!it.history) it.history = []; }); boxes = parsed.concat(boxes); save(); alert('Imported '+parsed.length+' boxes'); }catch(err){ alert('Import failed: '+err.message); } }; r.readAsText(f); e.target.value=''; });

// icons renderer (simple svg)
function renderIcon(type){
  const map = {
    'storage': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="2" stroke="#2b9cff" stroke-width="1.5" fill="none"/><path d="M2 10h20" stroke="#4aa6ff" stroke-width="1.2"/></svg>`,
    'temperature': `🌡️`,
    'humidity': `💧`,
    'battery': `🔋`,
    'location': `📍`
  };
  detailIcon.innerHTML = map[type] || '📦';
}

// chart rendering using Chart.js
function renderChart(history){
  const labels = history.map(p=>new Date(p.t).toLocaleTimeString());
  const temps = history.map(p=>Number(p.temp));
  const hums = history.map(p=>Number(p.hum));
  const bats = history.map(p=>Number(p.battery));
  if(chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Temperature (°C)', data:temps, tension:0.3, fill:false, borderColor:'#ff7a45', pointRadius:3 },
        { label:'Humidity (%)', data:hums, tension:0.3, fill:false, borderColor:'#2b9cff', pointRadius:3 },
        { label:'Battery (%)', data:bats, tension:0.3, fill:false, borderColor:'#7cdb7c', pointRadius:3, yAxisID: 'y1' }
      ]
    },
    options: {
      maintainAspectRatio:false,
      scales: {
        y: { beginAtZero:false, position:'left' },
        y1: { beginAtZero:true, position:'right', grid: { drawOnChartArea:false } }
      },
      plugins: { legend: { display:false } }
    }
  });
}

// utility helpers
function loadDefaultsIfNeeded(){
  boxes.forEach(b=>{ if(!b.history) b.history = generateHistory(); if(!b.battery) b.battery = Math.floor(Math.random()*40 + 50); });
}

function generateHistory(){
  const h=[];
  for(let i=0;i<12;i++) h.push({ t: Date.now() - (11-i)*60000, temp:(Math.random()*10+15).toFixed(1), hum:Math.floor(Math.random()*60+20), battery:Math.floor(Math.random()*40+50) });
  return h;
}

// init
load();
loadDefaultsIfNeeded();

