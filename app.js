// === Dola Visual Editor — Bersyon 0.4 (Safe Selection: Hindi Agad Tumatakbo ang Function) ===

const codeInput = document.getElementById('codeInput');
const previewFrame = document.getElementById('previewFrame');
const propContent = document.getElementById('propContent');

// Mga pindutan
document.getElementById('btnNew').onclick = bagongProyekto;
document.getElementById('btnSave').onclick = iSave;
document.getElementById('btnExport').onclick = iDownload;

// Estado
let selectedElement = null;
let ignoreCodeChange = false;
let isDragging = false;
let isResizing = false;
let dragOffset = { x:0, y:0 };
let resizeDir = '';
let startRect = null;
let resizeHandles = {};
let originalPositions = new WeakMap();

// ✅ BAGONG KATANGIAN: Ipagana o hindi ang orihinal na aksyon
let actionsEnabled = false; // NAKA-OFF muna bilang default

// Halimbawang pagsisimula — may mga pindutan na may aksyon
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Safe Selection Editor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: sans-serif; 
      padding: 30px; 
      min-height: 150vh;
      background: linear-gradient(to bottom, #f5f5f5, #e8e8e8);
    }
    h1 { 
      color: #2d2d2d; 
      margin-bottom: 20px; 
      padding: 10px;
      background: white;
      border-radius: 6px;
      display: inline-block;
    }
    p { color: #555; margin: 15px 0; line-height: 1.6; }
    
    .kahon {
      background: #4ecdc4;
      padding: 20px;
      border-radius: 8px;
      color: white;
      margin: 10px 0;
    }
    .pindutan {
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 5px;
      font-size: 15px;
    }
    .pindutan:hover { opacity: 0.9; }
    
    .card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    a { color: #4ecdc4; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
    
    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 15px 0;
      color: #856404;
    }
  </style>
</head>
<body>
  <h1>✅ Ligtas na Pagpili — Hindi Agad Tumatakbo!</h1>
  
  <p class="note">
    Sa preview, kapag pinindot mo ang pindutan o link — <strong>pipiliin muna ito</strong>, hindi agad pupunta sa ibang pahina o tatakbo ang code.
  </p>

  <div class="kahon" id="unangKahon">
    Kahon — hilahin ako sa kahit saan!
  </div>

  <!-- Pindutan na may JavaScript -->
  <button class="pindutan" onclick="alert('Tumakbo ang orihinal na function! ✅')">
    Pindutan — may nakakabit na function
  </button>

  <!-- Link na pupunta sa ibang pahina -->
  <a href="#ibang-bahagi" class="pindutan">Link — ibang bahagi ng pahina</a>
  
  <a href="https://example.com" target="_blank" class="pindutan">Panlabas na Link</a>

  <div class="card" id="ibang-bahagi">
    <h3>Isa pang Bahagi</h3>
    <p>Ito ang nilalaman. Lahat ng nakikita mo ay pwedeng ilipat at baguhin ang laki.</p>
    <button class="pindutan" onclick="document.body.style.background='#e3f2fd'">
      Baguhin ang Kulay
    </button>
  </div>

</body>
</html>`;

// Simula
window.onload = () => {
  iLoadNakaimbak();
  iRefreshPreview();
  codeInput.addEventListener('input', iPreviewMulaSaCode);
};

// --- Lumikha ng Preview mula sa Code ---
function iRefreshPreview() {
  const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  doc.open();
  doc.write(codeInput.value);
  doc.close();
  
  doc.body.style.position = 'relative';
  doc.body.style.minHeight = '150vh';
  
  setTimeout(() => {
    iIkabitPreviewEvents(doc);
    iIpaganaOIpigilanAksyon(doc); // ✅ Ipigilan o ipagana ang mga aksyon
  }, 20);
}

// --- ✅ PIGILAN ANG MGA AKSYON HABANG NAG-EEDIT ---
function iIpaganaOIpigilanAksyon(doc) {
  const interactiveElements = doc.querySelectorAll('a, button, [onclick], input, select, form');
  
  interactiveElements.forEach(el => {
    // Alisin ang dating listener para hindi dumami
    if (el._editorHandler) {
      el.removeEventListener('click', el._editorHandler, true);
    }
    
    el._editorHandler = function(e) {
      // Kung NAKA-OFF ang aksyon → pigilan at piliin lang ang elemento
      if (!actionsEnabled) {
        e.preventDefault();
        e.stopPropagation();
        iPiliElement(el);
        return false;
      }
      // Kung NAKA-ON → hayaan ang orihinal na kilos
    };
    
    // Gamitin ang capture phase para maunahan ang orihinal na handler
    el.addEventListener('click', el._editorHandler, true);
  });
}

// --- IKABIT SA LAHAT NG ELEMENTO ---
function iIkabitPreviewEvents(doc) {
  selectedElement = null;
  iAlisinResizeHandles();

  const allElements = doc.querySelectorAll('*');
  
  allElements.forEach(el => {
    if (['STYLE','SCRIPT','META','HEAD','TITLE','IFRAME'].includes(el.tagName)) return;
    
    el.classList.remove('selectable-element', 'selected-element');
    el.classList.add('selectable-element');
    
    el.onmousedown = (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      
      // Kung may nakapiling na at nag-click sa pareho → huwag pigilan
      if (selectedElement === el && actionsEnabled) {
        // Hayaan ang orihinal na kilos kung naka-enable
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      iPiliElement(el);
      
      // Awtomatikong gawing absolute kung kailangan
      const currPos = getComputedStyle(el).position;
      if (currPos !== 'absolute' && currPos !== 'fixed') {
        iGawingAbsolute(el);
      }
      
      isDragging = true;
      const rect = el.getBoundingClientRect();
      const frameRect = previewFrame.getBoundingClientRect();
      
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      startRect = { width: rect.width, height: rect.height };
    };
  });

  doc.addEventListener('mousemove', iHawakanMouseMove);
  doc.addEventListener('mouseup', iTaposMouse);
  doc.addEventListener('mouseleave', iTaposMouse);
}

// --- I-convert sa Absolute ---
function iGawingAbsolute(el) {
  const rect = el.getBoundingClientRect();
  const parent = el.parentElement;
  const parentRect = parent.getBoundingClientRect();
  
  const origTop = rect.top - parentRect.top - parseFloat(getComputedStyle(parent).paddingTop || 0);
  const origLeft = rect.left - parentRect.left - parseFloat(getComputedStyle(parent).paddingLeft || 0);
  
  originalPositions.set(el, { top: origTop, left: origLeft });
  
  el.style.position = 'absolute';
  el.style.top = `${origTop}px`;
  el.style.left = `${origLeft}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.margin = '0';
}

// --- Piliin ang Elemento ---
function iPiliElement(el) {
  if (selectedElement) {
    selectedElement.classList.remove('selected-element');
    iAlisinResizeHandles();
  }
  
  selectedElement = el;
  el.classList.add('selected-element');
  
  const pos = getComputedStyle(el).position;
  if (pos === 'static' || pos === 'relative') {
    el.style.position = 'relative';
  }
  
  iLikhaResizeHandles(el);
  iUpdatePropertyPanel(el);
  iHanapinAtIhighlightSaCode(el);
}

// --- Resize Handles ---
function iLikhaResizeHandles(el) {
  const doc = previewFrame.contentDocument;
  const positions = ['top','bottom','left','right','top-left','top-right','bottom-left','bottom-right'];
  
  positions.forEach(pos => {
    if (resizeHandles[pos]) resizeHandles[pos].remove();
    
    const handle = doc.createElement('div');
    handle.className = `resize-handle ${pos}`;
    handle.style.cssText = `
      position: absolute;
      width: 10px; height: 10px;
      background: #ff6b6b;
      border: 2px solid white;
      border-radius: 50%;
      z-index: 99999;
      pointer-events: auto;
      cursor: ${pos.includes('top')?'n':pos.includes('bottom')?'s':''}${pos.includes('left')?'w':pos.includes('right')?'e':''}-resize;
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    `;
    handle.dataset.dir = pos;
    
    handle.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'absolute';
        const rect = el.getBoundingClientRect();
        el.style.top = `${rect.top - el.parentElement.getBoundingClientRect().top}px`;
        el.style.left = `${rect.left - el.parentElement.getBoundingClientRect().left}px`;
      }
      
      isResizing = true;
      resizeDir = pos;
      startRect = el.getBoundingClientRect();
      startRect.clientX = e.clientX;
      startRect.clientY = e.clientY;
    };
    
    resizeHandles[pos] = handle;
    el.appendChild(handle);
  });
  
  iAyusinHandlePosisyon(el);
}

function iAyusinHandlePosisyon(el) {
  if (!selectedElement) return;
  
  const setPos = (handle, top, left) => {
    if (handle) { handle.style.top = top; handle.style.left = left; }
  };
  
  setPos(resizeHandles['top'], '-5px', 'calc(50% - 5px)');
  setPos(resizeHandles['bottom'], 'calc(100% - 5px)', 'calc(50% - 5px)');
  setPos(resizeHandles['left'], 'calc(50% - 5px)', '-5px');
  setPos(resizeHandles['right'], 'calc(50% - 5px)', 'calc(100% - 5px)');
  setPos(resizeHandles['top-left'], '-5px', '-5px');
  setPos(resizeHandles['top-right'], '-5px', 'calc(100% - 5px)');
  setPos(resizeHandles['bottom-left'], 'calc(100% - 5px)', '-5px');
  setPos(resizeHandles['bottom-right'], 'calc(100% - 5px)', 'calc(100% - 5px)');
}

function iAlisinResizeHandles() {
  Object.values(resizeHandles).forEach(h => h?.remove());
  resizeHandles = {};
}

// --- Mouse Move ---
function iHawakanMouseMove(e) {
  if (!selectedElement) return;
  
  const frameRect = previewFrame.getBoundingClientRect();
  
  if (isDragging && !isResizing) {
    const newLeft = e.clientX - frameRect.left - dragOffset.x;
    const newTop = e.clientY - frameRect.top - dragOffset.y;
    
    selectedElement.style.left = `${Math.max(0, newLeft)}px`;
    selectedElement.style.top = `${Math.max(0, newTop)}px`;
    selectedElement.style.right = 'auto';
    selectedElement.style.bottom = 'auto';
    
    iAyusinHandlePosisyon(selectedElement);
  }
  
  if (isResizing) {
    const dx = e.clientX - startRect.clientX;
    const dy = e.clientY - startRect.clientY;
    let newW = startRect.width, newH = startRect.height;
    let adjL = 0, adjT = 0;
    
    if (resizeDir.includes('right')) newW = Math.max(30, startRect.width + dx);
    if (resizeDir.includes('left')) { newW = Math.max(30, startRect.width - dx); adjL = dx; }
    if (resizeDir.includes('bottom')) newH = Math.max(20, startRect.height + dy);
    if (resizeDir.includes('top')) { newH = Math.max(20, startRect.height - dy); adjT = dy; }
    
    if (newW !== startRect.width) selectedElement.style.width = `${newW}px`;
    if (newH !== startRect.height) selectedElement.style.height = `${newH}px`;
    if (adjL) selectedElement.style.left = `${parseFloat(selectedElement.style.left || 0) + adjL}px`;
    if (adjT) selectedElement.style.top = `${parseFloat(selectedElement.style.top || 0) + adjT}px`;
    
    iAyusinHandlePosisyon(selectedElement);
  }
}

function iTaposMouse() {
  if ((isDragging || isResizing) && selectedElement) {
    iIupdateCodeMulaSaElement(selectedElement);
  }
  isDragging = false;
  isResizing = false;
}

// --- I-UPDATE ANG CODE ---
function iIupdateCodeMulaSaElement(el) {
  ignoreCodeChange = true;
  
  const tag = el.tagName.toLowerCase();
  const elId = el.id;
  let elClass = (el.className || '')
    .replace('selectable-element','').replace('selected-element','').replace(/resize-handle/g, '').trim();
  
  const inlineStyle = [];
  if (el.style.position) inlineStyle.push(`position:${el.style.position}`);
  if (el.style.top) inlineStyle.push(`top:${el.style.top}`);
  if (el.style.left) inlineStyle.push(`left:${el.style.left}`);
  if (el.style.width) inlineStyle.push(`width:${el.style.width}`);
  if (el.style.height) inlineStyle.push(`height:${el.style.height}`);
  if (el.style.margin) inlineStyle.push(`margin:${el.style.margin}`);
  
  const classAttr = elClass ? `class="${elClass}"` : '';
  const idAttr = elId ? `id="${elId}"` : '';
  const styleAttr = inlineStyle.length ? `style="${inlineStyle.join('; ')}"` : '';
  
  let code = codeInput.value;
  const lines = code.split('\n');
  let foundAt = -1;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.includes(`<${tag}`)) continue;
    
    if (elId && line.includes(`id="${elId}"`)) { foundAt = i; break; }
    if (elClass) {
      const firstClass = elClass.split(' ')[0];
      if (line.includes(`class="${firstClass}`) || line.includes(`class='${firstClass}'`)) { foundAt = i; break; }
    }
    if (foundAt === -1 && !line.includes('style=')) { foundAt = i; }
  }
  
  if (foundAt === -1) return;
  
  let line = lines[foundAt];
  line = line.replace(/(\s+)(style|class|id)="[^"]*"/gi, '');
  line = line.replace(/(\s+)(style|class|id)='[^']*'/gi, '');
  
  const attrs = [classAttr, idAttr, styleAttr].filter(Boolean).join(' ');
  line = line.replace(/<([a-z][a-z0-9]*)(\s+[^>]*)?>/, `<$1${attrs?' '+attrs:''}>`);
  
  lines[foundAt] = line;
  codeInput.value = lines.join('\n');
  
  let pos = 0;
  for (let j = 0; j < foundAt; j++) pos += lines[j].length + 1;
  codeInput.focus();
  codeInput.setSelectionRange(pos, pos + lines[foundAt].length);
  codeInput.scrollTop = foundAt * 20 - 50;
  
  iIimbakSaLokal();
  setTimeout(() => { ignoreCodeChange = false; }, 100);
}

// --- Ipakita ang Katangian + ✅ KONTROL SA AKSYON ---
function iUpdatePropertyPanel(el) {
  const pos = getComputedStyle(el).position;
  const tag = el.tagName.toLowerCase();
  
  // Alamin kung may nakakabit na aksyon
  const mayOnclick = el.hasAttribute && el.hasAttribute('onclick');
  const mayLink = tag === 'a' && el.href;
  const mayForm = tag === 'form';
  
  propContent.innerHTML = `
    <strong>Elemento:</strong> &lt;${tag}&gt;<br>
    <strong>Posisyon:</strong> ${pos}<br>
    <strong>Klase:</strong> ${(el.className||'').replace('selectable-element','').replace('selected-element','').trim() || 'Wala'}<br>
    <strong>ID:</strong> ${el.id || 'Wala'}<br>
    <hr style="margin:8px 0; border:none; border-top:1px solid #444;">
    
    <strong>Aksyon:</strong>
    ${mayOnclick ? '✅ May nakakabit na JavaScript' : ''}
    ${mayLink ? `🔗 Link: ${el.getAttribute('href')}` : ''}
    ${mayForm ? '📝 Formularyo' : ''}
    ${!mayOnclick && !mayLink && !mayForm ? 'Wala' : ''}
    <br><br>
    
    <button id="toggleActions" style="padding:6px 12px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; background:${actionsEnabled?'#4ecdc4':'#ff6b6b'}; color:white;">
      ${actionsEnabled ? '🔓 Aksyon: NAKABUKAS' : '🔒 Aksyon: NAKASARA (Pumili Muna)'}
    </button>
    
    <br><br>
    <strong>Lokasyon:</strong> Top: ${Math.round(parseFloat(el.style.top)) || 'Auto'}px | Left: ${Math.round(parseFloat(el.style.left)) || 'Auto'}px<br>
    <strong>Sukat:</strong> ${Math.round(el.offsetWidth)}px × ${Math.round(el.offsetHeight)}px<br>
    <em>💡 Kapag NAKASARA: Pipiliin lang ang elemento. Kapag NAKABUKAS: Tumatakbo ang orihinal na kilos.</em>
  `;
  
  // Ikabit ang pindutan ng pagpapalit
  setTimeout(() => {
    const btn = document.getElementById('toggleActions');
    if (btn) btn.onclick = iPalitanAksyonMode;
  }, 10);
}

// --- ✅ BUKAS/SARA ANG AKSYON ---
function iPalitanAksyonMode() {
  actionsEnabled = !actionsEnabled;
  
  // I-refresh para magkabisa agad
  const doc = previewFrame.contentDocument;
  if (doc) iIpaganaOIpigilanAksyon(doc);
  
  // I-update ang panel
  if (selectedElement) iUpdatePropertyPanel(selectedElement);
  
  alert(actionsEnabled 
    ? '🔓 NAKABUKAS na ang mga aksyon — tatawagin na ang mga link at function kapag pinindot!' 
    : '🔒 NAKASARA na ang mga aksyon — pipiliin muna ang elemento bago magpatakbo ng anuman.'
  );
}

// --- Hanapin sa Code ---
function iHanapinAtIhighlightSaCode(el) {
  if (ignoreCodeChange) return;
  
  const tag = el.tagName.toLowerCase();
  const code = codeInput.value;
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`<${tag}`)) {
      let pos = 0;
      for (let j = 0; j < i; j++) pos += lines[j].length + 1;
      codeInput.focus();
      codeInput.setSelectionRange(pos, pos + lines[i].length);
      codeInput.scrollTop = i * 20 - 50;
      break;
    }
  }
}

// --- Preview mula sa Code ---
let debounceTimer;
function iPreviewMulaSaCode() {
  if (ignoreCodeChange) return;
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    iRefreshPreview();
    iIimbakSaLokal();
  }, 300);
}

// --- Mga Pindutan ---
function bagongProyekto() {
  if (confirm('Gusto mo bang magsimula ng bago? Mawawala ang kasalukuyang gawa.')) {
    codeInput.value = defaultHTML;
    iRefreshPreview();
  }
}

function iSave() {
  iIimbakSaLokal();
  alert('Nai-save! ✅');
}

function iDownload() {
  const blob = new Blob([codeInput.value], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'aking-pahina.html';
  a.click();
}

// --- Pag-iimbak ---
function iIimbakSaLokal() {
  localStorage.setItem('dola-editor-code', codeInput.value);
}

function iLoadNakaimbak() {
  const naiimbak = localStorage.getItem('dola-editor-code');
  if (naiimbak) codeInput.value = naiimbak;
  else codeInput.value = defaultHTML;
}
