// === Dola Visual Editor — Bersyon 0.3 (Universal: Gumagana sa LAHAT) ===

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
let originalPositions = new WeakMap(); // Tandaan ang orihinal na pwesto

// Halimbawang pagsisimula — LAHAT gumagana!
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Universal Editor</title>
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
    p {
      color: #555;
      margin: 15px 0;
      line-height: 1.6;
    }
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
    }
    .card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    img {
      max-width: 100%;
      border-radius: 6px;
      margin: 10px 0;
    }
    ul { margin: 15px 30px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>Kamusta! LAHAT ay pwedeng hilahin!</h1>
  
  <p>Ito ay karaniwang talata — walang espesyal na istilo. Pwede mo akong ilipat kahit saan!</p>
  
  <div class="kahon">
    Kahon — hilahin ako sa kahit anong pwesto sa pahina!
  </div>
  
  <button class="pindutan">Pindutin Ako</button>
  <button class="pindutan">Isa pang Pindutan</button>
  
  <div class="card">
    <h3>Impormasyon</h3>
    <p>Baguhin ang laki sa pamamagitan ng paghila sa gilid o kanto.</p>
    <ul>
      <li>Punto una</li>
      <li>Punto pangalawa — kahit listahan!</li>
      <li>Pangatlong punto</li>
    </ul>
  </div>

  <footer style="margin-top: 40px; padding: 15px; background: #333; color: white; text-align: center;">
    Ito ang paanan ng pahina — ako rin ay pwedeng ilipat!
  </footer>
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
  
  // Siguraduhin na ang katawan ay pwedeng paglagyan
  doc.body.style.position = 'relative';
  doc.body.style.minHeight = '150vh';
  
  // Bigyan ng oras para magkumpleto ang pag-render
  setTimeout(() => iIkabitPreviewEvents(doc), 20);
}

// --- IKABIT SA LAHAT NG ELEMENTO ---
function iIkabitPreviewEvents(doc) {
  // Tanggalin ang dating pagpili
  selectedElement = null;
  iAlisinResizeHandles();

  // KUNIN ANG LAHAT — hindi lang direct children!
  const allElements = doc.querySelectorAll('*');
  
  allElements.forEach(el => {
    // Laktawan ang mga hindi kailangang i-edit
    if (['STYLE','SCRIPT','META','HEAD','TITLE','IFRAME'].includes(el.tagName)) return;
    
    // Alisin ang dating handlers para hindi dumami
    el.onmousedown = null;
    el.classList.remove('selectable-element', 'selected-element');
    
    el.classList.add('selectable-element');
    
    el.onmousedown = (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      e.preventDefault();
      e.stopPropagation();
      
      iPiliElement(el);
      
      // SIMULANG HILAHIN — i-convert sa absolute kung hindi pa
      const currPos = getComputedStyle(el).position;
      if (currPos !== 'absolute' && currPos !== 'fixed') {
        iGawingAbsolute(el);
      }
      
      isDragging = true;
      const rect = el.getBoundingClientRect();
      const frameRect = previewFrame.getBoundingClientRect();
      
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      startRect = { 
        width: rect.width,
        height: rect.height
      };
    };
  });

  // Pangkalahatang paggalaw ng mouse
  doc.addEventListener('mousemove', iHawakanMouseMove);
  doc.addEventListener('mouseup', iTaposMouse);
  doc.addEventListener('mouseleave', iTaposMouse);
}

// --- I-convert sa Absolute nang Tumpak ---
function iGawingAbsolute(el) {
  const rect = el.getBoundingClientRect();
  const frameRect = previewFrame.getBoundingClientRect();
  const parent = el.parentElement;
  const parentRect = parent.getBoundingClientRect();
  
  // Kumuha ng orihinal na pwesto kumpara sa magulang
  const origTop = rect.top - parentRect.top - parseFloat(getComputedStyle(parent).paddingTop || 0);
  const origLeft = rect.left - parentRect.left - parseFloat(getComputedStyle(parent).paddingLeft || 0);
  
  originalPositions.set(el, { top: origTop, left: origLeft });
  
  // Ilapat ang absolute
  el.style.position = 'absolute';
  el.style.top = `${origTop}px`;
  el.style.left = `${origLeft}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  
  // Alisin ang margin para hindi magbago ang pwesto
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
  
  // Siguraduhing absolute bago maglagay ng handles
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
      
      // Siguraduhing absolute
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
    if (handle) {
      handle.style.top = top;
      handle.style.left = left;
    }
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
  
  // === PAGHILA ===
  if (isDragging && !isResizing) {
    const newLeft = e.clientX - frameRect.left - dragOffset.x;
    const newTop = e.clientY - frameRect.top - dragOffset.y;
    
    selectedElement.style.left = `${Math.max(0, newLeft)}px`;
    selectedElement.style.top = `${Math.max(0, newTop)}px`;
    selectedElement.style.right = 'auto';
    selectedElement.style.bottom = 'auto';
    
    iAyusinHandlePosisyon(selectedElement);
  }
  
  // === PAGBABAGO NG LAKI ===
  if (isResizing) {
    const dx = e.clientX - startRect.clientX;
    const dy = e.clientY - startRect.clientY;
    let newW = startRect.width;
    let newH = startRect.height;
    let adjL = 0, adjT = 0;
    
    if (resizeDir.includes('right')) newW = Math.max(30, startRect.width + dx);
    if (resizeDir.includes('left')) {
      newW = Math.max(30, startRect.width - dx);
      adjL = dx;
    }
    if (resizeDir.includes('bottom')) newH = Math.max(20, startRect.height + dy);
    if (resizeDir.includes('top')) {
      newH = Math.max(20, startRect.height - dy);
      adjT = dy;
    }
    
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

// --- I-UPDATE ANG CODE — PINAGBUTI PARA SA LAHAT ---
function iIupdateCodeMulaSaElement(el) {
  ignoreCodeChange = true;
  
  const tag = el.tagName.toLowerCase();
  const elId = el.id;
  let elClass = (el.className || '')
    .replace('selectable-element','')
    .replace('selected-element','')
    .replace(/resize-handle/g, '')
    .trim();
  
  // Kunin ang istilong ilalagay
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
  
  // Hanapin at palitan sa code — MAS MABILIS AT TUMPAK
  let code = codeInput.value;
  const lines = code.split('\n');
  let foundAt = -1;
  
  // Bumuo ng pattern para mahanap
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.includes(`<${tag}`)) continue;
    
    // Kung may ID o Klase, mas tiyak ang paghahanap
    if (elId && line.includes(`id="${elId}"`)) { foundAt = i; break; }
    if (elClass) {
      const firstClass = elClass.split(' ')[0];
      if (line.includes(`class="${firstClass}`) || line.includes(`class='${firstClass}'`)) { foundAt = i; break; }
    }
    // Kung wala, kunin ang unang tumugma sa tag na walang istilo
    if (foundAt === -1 && !line.includes('style=')) { foundAt = i; }
  }
  
  if (foundAt === -1) return;
  
  // Palitan ang opening tag
  let line = lines[foundAt];
  
  // Alisin ang dating attributes
  line = line.replace(/(\s+)(style|class|id)="[^"]*"/gi, '');
  line = line.replace(/(\s+)(style|class|id)='[^']*'/gi, '');
  
  // Ilagay ang bago
  const attrs = [classAttr, idAttr, styleAttr].filter(Boolean).join(' ');
  line = line.replace(/<([a-z][a-z0-9]*)(\s+[^>]*)?>/, `<$1${attrs?' '+attrs:''}>`);
  
  lines[foundAt] = line;
  codeInput.value = lines.join('\n');
  
  // I-highlight
  let pos = 0;
  for (let j = 0; j < foundAt; j++) pos += lines[j].length + 1;
  codeInput.focus();
  codeInput.setSelectionRange(pos, pos + lines[foundAt].length);
  codeInput.scrollTop = foundAt * 20 - 50;
  
  iIimbakSaLokal();
  setTimeout(() => { ignoreCodeChange = false; }, 100);
}

// --- Ipakita ang Katangian ---
function iUpdatePropertyPanel(el) {
  const pos = getComputedStyle(el).position;
  propContent.innerHTML = `
    <strong>Elemento:</strong> &lt;${el.tagName.toLowerCase()}&gt;<br>
    <strong>Posisyon:</strong> ${pos}<br>
    <strong>Klase:</strong> ${(el.className||'').replace('selectable-element','').replace('selected-element','').trim() || 'Wala'}<br>
    <strong>ID:</strong> ${el.id || 'Wala'}<br>
    <hr style="margin:8px 0; border:none; border-top:1px solid #444;">
    <strong>Lokasyon:</strong> Top: ${Math.round(parseFloat(el.style.top)) || 'Auto'}px | Left: ${Math.round(parseFloat(el.style.left)) || 'Auto'}px<br>
    <strong>Sukat:</strong> ${Math.round(el.offsetWidth)}px × ${Math.round(el.offsetHeight)}px<br>
    <em>✅ Hilahin kahit ano — awtomatikong nagiging ililipat!</em>
  `;
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
