// SmartBoxPortal v8 - final build
const LS_KEY = 'smartbox:v8';
const boxesEl = document.getElementById('boxes');
const addBoxBtn = document.getElementById('addBoxBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const boxForm = document.getElementById('boxForm');
const cancelBtn = document.getElementById('cancelBtn');
const itemsList = document.getElementById('itemsList');
const addItemBtn = document.getElementById('addItemBtn');
const itemName = document.getElementById('itemName');
const itemQty = document.getElementById('itemQty');
const itemDesc = document.getElementById('itemDesc');
const itemImage = document.getElementById('itemImage');
const itemModal = document.getElementById('itemModal');
const itemModalClose = document.getElementById('itemModalClose');
const itemForm = document.getElementById('itemForm');
const itemCancel = document.getElementById('itemCancel');
const toast = document.getElementById('toast');

let boxes = [];
let editingId = null;
let currentItems = []; // for form
let currentBoxIdForItem = null;

// default sample box with one sample item (includes thumb.svg as image reference)
const defaultBox = {
  id: 'BX001',
  icon: '📦',
  name: 'Box 1',
  location: 'Warehouse A',
  status: 'Active',
  temp: 27,
  hum: 68,
  battery: 85,
  notes: '',
  items: [
    { id: 'itm1', name: 'Sample Sensor', qty: 2, desc: 'Test item for demo', cat: 'Electronics', date: new Date().toISOString().slice(0,10), img: 'thumb.svg' }
  ]
};

function load(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try{ boxes = JSON.parse(raw); }catch(e){ boxes = [defaultBox]; }
  } else {
    boxes = [defaultBox];
    save();
  }
  render();
}

function save(){
  localStorage.setItem(LS_KEY, JSON.stringify(boxes));
  render();
  showToast('✅ Saved successfully!');
}

function render(){
  boxesEl.innerHTML = '';
  if(boxes.length===0){
    boxesEl.innerHTML = '<div class="empty-note">No boxes yet — click Add Box</div>';
    return;
  }
  boxes.forEach(b=>{
    const card = document.createElement('div');
    card.className = 'box-card';
    card.innerHTML = `
      <div class="box-actions">
        <button class="icon-btn edit" title="Edit">✏️</button>
        <button class="icon-btn del" title="Delete">🗑️</button>
      </div>
      <div class="box-top"><div class="box-icon">${escapeHtml(b.icon)}</div><div class="box-id">${escapeHtml(b.id)}</div></div>
      <div class="box-title">${escapeHtml(b.name)}</div>
      <div class="box-row"><div>Status</div><div>${escapeHtml(b.status)}</div></div>
      <div class="box-row"><div>Temperature</div><div>${escapeHtml(b.temp)}°C</div></div>
      <div class="box-row"><div>Humidity</div><div>${escapeHtml(b.hum)}%</div></div>
      <div class="box-row"><div>Battery</div><div>${escapeHtml(b.battery)}%</div></div>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:space-between">
        <button class="btn add-item">+ Add Item</button>
        <button class="btn small view-items">View Items</button>
      </div>
    `;
    // edit
    card.querySelector('.edit').addEventListener('click', ()=>openEdit(b.id));
    // delete
    card.querySelector('.del').addEventListener('click', ()=>{ if(confirm('Delete this box?')){ boxes = boxes.filter(x=>x.id!==b.id); save(); } });
    // add item
    card.querySelector('.add-item').addEventListener('click', ()=>openItemModalForBox(b.id));
    // view items
    card.querySelector('.view-items').addEventListener('click', ()=>openEdit(b.id));
    boxesEl.appendChild(card);
  });
}

// open modal for editing box
function openEdit(id){
  const b = boxes.find(x=>x.id===id);
  if(!b) return;
  editingId = id;
  modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'Edit Box';
  fillForm(b);
  renderItems(b.items || []);
}

// open new box
function openNew(){
  editingId = null;
  modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'Add New Box';
  boxForm.reset();
  boxForm.id.disabled = false;
  boxForm.id.value = generateId();
  itemsList.innerHTML = '';
}

// fill form with box data
function fillForm(b){
  boxForm.id.value = b.id;
  boxForm.icon.value = b.icon || '📦';
  boxForm.name.value = b.name || '';
  boxForm.location.value = b.location || '';
  boxForm.status.value = b.status || 'Active';
  boxForm.temp.value = b.temp ?? '';
  boxForm.hum.value = b.hum ?? '';
  boxForm.battery.value = b.battery ?? '';
  boxForm.notes.value = b.notes || '';
  boxForm.id.disabled = true;
  currentItems = JSON.parse(JSON.stringify(b.items || []));
  renderItems(currentItems);
}

// items UI
function renderItems(items){
  itemsList.innerHTML = '';
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <img src="${it.img || 'thumb.svg'}" class="item-thumb" alt="thumb">
      <div class="item-meta"><div class="name">${escapeHtml(it.name)}</div><div class="sub">Qty: ${escapeHtml(it.qty)} • ${escapeHtml(it.cat||'')} • ${escapeHtml(it.date||'')}</div></div>
      <div class="item-actions"><button class="edit-item" data-id="${it.id}" title="Edit">✏️</button><button class="del-item" data-id="${it.id}" title="Delete">🗑️</button></div>
    `;
    row.querySelector('.del-item').addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.id;
      currentItems = currentItems.filter(x=>x.id!==id);
      renderItems(currentItems);
    });
    row.querySelector('.edit-item').addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.id;
      const found = currentItems.find(x=>x.id===id);
      if(found) openItemModal(found, true);
    });
    itemsList.appendChild(row);
  });
}

// open item modal to add item for a specific box
function openItemModalForBox(boxId){
  currentBoxIdForItem = boxId;
  openItemModal(null, false);
}

// open item modal, optionally with existing item
function openItemModal(item, isEdit){
  itemModal.classList.remove('hidden');
  document.getElementById('itemModalTitle').textContent = isEdit ? 'Edit Item' : 'Add Item';
  if(item){
    itemForm.iname.value = item.name;
    itemForm.iqty.value = item.qty;
    itemForm.idesc.value = item.desc;
    itemForm.icat.value = item.cat || '';
    itemForm.idate.value = item.date || '';
    // image not loaded into file input (skip)
    itemForm.dataset.editId = item.id;
  } else {
    itemForm.reset();
    itemForm.dataset.editId = '';
    itemForm.idate.value = new Date().toISOString().slice(0,10);
  }
}

// handle add item button inside box form (adds to currentItems array)
addItemBtn.addEventListener('click', ()=>{
  const name = itemName.value.trim();
  if(!name){ alert('Enter item name'); return; }
  const qty = Number(itemQty.value) || 0;
  const desc = itemDesc.value.trim();
  const newItem = { id: 'itm' + Date.now(), name, qty, desc, cat: '', date: new Date().toISOString().slice(0,10), img: 'thumb.svg' };
  currentItems.push(newItem);
  renderItems(currentItems);
  itemName.value=''; itemQty.value=''; itemDesc.value='';
});

// item form submit (for separate item modal)
itemForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(itemForm);
  const obj = {
    id: itemForm.dataset.editId || 'itm' + Date.now(),
    name: fd.get('iname').trim(),
    qty: Number(fd.get('iqty')) || 0,
    desc: fd.get('idesc').trim(),
    cat: fd.get('icat').trim(),
    date: fd.get('idate') || new Date().toISOString().slice(0,10),
    img: ''
  };
  const file = itemForm.iimage.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      obj.img = reader.result;
      finishItemSave(obj);
    };
    reader.readAsDataURL(file);
  } else {
    obj.img = 'thumb.svg';
    finishItemSave(obj);
  }
});

function finishItemSave(obj){
  if(itemForm.dataset.editId){
    // update existing in currentItems
    currentItems = currentItems.map(x=> x.id===obj.id ? obj : x);
  } else {
    currentItems.push(obj);
  }
  renderItems(currentItems);
  closeItemModal();
}

// save box form submit
boxForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(boxForm);
  const obj = {
    id: fd.get('id').trim(),
    icon: fd.get('icon'),
    name: fd.get('name').trim(),
    location: fd.get('location').trim(),
    status: fd.get('status'),
    temp: Number(fd.get('temp')) || 0,
    hum: Number(fd.get('hum')) || 0,
    battery: Number(fd.get('battery')) || 0,
    notes: fd.get('notes').trim(),
    items: currentItems
  };
  if(editingId){
    const idx = boxes.findIndex(x=>x.id===editingId);
    if(idx>-1){ boxes[idx] = obj; save(); closeModal(); return; }
  } else {
    if(boxes.some(x=>x.id===obj.id)){ alert('Box ID exists'); return; }
    boxes.unshift(obj);
    save();
    closeModal();
  }
});

function closeModal(){
  modal.classList.add('hidden');
  editingId = null;
  currentItems = [];
  itemsList.innerHTML = '';
}

// item modal helpers
itemCancel.addEventListener('click', closeItemModal);
itemModalClose.addEventListener('click', closeItemModal);
function closeItemModal(){
  itemModal.classList.add('hidden');
  itemForm.dataset.editId = '';
  itemForm.reset();
}

// open new box
addBoxBtn.addEventListener('click', openNew);
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); if(e.target===itemModal) closeItemModal(); });

function generateId(){ return 'BX' + Math.floor(Math.random()*9000+1000); }

// export/import
exportBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(boxes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'smartboxes_v8.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const parsed = JSON.parse(r.result);
      if(!Array.isArray(parsed)) throw new Error('Expected array of boxes');
      parsed.forEach(p=>{ if(!p.items) p.items = []; });
      boxes = parsed.concat(boxes);
      save();
      alert('✅ Data imported successfully');
    }catch(err){ alert('Import failed: ' + err.message); }
  };
  r.readAsText(f);
  e.target.value='';
});

function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function showToast(msg){
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(()=> toast.classList.add('hidden'), 2000);
}

// welcome stays but app appears after 1s
setTimeout(()=>{
  document.getElementById('app').classList.remove('hidden');
}, 1000);

// init
load();