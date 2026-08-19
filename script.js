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
      <div class="script-item-snippet">${escapeHtml(snippetOf(s.body))}</div>
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
      body: JSON.stringify({ title: titleInput.value, body: bodyInput.value }),
    });
    const s = scripts.find((x) => x.id === activeId);
    if (s) { s.title = titleInput.value; s.body = bodyInput.value; s.updated_at = new Date().toISOString(); }
    saveStatus.textContent = "Saved";
    renderList();
    clearError();
  } catch (err) {
    saveStatus.textContent = "Couldn't save";
    showError(err.message);
  }
}

titleInput.addEventListener("input", scheduleSave);
bodyInput.addEventListener("input", scheduleSave);

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
