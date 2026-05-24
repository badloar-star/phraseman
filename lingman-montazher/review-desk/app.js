const state = {
  manifest: null,
  selectedClipId: null,
  selectedTextId: null,
};

const els = {
  status: document.getElementById("status"),
  video: document.getElementById("video"),
  videoPlaceholder: document.getElementById("videoPlaceholder"),
  overlayPreview: document.getElementById("overlayPreview"),
  projectTitle: document.getElementById("projectTitle"),
  rawDuration: document.getElementById("rawDuration"),
  editedDuration: document.getElementById("editedDuration"),
  warningCount: document.getElementById("warningCount"),
  previewMode: document.getElementById("previewMode"),
  timelineMeta: document.getElementById("timelineMeta"),
  timeline: document.getElementById("timeline"),
  screenTextList: document.getElementById("screenTextList"),
  warningsList: document.getElementById("warningsList"),
  manifestInput: document.getElementById("manifestInput"),
  videoInput: document.getElementById("videoInput"),
  exportButton: document.getElementById("exportButton"),
  clipId: document.getElementById("clipId"),
  decisionSelect: document.getElementById("decisionSelect"),
  reasonInput: document.getElementById("reasonInput"),
  transcriptInput: document.getElementById("transcriptInput"),
};

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function editedDuration(manifest) {
  return manifest.editDecisions.reduce((max, item) => Math.max(max, item.outputEnd), 0);
}

function previewFile(manifest) {
  return manifest.project.previewFile || manifest.project.renderedFile || "";
}

function isRenderedPreview() {
  return Boolean(previewFile(state.manifest));
}

function routeForProjectFile(path) {
  return `/${String(path)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#fb7185" : "";
}

function selectedClip() {
  return state.manifest?.editDecisions.find((item) => item.id === state.selectedClipId) ?? null;
}

function selectedText() {
  return state.manifest?.screenText.find((item) => item.id === state.selectedTextId) ?? null;
}

function updateSummary() {
  const manifest = state.manifest;
  els.projectTitle.textContent = manifest.project.title;
  els.rawDuration.textContent = formatTime(manifest.project.duration);
  els.editedDuration.textContent = formatTime(editedDuration(manifest));
  els.warningCount.textContent = String(manifest.quality?.warnings?.length ?? 0);
  els.previewMode.textContent = previewFile(manifest) ? "rendered v2" : "raw source";
  els.timelineMeta.textContent = `${manifest.editDecisions.length} decisions`;
}

function renderTimeline() {
  const manifest = state.manifest;
  const total = Math.max(1, manifest.project.duration);
  els.timeline.replaceChildren();

  manifest.editDecisions.forEach((item) => {
    const button = document.createElement("button");
    const width = Math.max(5, ((item.sourceEnd - item.sourceStart) / total) * 100);
    button.className = `segment ${item.decision}`;
    button.style.flexBasis = `${width}%`;
    button.type = "button";
    button.title = `${item.id}: ${item.reason}`;
    button.setAttribute("aria-label", `${item.id} ${item.decision}`);
    if (item.id === state.selectedClipId) {
      button.classList.add("active");
    }
    button.innerHTML = `
      <span class="segment-id">${item.id}</span>
      <span class="segment-kind">${item.decision}</span>
      <span class="segment-kind">${formatTime(item.sourceStart)}-${formatTime(item.sourceEnd)}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedClipId = item.id;
      syncEditor();
      renderTimeline();
    });
    els.timeline.appendChild(button);
  });
}

function renderScreenText() {
  els.screenTextList.replaceChildren();
  state.manifest.screenText.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "event-row";
    if (item.id === state.selectedTextId) {
      row.classList.add("active");
    }
    row.innerHTML = `
      <strong>${item.text}</strong>
      <span>${item.role} · ${formatTime(item.start)}-${formatTime(item.end)} · ${item.position}</span>
    `;
    row.addEventListener("click", () => {
      state.selectedTextId = item.id;
      previewTextEvent(item);
      renderScreenText();
    });
    els.screenTextList.appendChild(row);
  });
}

function renderWarnings() {
  els.warningsList.replaceChildren();
  const warnings = state.manifest.quality?.warnings ?? [];
  if (warnings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "event-row";
    empty.innerHTML = "<strong>No review warnings</strong><span>The current plan has no flagged human checks.</span>";
    els.warningsList.appendChild(empty);
    return;
  }

  warnings.forEach((warning) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "event-row";
    row.innerHTML = `
      <strong>${warning.severity}: ${warning.message}</strong>
      <span>${warning.targetId}</span>
    `;
    row.addEventListener("click", () => {
      state.selectedClipId = warning.targetId;
      syncEditor();
      renderTimeline();
    });
    els.warningsList.appendChild(row);
  });
}

function syncEditor() {
  const clip = selectedClip();
  if (!clip) {
    els.clipId.value = "";
    els.decisionSelect.value = "keep";
    els.reasonInput.value = "";
    els.transcriptInput.value = "";
    return;
  }
  els.clipId.value = clip.id;
  els.decisionSelect.value = clip.decision;
  els.reasonInput.value = clip.reason;
  els.transcriptInput.value = clip.transcript;
  const seekTime = isRenderedPreview() ? clip.outputStart : clip.sourceStart;
  if (Number.isFinite(seekTime)) {
    els.video.currentTime = seekTime;
  }
}

function previewTextEvent(item) {
  els.overlayPreview.textContent = item.text;
  els.overlayPreview.classList.add("visible");
  window.clearTimeout(previewTextEvent.timeoutId);
  previewTextEvent.timeoutId = window.setTimeout(() => {
    els.overlayPreview.classList.remove("visible");
  }, 2200);
  if (Number.isFinite(item.start)) {
    els.video.currentTime = item.start;
  }
}

function applyEditorChanges() {
  const clip = selectedClip();
  if (!clip) {
    return;
  }
  clip.decision = els.decisionSelect.value;
  clip.reason = els.reasonInput.value.trim();
  clip.transcript = els.transcriptInput.value.trim();
  renderTimeline();
  updateSummary();
  setStatus(`Updated ${clip.id}. Export draft when ready.`);
}

function renderAll() {
  updateSummary();
  renderTimeline();
  renderScreenText();
  renderWarnings();
  syncEditor();
}

async function loadDefaultManifest() {
  try {
    const response = await fetch("../data/current-review.json", { cache: "no-store" })
      .then((current) => (current.ok ? current : fetch("../data/sample-review.json", { cache: "no-store" })));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.manifest = await response.json();
    state.selectedClipId = state.manifest.editDecisions[0]?.id ?? null;
    renderAll();
    attachManifestVideoIfAvailable();
    setStatus("Review manifest loaded.");
  } catch (error) {
    setStatus(`Could not load sample manifest: ${error.message}`, true);
  }
}

function attachManifestVideoIfAvailable() {
  const sourceFile = state.manifest?.project?.sourceFile;
  const preview = previewFile(state.manifest);
  if (preview) {
    els.video.src = routeForProjectFile(preview);
    els.videoPlaceholder.style.display = "none";
    return;
  }
  if (!sourceFile) {
    return;
  }
  els.video.src = `/input/${encodeURIComponent(sourceFile)}`;
  els.videoPlaceholder.style.display = "none";
}

function importManifest(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.manifest = JSON.parse(String(reader.result));
      state.selectedClipId = state.manifest.editDecisions[0]?.id ?? null;
      state.selectedTextId = null;
      renderAll();
      setStatus(`Imported ${file.name}.`);
    } catch (error) {
      setStatus(`Manifest import failed: ${error.message}`, true);
    }
  };
  reader.readAsText(file);
}

function attachVideo(file) {
  const url = URL.createObjectURL(file);
  els.video.src = url;
  els.videoPlaceholder.style.display = "none";
  setStatus(`Attached video: ${file.name}`);
  uploadVideo(file);
}

async function uploadVideo(file) {
  if (!file.size) {
    setStatus("Selected video is 0 bytes. Choose the real exported video file.", true);
    return;
  }
  try {
    const response = await fetch(`/api/upload-video?name=${encodeURIComponent(file.name)}`, {
      method: "PUT",
      body: file,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    setStatus(`Attached and saved for automation: ${payload.savedAs} (${formatBytes(payload.bytes)})`);
  } catch (error) {
    setStatus(`Video attached for preview, but not saved to project: ${error.message}`, true);
  }
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

function exportDraft() {
  if (!state.manifest) {
    setStatus("No manifest loaded.", true);
    return;
  }
  const blob = new Blob([JSON.stringify(state.manifest, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lingman-review-draft.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setStatus("Draft JSON exported.");
}

els.manifestInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    importManifest(file);
  }
});

els.videoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    attachVideo(file);
  }
});

els.exportButton.addEventListener("click", exportDraft);
els.decisionSelect.addEventListener("change", applyEditorChanges);
els.reasonInput.addEventListener("input", applyEditorChanges);
els.transcriptInput.addEventListener("input", applyEditorChanges);

loadDefaultManifest();
