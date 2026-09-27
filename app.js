// === Dola Visual Editor — Bersyon 0.1 ===

const codeInput = document.getElementById('codeInput');
const previewFrame = document.getElementById('previewFrame');
const propContent = document.getElementById('propContent');

// Mga pindutan
document.getElementById('btnNew').onclick = bagongProyekto;
document.getElementById('btnSave').onclick = iSave;
document.getElementById('btnExport').onclick = iDownload;

// Huling kilala na napiling elemento
let selectedElement = null;
let ignoreCodeChange = false;

// Halimbawang pagsisimula
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Akong Pahina</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
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
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Kamusta! Ito ang aking pahina</h1>
  <div class="kahon" id="unangKahon">
    I-click mo ako! Hilahin mo ako!
  </div>
  <button class="pindutan">Pindutin Ako</button>
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
  iIkabitPreviewEvents(doc);
}

// Maglagay ng mga pangyayari sa preview
function iIkabitPreviewEvents(doc) {
  doc.querySelectorAll('body *').forEach(el => {
    el.classList.add('selectable-element');
    el.onclick = (e) => {
      e.stopPropagation();
      iPiliElement(el);
    };
  });
}

// Kapag pinili ang elemento sa preview → hanapin sa code
function iPiliElement(el) {
  // Tanggalin sa dating napili
  if (selectedElement) selectedElement.classList.remove('selected-element');
  // Itakda ang bago
  selectedElement = el;
  el.classList.add('selected-element');

  // Ipakita ang katangian
  propContent.innerHTML = `
    <strong>Tag:</strong> &lt;${el.tagName.toLowerCase()}&gt;<br>
    <strong>Klase:</strong> ${el.className || 'Wala'}<br>
    <strong>ID:</strong> ${el.id || 'Wala'}<br>
    <strong>Nilalaman:</strong> ${el.textContent.substring(0, 50)}...<br>
    <em>Ipinapakita ang kaukulang bahagi sa code...</em>
  `;

  // ✅ Tatalon at i-highlight sa code (simpleng bersyon ngayon)
  iHanapinAtIhighlightSaCode(el);
}

// Hanapin ang elemento sa code at ilipat ang cursor
function iHanapinAtIhighlightSaCode(el) {
  const tag = el.tagName.toLowerCase();
  const code = codeInput.value;
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`<${tag}`)) {
      // Ilipat ang cursor sa linyang iyon
      let pos = 0;
      for (let j = 0; j < i; j++) pos += lines[j].length + 1;
      codeInput.focus();
      codeInput.setSelectionRange(pos, pos + lines[i].length);
      // Mag-scroll doon
      codeInput.scrollTop = i * 20 - 50;
      break;
    }
  }
}

// Awtomatikong i-refresh kapag binago ang code
let debounceTimer;
function iPreviewMulaSaCode() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    iRefreshPreview();
    iIimbakSaLokal();
  }, 300);
}

// --- Mga Utos sa Pindutan ---
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
