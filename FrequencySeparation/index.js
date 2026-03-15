/**
 * Frequency Separation - Architectural Retouching
 * UXP Plugin for Adobe Photoshop
 *
 * Supports 8-bit and 16-bit workflows with Gaussian and Surface blur modes.
 * Designed for architectural photography retouching.
 */

const { app, action, core } = require("photoshop");
const { entrypoints } = require("uxp");
const { executeAsModal } = core;

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = {
  facade:   { mode: "gaussian", gaussianRadius: 6,  label: "Facade" },
  concrete: { mode: "surface",  surfaceRadius: 12, surfaceThreshold: 20, label: "Concrete" },
  glass:    { mode: "gaussian", gaussianRadius: 20, label: "Glass/Reflections" },
  sky:      { mode: "gaussian", gaussianRadius: 40, label: "Sky / Background" },
  detail:   { mode: "gaussian", gaussianRadius: 3,  label: "Fine Detail" },
  broad:    { mode: "gaussian", gaussianRadius: 60, label: "Broad Tone" },
};

// ─── DOM References (populated on panel show) ────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let els = {};

// ─── State ───────────────────────────────────────────────────────────────────

let currentMode = "gaussian";

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function syncSlider(slider, input) {
  slider.addEventListener("input", () => { input.value = slider.value; });
  input.addEventListener("input", () => {
    const v = Math.max(slider.min, Math.min(slider.max, parseInt(input.value) || 0));
    slider.value = v;
    input.value = v;
  });
}

function setMode(mode) {
  currentMode = mode;
  els.gaussianSettings.classList.toggle("hidden", mode !== "gaussian");
  els.surfaceSettings.classList.toggle("hidden", mode !== "surface");
  $$(".radio-option").forEach((el) => el.classList.remove("selected"));
  $(`#opt-${mode}`).classList.add("selected");
}

function showStatus(msg, type = "working") {
  els.status.textContent = msg;
  els.status.className = `status ${type}`;
  els.status.classList.remove("hidden");
  if (type !== "working") {
    setTimeout(() => els.status.classList.add("hidden"), 4000);
  }
}

function hideStatus() {
  els.status.classList.add("hidden");
}

function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  setMode(p.mode);
  $(`input[name="blurMode"][value="${p.mode}"]`).checked = true;

  if (p.mode === "gaussian") {
    els.gaussianRadius.value = p.gaussianRadius;
    els.gaussianRadiusVal.value = p.gaussianRadius;
  } else {
    els.surfaceRadius.value = p.surfaceRadius;
    els.surfaceRadiusVal.value = p.surfaceRadius;
    els.surfaceThreshold.value = p.surfaceThreshold;
    els.surfaceThresholdVal.value = p.surfaceThreshold;
  }

  showStatus(`Preset: ${p.label}`, "success");
}

async function updateDocInfo() {
  try {
    const doc = app.activeDocument;
    if (!doc) {
      els.bitDepth.textContent = "No document";
      els.docSize.textContent = "";
      return;
    }
    els.bitDepth.textContent = `${doc.bitsPerChannel}-bit`;
    els.docSize.textContent = `${doc.width}×${doc.height}px`;
  } catch {
    els.bitDepth.textContent = "--";
    els.docSize.textContent = "--";
  }
}

// ─── Photoshop BatchPlay Commands ────────────────────────────────────────────

/**
 * Duplicate the active layer
 */
function bpDuplicateLayer(name) {
  return [{
    _obj: "duplicate",
    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    name: name,
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Rename the active layer
 */
function bpRenameLayer(name) {
  return [{
    _obj: "set",
    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    to: { _obj: "layer", name: name },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Gaussian Blur on active layer
 */
function bpGaussianBlur(radius) {
  return [{
    _obj: "gaussianBlur",
    radius: { _unit: "pixelsUnit", _value: radius },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Surface Blur on active layer
 */
function bpSurfaceBlur(radius, threshold) {
  return [{
    _obj: "surfaceBlur",
    radius: radius,
    threshold: threshold,
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Apply Image for 8-bit: Subtract, Scale 2, Offset 128
 * Source is the low frequency layer
 */
function bpApplyImage8bit(docName, sourceLayerName) {
  return [{
    _obj: "applyImageEvent",
    with: {
      _obj: "calculation",
      to: {
        _ref: [
          { _ref: "channel", _enum: "channel", _value: "RGB" },
          { _ref: "layer", _name: sourceLayerName },
          { _ref: "document", _name: docName }
        ]
      },
      calculation: { _enum: "calculationType", _value: "subtract" },
      scale: 2,
      offset: 128
    },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Apply Image for 16-bit: Add, Scale 2, Offset 0, Invert source
 */
function bpApplyImage16bit(docName, sourceLayerName) {
  return [{
    _obj: "applyImageEvent",
    with: {
      _obj: "calculation",
      to: {
        _ref: [
          { _ref: "channel", _enum: "channel", _value: "RGB" },
          { _ref: "layer", _name: sourceLayerName },
          { _ref: "document", _name: docName }
        ]
      },
      calculation: { _enum: "calculationType", _value: "add" },
      scale: 2,
      offset: 0,
      invert: true
    },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Set layer blend mode
 */
function bpSetBlendMode(blendMode) {
  return [{
    _obj: "set",
    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    to: { _obj: "layer", mode: { _enum: "blendMode", _value: blendMode } },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Select a layer by name
 */
function bpSelectLayer(name) {
  return [{
    _obj: "select",
    _target: [{ _ref: "layer", _name: name }],
    makeVisible: false,
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Stamp visible (merge visible to new layer)
 */
function bpStampVisible() {
  return [{
    _obj: "mergeVisible",
    duplicate: true,
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Add a layer mask (reveal all = empty white mask)
 * To get an "empty" mask for painting, we use reveal all
 */
function bpAddLayerMask() {
  return [{
    _obj: "make",
    new: { _class: "channel" },
    at: { _ref: "channel", _enum: "channel", _value: "mask" },
    using: { _enum: "userMaskEnabled", _value: "revealAll" },
    _options: { dialogOptions: "dontDisplay" }
  }];
}

/**
 * Group selected layers
 */
function bpGroupLayers(name) {
  return [
    {
      _obj: "groupEvent",
      name: name,
      _options: { dialogOptions: "dontDisplay" }
    }
  ];
}

/**
 * Select multiple layers by name
 */
function bpSelectMultipleLayers(names) {
  const cmds = [];
  names.forEach((name, i) => {
    cmds.push({
      _obj: "select",
      _target: [{ _ref: "layer", _name: name }],
      makeVisible: false,
      selectionModifier: i === 0
        ? { _enum: "selectionModifierType", _value: "removeFromSelection" }
        : { _enum: "selectionModifierType", _value: "addToSelection" },
      _options: { dialogOptions: "dontDisplay" }
    });
  });
  // First one should set selection, rest add to it
  cmds[0].selectionModifier = undefined;
  return cmds;
}

/**
 * Flatten (merge) a layer group
 */
function bpFlattenGroup() {
  return [{
    _obj: "mergeLayersNew",
    _options: { dialogOptions: "dontDisplay" }
  }];
}

// ─── Core Frequency Separation Logic ─────────────────────────────────────────

async function performSeparation() {
  const doc = app.activeDocument;
  if (!doc) {
    showStatus("No document open", "error");
    return;
  }

  const is16bit = doc.bitsPerChannel === 16;
  const docName = doc.name;

  const blurMode = currentMode;
  const gaussRadius = parseInt(els.gaussianRadius.value) || 10;
  const surfRadius = parseInt(els.surfaceRadius.value) || 15;
  const surfThresh = parseInt(els.surfaceThreshold.value) || 15;
  const doGroup = els.groupLayers.checked;
  const doMasks = els.addMasks.checked;
  const doFlatten = els.flattenFirst.checked;
  const doSelectHF = els.selectHF.checked;

  const lfName = "LF - Low Frequency";
  const hfName = "HF - High Frequency";
  const groupName = "Frequency Separation";

  showStatus("Separating frequencies...", "working");
  els.btnSeparate.disabled = true;

  try {
    await executeAsModal(async () => {

      // Step 1: Optionally stamp visible
      if (doFlatten) {
        await action.batchPlay(bpStampVisible(), {});
        await action.batchPlay(bpRenameLayer("FS Base"), {});
      }

      // Step 2: Duplicate for Low Frequency
      await action.batchPlay(bpDuplicateLayer(lfName), {});

      // Step 3: Apply blur to Low Frequency layer
      if (blurMode === "gaussian") {
        await action.batchPlay(bpGaussianBlur(gaussRadius), {});
      } else {
        await action.batchPlay(bpSurfaceBlur(surfRadius, surfThresh), {});
      }

      // Step 4: Duplicate LF for High Frequency base, then apply image
      await action.batchPlay(bpDuplicateLayer(hfName), {});

      // Step 5: Apply Image to extract high frequency
      if (is16bit) {
        await action.batchPlay(bpApplyImage16bit(docName, lfName), {});
      } else {
        await action.batchPlay(bpApplyImage8bit(docName, lfName), {});
      }

      // Step 6: Set blend mode to Linear Light
      await action.batchPlay(bpSetBlendMode("linearLight"), {});

      // Step 7: Add masks if requested
      if (doMasks) {
        // Add mask to HF (currently selected)
        await action.batchPlay(bpAddLayerMask(), {});

        // Select LF and add mask
        await action.batchPlay(bpSelectLayer(lfName), {});
        await action.batchPlay(bpAddLayerMask(), {});

        // Go back to HF
        await action.batchPlay(bpSelectLayer(hfName), {});
      }

      // Step 8: Group layers if requested
      if (doGroup) {
        // Select both layers
        await action.batchPlay(bpSelectLayer(hfName), {});
        await action.batchPlay([{
          _obj: "select",
          _target: [{ _ref: "layer", _name: lfName }],
          selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        await action.batchPlay(bpGroupLayers(groupName), {});

        if (doSelectHF) {
          await action.batchPlay(bpSelectLayer(hfName), {});
        }
      } else if (doSelectHF) {
        await action.batchPlay(bpSelectLayer(hfName), {});
      }

    }, { commandName: "Frequency Separation" });

    const blurLabel = blurMode === "gaussian"
      ? `Gaussian R:${gaussRadius}`
      : `Surface R:${surfRadius} T:${surfThresh}`;
    showStatus(`Done! ${is16bit ? "16" : "8"}-bit | ${blurLabel}`, "success");

  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
    console.error("Frequency Separation Error:", err);
  } finally {
    els.btnSeparate.disabled = false;
  }
}

// ─── Flatten Separation ──────────────────────────────────────────────────────

async function flattenSeparation() {
  const doc = app.activeDocument;
  if (!doc) {
    showStatus("No document open", "error");
    return;
  }

  try {
    await executeAsModal(async () => {
      // Try to select the group first
      try {
        await action.batchPlay(bpSelectLayer("Frequency Separation"), {});
        await action.batchPlay(bpFlattenGroup(), {});
        showStatus("Separation flattened", "success");
      } catch {
        showStatus("No 'Frequency Separation' group found", "error");
      }
    }, { commandName: "Flatten Separation" });
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
  }
}

// ─── Panel Setup via UXP Entrypoints ─────────────────────────────────────────

function initDOM() {
  els = {
    gaussianRadius:    $("#gaussianRadius"),
    gaussianRadiusVal: $("#gaussianRadiusVal"),
    surfaceRadius:     $("#surfaceRadius"),
    surfaceRadiusVal:  $("#surfaceRadiusVal"),
    surfaceThreshold:  $("#surfaceThreshold"),
    surfaceThresholdVal: $("#surfaceThresholdVal"),
    gaussianSettings:  $("#gaussianSettings"),
    surfaceSettings:   $("#surfaceSettings"),
    groupLayers:       $("#groupLayers"),
    addMasks:          $("#addMasks"),
    flattenFirst:      $("#flattenFirst"),
    selectHF:          $("#selectHF"),
    btnSeparate:       $("#btnSeparate"),
    btnFlatten:        $("#btnFlatten"),
    status:            $("#status"),
    bitDepth:          $("#bitDepth"),
    docSize:           $("#docSize"),
  };

  // Sync sliders with number inputs
  syncSlider(els.gaussianRadius, els.gaussianRadiusVal);
  syncSlider(els.surfaceRadius, els.surfaceRadiusVal);
  syncSlider(els.surfaceThreshold, els.surfaceThresholdVal);

  // Blur mode toggles
  $$("input[name='blurMode']").forEach((radio) => {
    radio.addEventListener("change", (e) => setMode(e.target.value));
  });

  // Preset buttons
  $$(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  // Action buttons
  els.btnSeparate.addEventListener("click", performSeparation);
  els.btnFlatten.addEventListener("click", flattenSeparation);

  // Update doc info on load and when doc changes
  updateDocInfo();
  try {
    action.addNotificationListener(
      ["set", "select", "open", "close", "newDocument"],
      () => updateDocInfo()
    );
  } catch {
    setInterval(updateDocInfo, 3000);
  }
}

let initialized = false;

try {
  entrypoints.setup({
    panels: {
      freqSepPanel: {
        create(event) {},
        show(event) {
          if (!initialized) {
            initialized = true;
            initDOM();
          }
        },
        hide(event) {},
        destroy(event) {}
      }
    }
  });
} catch (err) {
  console.error("Frequency Separation: entrypoints.setup failed:", err);
}
