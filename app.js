// === Dola Visual Editor — Bersyon 0.2 (Drag & Drop + Resize) ===

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
let activeOverlay = null;
let resizeHandles = {};

// Halimbawang pagsisimula
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Akong Pahina</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; padding: 30px; min-height: 100vh; position: relative; }
    h1 { margin-bottom: 20px; color: #2d2d2d; }
    .kahon {
      position: absolute;
      top: 100px; left: 50px;
      width: 280px;
      background: #4ecdc4;
      padding: 20px;
      border-radius: 8px;
      color: white;
      cursor: move;
      transition: none;
    }
    .pindutan {
      position: absolute;
      top: 250px; left: 50px;
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: move;
    }
    .card {
      position: absolute;
      top: 100px; left: 400px;
      width: 300px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      cursor: move;
    }
  </style>
</head>
<body>
  <h1>Kamusta! Hilahin mo ako at baguhin ang laki!</h1>
  <div class="kahon" id="unangKahon">
    Hilahin mo ako sa kahit saan!
  </div>
  <button class="pindutan">Pindutin Ako</button>
  <div class="card">
    <h3>Halimbawang Card</h3>
    <p>Baguhin ang laki sa pamamagitan ng paghila sa gilid o kanto.</p>
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
  iIkabitPreviewEvents(doc);
}

// Maglagay ng mga pangyayari sa preview
function iIkabitPreviewEvents(doc) {
  // Tanggalin ang dating overlay
  if (activeOverlay) activeOverlay.remove();

  doc.querySelectorAll('body > *').forEach(el => {
    if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return;
    
    el.style.position = getComputedStyle(el).position === 'static' ? 'relative' : getComputedStyle(el).position;
    el.classList.add('selectable-element');
    
    el.onmousedown = (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      e.preventDefault();
      e.stopPropagation();
      iPiliElement(el);
      
      // Simulan ang paghila
      isDragging = true;
      const rect = el.getBoundingClientRect();
      const frameRect = previewFrame.getBoundingClientRect();
      
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      startRect = { 
        top: rect.top - frameRect.top, 
        left: rect.left - frameRect.left,
        width: rect.width,
        height: rect.height
      };
    };
  });

  // Pangkalahatang paggalaw ng mouse sa preview
  doc.addEventListener('mousemove', iHawakanMouseMove);
  doc.addEventListener('mouseup', iTaposMouse);
  doc.addEventListener('mouseleave', iTaposMouse);
}

// --- Piliin ang Elemento ---
function iPiliElement(el) {
  if (selectedElement) {
    selectedElement.classList.remove('selected-element');
    iAlisinResizeHandles();
  }
  
  selectedElement = el;
  el.classList.add('selected-element');
  
  iLikhaResizeHandles(el);
  iUpdatePropertyPanel(el);
  iHanapinAtIhighlightSaCode(el);
}

// --- Resize Handles ---
function iLikhaResizeHandles(el) {
  const doc = previewFrame.contentDocument;
  const positions = ['top','bottom','left','right','top-left','top-right','bottom-left','bottom-right'];
  
  positions.forEach(pos => {
    const handle = doc.createElement('div');
    handle.className = `resize-handle ${pos}`;
    handle.style.cssText = `
      position: absolute;
      width: 8px; height: 8px;
      background: #4ecdc4;
      border: 1px solid #fff;
      z-index: 9999;
      pointer-events: auto;
      cursor: ${pos.includes('top')?'n':pos.includes('bottom')?'s':''}${pos.includes('left')?'w':pos.includes('right')?'e':''}-resize;
    `;
    handle.dataset.dir = pos;
    
    handle.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      resizeDir = pos;
      startRect = el.getBoundingClientRect();
      startRect.clientX = e.clientX;
      startRect.clientY = e.clientY;
    };
    
    resizeHandles[pos] = handle;
    el.style.position = 'absolute'; // kailangan para gumana ang posisyon
    el.appendChild(handle);
  });
  
  iAyusinHandlePosisyon(el);
}

function iAyusinHandlePosisyon(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const bw = parseFloat(style.borderWidth) || 0;
  
  const setPos = (handle, top, left) => {
    handle.style.top = top;
    handle.style.left = left;
  };
  
  if (resizeHandles['top']) setPos(resizeHandles['top'], '-4px', 'calc(50% - 4px)');
  if (resizeHandles['bottom']) setPos(resizeHandles['bottom'], 'calc(100% - 4px)', 'calc(50% - 4px)');
  if (resizeHandles['left']) setPos(resizeHandles['left'], 'calc(50% - 4px)', '-4px');
  if (resizeHandles['right']) setPos(resizeHandles['right'], 'calc(50% - 4px)', 'calc(100% - 4px)');
  if (resizeHandles['top-left']) setPos(resizeHandles['top-left'], '-4px', '-4px');
  if (resizeHandles['top-right']) setPos(resizeHandles['top-right'], '-4px', 'calc(100% - 4px)');
  if (resizeHandles['bottom-left']) setPos(resizeHandles['bottom-left'], 'calc(100% - 4px)', '-4px');
  if (resizeHandles['bottom-right']) setPos(resizeHandles['bottom-right'], 'calc(100% - 4px)', 'calc(100% - 4px)');
}

function iAlisinResizeHandles() {
  Object.values(resizeHandles).forEach(h => h?.remove());
  resizeHandles = {};
}

// --- Mouse Move Handler ---
function iHawakanMouseMove(e) {
  if (!selectedElement) return;
  
  const frameRect = previewFrame.getBoundingClientRect();
  
  // PAGHILA
  if (isDragging && !isResizing) {
    const newLeft = e.clientX - frameRect.left - dragOffset.x;
    const newTop = e.clientY - frameRect.top - dragOffset.y;
    
    selectedElement.style.left = `${Math.max(0, newLeft)}px`;
    selectedElement.style.top = `${Math.max(0, newTop)}px`;
    selectedElement.style.right = 'auto';
    selectedElement.style.bottom = 'auto';
    
    iAyusinHandlePosisyon(selectedElement);
  }
  
  // PAGBABAGO NG LAKI
  if (isResizing) {
    const dx = e.clientX - startRect.clientX;
    const dy = e.clientY - startRect.clientY;
    let newW = startRect.width;
    let newH = startRect.height;
    let newL = 0;
    let newT = 0;
    
    if (resizeDir.includes('right')) newW = Math.max(50, startRect.width + dx);
    if (resizeDir.includes('left')) {
      newW = Math.max(50, startRect.width - dx);
      newL = dx;
    }
    if (resizeDir.includes('bottom')) newH = Math.max(30, startRect.height + dy);
    if (resizeDir.includes('top')) {
      newH = Math.max(30, startRect.height - dy);
      newT = dy;
    }
    
    if (newW !== startRect.width) selectedElement.style.width = `${newW}px`;
    if (newH !== startRect.height) selectedElement.style.height = `${newH}px`;
    if (newL) selectedElement.style.left = `${parseFloat(selectedElement.style.left) + newL}px`;
    if (newT) selectedElement.style.top = `${parseFloat(selectedElement.style.top) + newT}px`;
    
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

// --- I-UPDATE ANG CODE MULA SA ELEMENTO ---
function iIupdateCodeMulaSaElement(el) {
  ignoreCodeChange = true;
  
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `id="${el.id}"` : '';
  const classes = el.className.replace('selectable-element','').replace('selected-element','').trim();
  const classAttr = classes ? `class="${classes}"` : '';
  
  const style = el.style;
  const inlineStyle = [];
  if (style.top) inlineStyle.push(`top: ${style.top}`);
  if (style.left) inlineStyle.push(`left: ${style.left}`);
  if (style.width) inlineStyle.push(`width: ${style.width}`);
  if (style.height) inlineStyle.push(`height: ${style.height}`);
  if (style.position) inlineStyle.push(`position: ${style.position}`);
  
  const styleAttr = inlineStyle.length ? `style="${inlineStyle.join('; ')}"` : '';
  
  // Hanapin at palitan ang linya sa code
  let code = codeInput.value;
  const lines = code.split('\n');
  
  let foundAt = -1;
  let openingTag = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(`<${tag}`) && (id ? line.includes(el.id) : true) && (classes ? line.includes(classes.split(' ')[0]) : true)) {
      foundAt = i;
      
      // Buuin ang bagong linya — panatilihin ang orihinal na nilalaman
      const contentMatch = line.match(/>([^<]+)</);
      const content = contentMatch ? contentMatch[1] : '';
      
      // Buuin ang bagong tag
      const attrs = [classAttr, id, styleAttr].filter(Boolean).join(' ');
      openingTag = `<${tag}${attrs?' '+attrs:''}>`;
      
      // Kung may istilo sa loob, palitan
      lines[i] = lines[i].replace(/<[a-z][^>]+>/, openingTag);
      break;
    }
  }
  
  if (foundAt !== -1) {
    codeInput.value = lines.join('\n');
    iIimbakSaLokal();
    
    // I-highlight ang binagong linya
    let pos = 0;
    for (let j = 0; j < foundAt; j++) pos += lines[j].length + 1;
    codeInput.focus();
    codeInput.setSelectionRange(pos, pos + lines[foundAt].length);
    codeInput.scrollTop = foundAt * 20 - 50;
  }
  
  setTimeout(() => { ignoreCodeChange = false; }, 100);
}

// --- Ipakita ang Katangian ---
function iUpdatePropertyPanel(el) {
  const style = getComputedStyle(el);
  propContent.innerHTML = `
    <strong>Tag:</strong> &lt;${el.tagName.toLowerCase()}&gt;<br>
    <strong>Klase:</strong> ${el.className.replace('selectable-element','').replace('selected-element','').trim() || 'Wala'}<br>
    <strong>ID:</strong> ${el.id || 'Wala'}<br>
    <hr style="margin:8px 0; border:none; border-top:1px solid #444;">
    <strong>Posisyon:</strong> Top: ${Math.round(parseFloat(el.style.top))}px | Left: ${Math.round(parseFloat(el.style.left))}px<br>
    <strong>Sukat:</strong> Lapad: ${Math.round(parseFloat(el.style.width)) || 'Auto'}px | Taas: ${Math.round(parseFloat(el.style.height)) || 'Auto'}px<br>
    <em>✅ Hilahin para ilipat | ✅ Hilahin ang kanto/gilid para baguhin ang laki</em>
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

// --- Awtomatikong Preview mula sa Code ---
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
  alert('Nai-save sa browser! ✅');
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
