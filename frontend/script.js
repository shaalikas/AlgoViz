const API_BASE = "http://localhost:5000";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

// ---------- View switching ----------
const viewGenerateBtn = document.getElementById("viewGenerate");
const viewHistoryBtn = document.getElementById("viewHistory");
const generateView = document.getElementById("generateView");
const historyView = document.getElementById("historyView");

viewGenerateBtn.addEventListener("click", () => switchView("generate"));
viewHistoryBtn.addEventListener("click", () => switchView("history"));

function switchView(view) {
  const isGenerate = view === "generate";
  generateView.classList.toggle("hidden", !isGenerate);
  historyView.classList.toggle("hidden", isGenerate);
  viewGenerateBtn.classList.toggle("active", isGenerate);
  viewHistoryBtn.classList.toggle("active", !isGenerate);
  if (!isGenerate) loadHistory();
}

// ---------- Generate flow ----------
const codeInput = document.getElementById("codeInput");
const generateBtn = document.getElementById("generateBtn");
const errorMsg = document.getElementById("errorMsg");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const emptyState = document.getElementById("emptyState");
const diagramDiv = document.getElementById("diagram");
const explanationP = document.getElementById("explanation");
const downloadBtn = document.getElementById("downloadDiagram");

generateBtn.addEventListener("click", handleGenerate);

async function handleGenerate() {
  const code = codeInput.value.trim();
  hideError();

  if (!code) {
    showError("Please paste some code first.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong while parsing.");
    }

    await renderResults(data.mermaidCode, data.explanation);
    showToast("Diagram generated successfully!");
  } catch (err) {
    showError(err.message || "Failed to reach the server. Is the backend running?");
    emptyState.classList.remove("hidden");
    results.classList.add("hidden");
    showToast("Error generating diagram");
  } finally {
    setLoading(false);
  }
}

async function renderResults(mermaidCode, explanation) {
  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
  explanationP.textContent = explanation || "No explanation available.";

  diagramDiv.innerHTML = "";
  try {
    const { svg } = await mermaid.render("diagramSvg-" + Date.now(), mermaidCode);
    diagramDiv.innerHTML = svg;
  } catch (e) {
    diagramDiv.innerHTML = `<p class="error">Couldn't render diagram.</p>`;
  }
}

// ---------- Download Diagram ----------
downloadBtn.addEventListener("click", () => {
  const svgElement = diagramDiv.querySelector("svg");
  if (!svgElement) {
    showToast("No diagram to download");
    return;
  }

  // Convert SVG to PNG
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();

  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "diagram.png";
    link.click();
    showToast("Diagram downloaded as PNG!");
  };

  img.src = url;
});

// ---------- Loading/Error helpers ----------
function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  loading.classList.toggle("hidden", !isLoading);
  if (isLoading) {
    results.classList.add("hidden");
    emptyState.classList.add("hidden");
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
  errorMsg.textContent = "";
}

// ---------- History flow ----------
const historyList = document.getElementById("historyList");
const historyDetail = document.getElementById("historyDetail");
const historySearch = document.getElementById("historySearch");

async function loadHistory() {
  historyList.innerHTML = "<li>Loading…</li>";
  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    const projects = await res.json();

    if (!projects.length) {
      historyList.innerHTML = "<li>No saved projects yet.</li>";
      return;
    }

    historyList.innerHTML = "";
    projects.forEach((p) => {
      const li = document.createElement("li");
      const firstLine = p.code_input.split("\n")[0].slice(0, 50);
      const date = new Date(p.created_at).toLocaleString();
      li.innerHTML = `<span class="snippet">${escapeHtml(firstLine)}</span><span class="timestamp">${date}</span>`;
      li.addEventListener("click", () => showHistoryItem(p));
      historyList.appendChild(li);
    });

    // Search filter
    historySearch.addEventListener("input", () => {
      const query = historySearch.value.toLowerCase();
      [...historyList.children].forEach(li => {
        const snippet = li.querySelector(".snippet").textContent.toLowerCase();
        li.style.display = snippet.includes(query) ? "" : "none";
      });
    });

  } catch (err) {
    historyList.innerHTML = "<li>Couldn't load history. Is the backend running?</li>";
  }
}

async function showHistoryItem(project) {
  historyDetail.classList.remove("empty-state");
  historyDetail.innerHTML = `
    <div id="results">
      <div class="card">
        <h2>Diagram</h2>
        <div id="historyDiagram"></div>
        <button id="downloadHistoryDiagram">Download Diagram</button>
      </div>
      <div class="card">
        <h2>Explanation</h2>
        <p>${escapeHtml(project.ai_explanation || "No explanation available.")}</p>
      </div>
    </div>
  `;

  try {
    const { svg } = await mermaid.render("historyDiagramSvg-" + project.id, project.mermaid_output);
    document.getElementById("historyDiagram").innerHTML = svg;

    // Download button logic
    const downloadBtn = document.getElementById("downloadHistoryDiagram");
    downloadBtn.addEventListener("click", () => {
      const svgElement = document.querySelector("#historyDiagram svg");
      if (!svgElement) {
        showToast("No diagram to download");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "history_diagram.png";
        link.click();
        showToast("History diagram downloaded!");
      };

      img.src = url;
    });
  } catch (e) {
    document.getElementById("historyDiagram").innerHTML = `<p class="error">Couldn't render diagram.</p>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Toast notifications ----------
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, 3000);
}

// ---------- Theme toggle ----------
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  themeToggle.textContent = isLight ? "☀️" : "🌙";
  showToast(isLight ? "Light mode enabled" : "Dark mode enabled");
});
