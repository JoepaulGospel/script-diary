/* =========================================================
   SCRIPT DIARY — front end
   Talks to /api/scripts, which reads and writes your Turso
   database. Typing autosaves after a short pause — there's
   no save button. Both devices load the same list, since
   they're reading from the same database.
   ========================================================= */

let scripts = [];
let activeId = null;
let saveTimer = null;

// ---------- Error banner ----------
const errorBanner = document.getElementById("errorBanner");
function showError(message) {
  errorBanner.hidden = false;
  errorBanner.innerHTML = `<b>Something went wrong:</b> ${message}`;
}
function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
}

// ---------- API helper ----------
async function api(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, Object.assign({}, options, { headers }));
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (data && (data.details || data.error)) || `Request to ${path} failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

async function loadScripts() {
  try {
    scripts = await api("/api/scripts");
    clearError();
  } catch (err) {
    showError(err.message + " — check that TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set correctly in Vercel.");
    scripts = [];
  }
  renderList();
}
loadScripts();

// ---------- Sidebar list ----------
const scriptList = document.getElementById("scriptList");
const listEmpty = document.getElementById("listEmpty");

function snippetOf(body) {
  const clean = (body || "").replace(/\s+/g, " ").trim();
  return clean.length > 60 ? clean.slice(0, 60) + "…" : clean || "No content yet";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderList() {
  scriptList.innerHTML = "";
  scripts.forEach((s) => {
    const item = document.createElement("div");
    item.className = "script-item" + (s.id === activeId ? " active" : "");
    item.innerHTML = `
      <div class="script-item-top">
        <div class="script-item-title">${escapeHtml(s.title || "Untitled")}</div>
        ${s.shot ? '<span class="shot-badge">Shot</span>' : ""}
      </div>
      <div class="script-item-snippet">${s.writer ? escapeHtml(s.writer) + " · " : ""}${escapeHtml(snippetOf(s.body))}</div>
      <div class="script-item-date">${formatDate(s.updated_at)}</div>
    `;
    item.addEventListener("click", () => selectScript(s.id));
    scriptList.appendChild(item);
  });
  listEmpty.classList.toggle("hidden", scripts.length > 0);
}

// ---------- New script ----------
document.getElementById("newScriptBtn").addEventListener("click", async () => {
  try {
    const result = await api("/api/scripts", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", body: "" }),
    });
    await loadScripts();
    selectScript(result.id);
    clearError();
  } catch (err) {
    showError(err.message);
  }
});

// ---------- Editor ----------
const editorEmpty = document.getElementById("editorEmpty");
const editorInner = document.getElementById("editorInner");
const titleInput = document.getElementById("titleInput");
const writerInput = document.getElementById("writerInput");
const bodyInput = document.getElementById("bodyInput");
const editorMeta = document.getElementById("editorMeta");
const saveStatus = document.getElementById("saveStatus");
const shotBtn = document.getElementById("shotBtn");
const editorPane = document.getElementById("editor");
const sidebarPane = document.getElementById("sidebar");

function selectScript(id) {
  activeId = id;
  const s = scripts.find((x) => x.id === id);
  if (!s) return;

  editorEmpty.hidden = true;
  editorInner.hidden = false;
  titleInput.value = s.title || "";
  writerInput.value = s.writer || "";
  bodyInput.value = s.body || "";
  editorMeta.textContent = "Last edited " + formatDate(s.updated_at);
  shotBtn.textContent = s.shot ? "Shot ✓" : "Shot already";
  shotBtn.classList.toggle("active", Boolean(s.shot));
  saveStatus.textContent = "Saved";

  renderList();

  // Mobile: swap sidebar for editor
  editorPane.classList.add("open");
  sidebarPane.classList.add("hidden-mobile");
}

document.getElementById("backBtn").addEventListener("click", () => {
  editorPane.classList.remove("open");
  sidebarPane.classList.remove("hidden-mobile");
});

function scheduleSave() {
  saveStatus.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 800);
}

async function doSave() {
  if (activeId === null) return;
  try {
    await api(`/api/scripts?id=${activeId}`, {
      method: "PUT",
      body: JSON.stringify({ title: titleInput.value, writer: writerInput.value, body: bodyInput.value }),
    });
    const s = scripts.find((x) => x.id === activeId);
    if (s) {
      s.title = titleInput.value;
      s.writer = writerInput.value;
      s.body = bodyInput.value;
      s.updated_at = new Date().toISOString();
    }
    saveStatus.textContent = "Saved";
    renderList();
    clearError();
  } catch (err) {
    saveStatus.textContent = "Couldn't save";
    showError(err.message);
  }
}

titleInput.addEventListener("input", scheduleSave);
writerInput.addEventListener("input", scheduleSave);
bodyInput.addEventListener("input", scheduleSave);

// ---------- Screenplay formatting bar ----------
// Column positions match standard US screenplay margins,
// converted to characters at Courier 12pt (10 characters/inch),
// measured from the action/scene margin (1.5" from the page edge):
//   Character name   — 2.2" in  = 22 chars
//   Parenthetical     — 1.6" in  = 16 chars
//   Dialogue          — 1.0" in  = 10 chars
//   Transition        — right-aligned to the 6"-wide text column (60 chars)
const FORMAT_COLUMNS = { character: 22, parenthetical: 16, dialogue: 10 };
const TRANSITION_COLUMN = 60;

function applyFormat(mode) {
  const ta = bodyInput;
  const value = ta.value;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;
  const text = value.slice(lineStart, lineEnd).trim();

  let out = text;
  let indent = 0;

  switch (mode) {
    case "scene":
      out = text.toUpperCase();
      indent = 0;
      break;
    case "action":
      indent = 0;
      break;
    case "character":
      out = text.toUpperCase();
      indent = FORMAT_COLUMNS.character;
      break;
    case "parenthetical":
      out = text.startsWith("(") ? text : `(${text || ""})`;
      indent = FORMAT_COLUMNS.parenthetical;
      break;
    case "dialogue":
      indent = FORMAT_COLUMNS.dialogue;
      break;
    case "transition":
      out = text.toUpperCase();
      indent = Math.max(TRANSITION_COLUMN - out.length, 0);
      break;
  }

  const newLine = " ".repeat(indent) + out;
  ta.value = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
  const cursorPos = lineStart + newLine.length;
  ta.focus();
  ta.setSelectionRange(cursorPos, cursorPos);
  scheduleSave();
}

document.querySelectorAll(".fmt-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyFormat(btn.dataset.fmt));
});

// ---------- PDF export ----------
// Matches the same column math as the formatting bar above, so
// whatever you've indented in the editor lands in the same place
// on the page. Includes a title page and a background watermark
// on every page.
document.getElementById("downloadBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = 612, pageHeight = 792;
  const marginLeft = 108;   // 1.5"
  const marginRight = 72;   // 1"
  const marginTop = 72;     // 1"
  const marginBottom = 72;  // 1"
  const lineHeight = 12;    // 6 lines/inch at 72pt/inch
  const charWidth = 7.2;    // 10 chars/inch at 72pt/inch

  function watermark() {
    doc.setFont("courier", "bold");
    doc.setFontSize(48);
    doc.setTextColor(232, 232, 232);
    doc.text("TIZIANO FILMS", pageWidth / 2, pageHeight / 2, { angle: 45, align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("courier", "normal");
    doc.setFontSize(12);
  }

  // Title page
  watermark();
  doc.setFont("courier", "bold");
  doc.text((titleInput.value || "Untitled").toUpperCase(), pageWidth / 2, pageHeight / 2 - 40, { align: "center" });
  doc.setFont("courier", "normal");
  doc.text("by", pageWidth / 2, pageHeight / 2 - 10, { align: "center" });
  doc.text(writerInput.value || "", pageWidth / 2, pageHeight / 2 + 14, { align: "center" });

  // Content pages
  doc.addPage();
  let pageNum = 2;
  watermark();
  doc.text(pageNum + ".", pageWidth - marginRight, marginTop - 20, { align: "right" });

  let y = marginTop;
  const maxY = pageHeight - marginBottom;
  const totalColumns = 60; // 6" of usable width at 10 chars/inch

  bodyInput.value.split("\n").forEach((rawLine) => {
    if (rawLine.trim() === "") { y += lineHeight; return; }

    const leadingSpaces = (rawLine.match(/^ */) || [""])[0].length;
    const content = rawLine.slice(leadingSpaces);
    const x = marginLeft + leadingSpaces * charWidth;

    // Wrap to whatever room is left between this indent and the
    // right margin — this is the fix for long action/dialogue
    // lines that only *looked* wrapped in the browser textarea.
    const availableChars = Math.max(totalColumns - leadingSpaces, 10);
    const availableWidthPt = availableChars * charWidth;
    const wrapped = doc.splitTextToSize(content, availableWidthPt);

    wrapped.forEach((wrappedLine) => {
      if (y > maxY) {
        doc.addPage();
        pageNum++;
        watermark();
        doc.text(pageNum + ".", pageWidth - marginRight, marginTop - 20, { align: "right" });
        y = marginTop;
      }
      doc.text(wrappedLine, x, y);
      y += lineHeight;
    });
  });

  doc.save((titleInput.value || "script") + ".pdf");
});

// ---------- Shot toggle ----------
shotBtn.addEventListener("click", async () => {
  if (activeId === null) return;
  const s = scripts.find((x) => x.id === activeId);
  const newShot = !s.shot;
  try {
    await api(`/api/scripts?id=${activeId}`, {
      method: "PUT",
      body: JSON.stringify({ shot: newShot }),
    });
    s.shot = newShot;
    shotBtn.textContent = newShot ? "Shot ✓" : "Shot already";
    shotBtn.classList.toggle("active", newShot);
    renderList();
    clearError();
  } catch (err) {
    showError(err.message);
  }
});

// ---------- Delete ----------
document.getElementById("deleteScriptBtn").addEventListener("click", async () => {
  if (activeId === null) return;
  if (!confirm("Delete this script? This can't be undone.")) return;
  try {
    await api(`/api/scripts?id=${activeId}`, { method: "DELETE" });
    scripts = scripts.filter((x) => x.id !== activeId);
    activeId = null;
    editorInner.hidden = true;
    editorEmpty.hidden = false;
    editorPane.classList.remove("open");
    sidebarPane.classList.remove("hidden-mobile");
    renderList();
    clearError();
  } catch (err) {
    showError(err.message);
  }
});

// ---------- utils ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
