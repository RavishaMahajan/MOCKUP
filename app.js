
// Simple editable portal app (no frameworks). Data persisted in localStorage under 'mockup_boxes'.
// Features: create/edit/delete boxes, add/remove items, search, import/export JSON, simple ULID-like generator.

(function(){
  const STORAGE_KEY = 'mockup_boxes_v1';

  // Utility: small ULID-like id (timestamp + random)
// Not a full ULID implementation but readable and collision-resistant enough for demo.
  function makeULID(){
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Array.from({length:8}).map(()=>Math.floor(Math.random()*36).toString(36)).join('').toUpperCase();
    return (ts + rand).padEnd(26, '0');
  }

  // Default demo data (used only if no local data)
  const demo = [
    {
      ulid: "01FZ8Y0KX1A9Q7M8Z0P1A2B3",
      name: "Box A12",
      location: "Shelf 3 — Row B",
      items: [{id:1,name:"Item 1",qty:1},{id:2,name:"Item 2",qty:2}],,
      sensors: {temperature:22.5, humidity:45, weightKg:12.3},
      status: "OK",
      notes: "",
      updatedAt: new Date().toISOString()
    },
    {
      ulid: "01FZ8Y0KX1A9Q7M8Z0P1A9C7",
      name: "Box B03",
      location: "Pallet 7 — Zone C",
      items: [{id:1,name:"LED Panel",qty:10},{id:2,name:"Screws Pack",qty:50}],
      sensors: {temperature:28.0, humidity:55, weightKg:78.1},
      status: "ALERT",
      notes: "",
      updatedAt: new Date().toISOString()
    }
  ];

  // DOM refs
  const boxesList = document.getElementById('boxesList');
  const boxPanel = document.getElementById('boxPanel');
  const empty = document.getElementById('empty');
  const newBoxBtn = document.getElementById('newBoxBtn');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const searchInput = document.getElementById('search');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  // fields
  const boxName = document.getElementById('boxName');
  const boxUlid = document.getElementById('boxUlid');
  const boxLocation = document.getElementById('boxLocation');
  const boxNotes = document.getElementById('boxNotes');
  const sensorTemp = document.getElementById('sensorTemp');
  const sensorHum = document.getElementById('sensorHum');
  const sensorW = document.getElementById('sensorW');
  const itemsList = document.getElementById('itemsList');
  const newItemName = document.getElementById('newItemName');
  const newItemQty = document.getElementById('newItemQty');
  const addItemBtn = document.getElementById('addItemBtn');
  const lastUpdated = document.getElementById('lastUpdated');

  let boxes = loadBoxes();
  let selectedUlid = null;

  renderBoxes();

  // Event listeners
  newBoxBtn.addEventListener('click', ()=>{
    const ulid = makeULID();
    const box = {
      ulid, name: 'New Box', location:'', items:[], sensors:{temperature:20,humidity:50,weightKg:0}, notes:'', status:'OK', updatedAt:new Date().toISOString()
    };
    boxes.unshift(box);
    selectedUlid = ulid;
    saveBoxes();
    renderBoxes();
    openBox(box);
  });

  saveBtn.addEventListener('click', ()=>{
    if(!selectedUlid) return alert('Select a box first');
    const box = boxes.find(b=>b.ulid===selectedUlid);
    box.name = boxName.value.trim() || 'Untitled Box';
    box.location = boxLocation.value.trim();
    box.notes = boxNotes.value.trim();
    box.sensors.temperature = parseFloat(sensorTemp.value) || 0;
    box.sensors.humidity = parseFloat(sensorHum.value) || 0;
    box.sensors.weightKg = parseFloat(sensorW.value) || 0;
    box.updatedAt = new Date().toISOString();
    saveBoxes();
    renderBoxes();
    highlightSelected();
    alert('Saved ✅');
  });

  deleteBtn.addEventListener('click', ()=>{
    if(!selectedUlid) return;
    if(!confirm('Delete this box?')) return;
    boxes = boxes.filter(b=>b.ulid!==selectedUlid);
    selectedUlid = boxes.length? boxes[0].ulid : null;
    saveBoxes();
    renderBoxes();
    if(selectedUlid) openBox(boxes.find(b=>b.ulid===selectedUlid));
    else { boxPanel.classList.add('hidden'); empty.classList.remove('hidden'); }
  });

  clearAllBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all data from browser storage? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    boxes = [];
    selectedUlid = null;
    renderBoxes();
    boxPanel.classList.add('hidden');
    empty.classList.remove('hidden');
    alert('Cleared ✅');
  });

  addItemBtn.addEventListener('click', ()=>{
    if(!selectedUlid) return alert('Select a box first');
    const name = newItemName.value.trim();
    const qty = parseInt(newItemQty.value) || 1;
    if(!name) return alert('Item name required');
    const box = boxes.find(b=>b.ulid===selectedUlid);
    const nextId = box.items.length? Math.max(...box.items.map(it=>it.id))+1 : 1;
    box.items.push({id:nextId,name,qty});
    box.updatedAt = new Date().toISOString();
    newItemName.value=''; newItemQty.value=1;
    saveBoxes();
    renderBoxes();
    openBox(box);
  });

  searchInput.addEventListener('input', ()=> renderBoxes());

  exportBtn.addEventListener('click', ()=>{
    const dataStr = JSON.stringify(boxes, null, 2);
    const blob = new Blob([dataStr], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mockup_boxes_export.json'; a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(e){
      try{
        const imported = JSON.parse(e.target.result);
        if(!Array.isArray(imported)) throw 'Invalid format';
        // basic validation: items must have ulid
        imported.forEach(it=>{ if(!it.ulid) it.ulid = makeULID(); });
        boxes = imported.concat(boxes); // prepend imported
        saveBoxes();
        renderBoxes();
        alert('Import successful ✅');
      }catch(err){ alert('Failed to import: '+err); }
    };
    reader.readAsText(f);
    importFile.value='';
  });

  function openBox(box){
    if(!box) return;
    selectedUlid = box.ulid;
    boxPanel.classList.remove('hidden');
    empty.classList.add('hidden');
    boxName.value = box.name;
    boxUlid.textContent = box.ulid;
    boxLocation.value = box.location || '';
    boxNotes.value = box.notes || '';
    sensorTemp.value = box.sensors.temperature ?? 0;
    sensorHum.value = box.sensors.humidity ?? 0;
    sensorW.value = box.sensors.weightKg ?? 0;
    lastUpdated.textContent = 'Updated: ' + new Date(box.updatedAt).toLocaleString();
    renderItems(box);
    highlightSelected();
  }

  function renderBoxes(){
    const q = (searchInput.value||'').toLowerCase().trim();
    boxesList.innerHTML='';
    const filtered = boxes.filter(b=> b.ulid.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.location||'').toLowerCase().includes(q));
    filtered.forEach(b=>{
      const el = document.createElement('div');
      el.className = 'box-item' + (b.ulid===selectedUlid? ' active':'').trim();
      el.innerHTML = `<div><strong>${escapeHtml(b.name)}</strong><div class="box-meta">${escapeHtml(b.location||'—')} · ${b.items.reduce((s,it)=>s+it.qty,0)} items</div></div>
                      <div><small>${new Date(b.updatedAt).toLocaleString()}</small><div style="margin-top:6px;"><code style="font-size:11px">${b.ulid.slice(0,12)}...</code></div></div>`;
      el.addEventListener('click', ()=> openBox(b));
      boxesList.appendChild(el);
    });
    if(filtered.length===0) boxesList.innerHTML = '<div style="color:var(--muted);padding:12px">No boxes found</div>';
  }

  function renderItems(box){
    itemsList.innerHTML='';
    if(!box.items || box.items.length===0){ itemsList.innerHTML = '<div style="color:var(--muted)">No items</div>'; return; }
    box.items.forEach(it=>{
      const div = document.createElement('div'); div.className='items-list-item';
      div.innerHTML = `<div><strong>${escapeHtml(it.name)}</strong><small>ID: ${box.ulid}-${it.id}</small></div>
                       <div><input type="number" min="1" value="${it.qty}" style="width:64px;padding:6px;border-radius:6px;border:1px solid #e6e9ef" /> <button data-action="remove" style="margin-left:8px;padding:6px;border-radius:6px;border:0;background:#ef4444;color:white">Remove</button></div>`;
      const input = div.querySelector('input');
      const removeBtn = div.querySelector('button[data-action]');
      input.addEventListener('change', ()=>{
        const val = parseInt(input.value) || 1;
        it.qty = val;
        box.updatedAt = new Date().toISOString();
        saveBoxes();
        renderBoxes();
      });
      removeBtn.addEventListener('click', ()=>{
        if(!confirm('Remove this item?')) return;
        box.items = box.items.filter(x=>x.id!==it.id);
        box.updatedAt = new Date().toISOString();
        saveBoxes();
        renderBoxes();
        openBox(box);
      });
      itemsList.appendChild(div);
    });
  }

  function highlightSelected(){
    document.querySelectorAll('.box-item').forEach(el=> el.classList.remove('active'));
    const els = Array.from(document.querySelectorAll('.box-item'));
    const found = els.find(e=> e.innerHTML.includes(selectedUlid && selectedUlid.slice(0,6)));
    if(found) found.classList.add('active');
  }

  function saveBoxes(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
  }

  function loadBoxes(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(demo)); return JSON.parse(JSON.stringify(demo)); }
      return JSON.parse(raw);
    }catch(e){
      console.error('load error', e);
      return JSON.parse(JSON.stringify(demo));
    }
  }

  // small helper
  function escapeHtml(s){
    return String(s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
  }

  // Select first box if any
  if(boxes.length) { openBox(boxes[0]); selectedUlid = boxes[0].ulid; }

})();
