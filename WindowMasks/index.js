const { app, action, core } = require("photoshop");
const { entrypoints } = require("uxp");
const { executeAsModal } = core;

const PRESETS = {
  window:      { shape: "rectangle", width: 40, height: 30, feather: 8, rotation: 0, corners: null, label: "Window" },
  door:        { shape: "rectangle", width: 20, height: 50, feather: 5, rotation: 0, corners: null, label: "Door" },
  skyline:     { shape: "rectangle", width: 90, height: 40, feather: 30, rotation: 0, posY: 30, corners: null, label: "Skyline" },
  column:      { shape: "rectangle", width: 10, height: 80, feather: 6, rotation: 0, corners: null, label: "Column" },
  vignette:    { shape: "ellipse",   width: 80, height: 70, feather: 80, rotation: 0, corners: null, label: "Vignette" },
  perspective: { shape: "rectangle", width: 40, height: 40, feather: 4, rotation: 0, corners: { tlX: 5, tlY: 0, trX: -5, trY: 0, blX: 0, blY: 0, brX: 0, brY: 0 }, label: "Perspective" },
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let els = {};
let currentShape = "rectangle";
let currentMaskMode = "reveal";

function syncSlider(slider, input) {
  slider.addEventListener("input", () => { input.value = slider.value; });
  input.addEventListener("input", () => {
    const v = Math.max(Number(slider.min), Math.min(Number(slider.max), parseInt(input.value) || 0));
    slider.value = v;
    input.value = v;
  });
}

function setShape(shape) {
  currentShape = shape;
  els.cornerSection.classList.toggle("hidden", shape !== "rectangle");
  els.polygonSection.classList.toggle("hidden", shape !== "polygon");
  $$(".radio-option").forEach((el) => {
    if (el.id.startsWith("opt-rectangle") || el.id.startsWith("opt-polygon") || el.id.startsWith("opt-ellipse")) {
      el.classList.remove("selected");
    }
  });
  $(`#opt-${shape}`).classList.add("selected");
}

function setMaskMode(mode) {
  currentMaskMode = mode;
  $$("#opt-reveal, #opt-hide").forEach((el) => el.classList.remove("selected"));
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

function resetCorners() {
  ["tlX", "tlY", "trX", "trY", "blX", "blY", "brX", "brY"].forEach((id) => {
    $(`#${id}`).value = 0;
  });
}

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  setShape(p.shape);
  $(`input[name="shapeType"][value="${p.shape}"]`).checked = true;

  els.posX.value = p.posX || 50;
  els.posXVal.value = p.posX || 50;
  els.posY.value = p.posY || 50;
  els.posYVal.value = p.posY || 50;
  els.maskWidth.value = p.width;
  els.maskWidthVal.value = p.width;
  els.maskHeight.value = p.height;
  els.maskHeightVal.value = p.height;
  els.feather.value = p.feather;
  els.featherVal.value = p.feather;
  els.rotation.value = p.rotation;
  els.rotationVal.value = p.rotation;

  if (p.corners) {
    Object.entries(p.corners).forEach(([id, val]) => {
      $(`#${id}`).value = val;
    });
  } else {
    resetCorners();
  }

  showStatus(`Preset: ${p.label}`, "success");
}

async function updateDocInfo() {
  try {
    const doc = app.activeDocument;
    if (!doc) {
      els.docName.textContent = "No document";
      els.docSize.textContent = "";
      return;
    }
    els.docName.textContent = doc.name.length > 24 ? doc.name.substring(0, 22) + "..." : doc.name;
    els.docSize.textContent = `${doc.width} x ${doc.height} px`;
  } catch {
    els.docName.textContent = "--";
    els.docSize.textContent = "--";
  }
}

function getCornerOffsets() {
  return {
    tlX: parseInt($("#tlX").value) || 0,
    tlY: parseInt($("#tlY").value) || 0,
    trX: parseInt($("#trX").value) || 0,
    trY: parseInt($("#trY").value) || 0,
    blX: parseInt($("#blX").value) || 0,
    blY: parseInt($("#blY").value) || 0,
    brX: parseInt($("#brX").value) || 0,
    brY: parseInt($("#brY").value) || 0,
  };
}

function rotatePoint(px, py, cx, cy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function buildRectanglePoints(docW, docH) {
  const cx = (parseInt(els.posX.value) / 100) * docW;
  const cy = (parseInt(els.posY.value) / 100) * docH;
  const halfW = ((parseInt(els.maskWidth.value) / 100) * docW) / 2;
  const halfH = ((parseInt(els.maskHeight.value) / 100) * docH) / 2;
  const rot = parseInt(els.rotation.value) || 0;
  const c = getCornerOffsets();

  const warpScale = docW / 100;
  let corners = [
    { x: cx - halfW + c.tlX * warpScale, y: cy - halfH + c.tlY * warpScale },
    { x: cx + halfW + c.trX * warpScale, y: cy - halfH + c.trY * warpScale },
    { x: cx + halfW + c.brX * warpScale, y: cy + halfH + c.brY * warpScale },
    { x: cx - halfW + c.blX * warpScale, y: cy + halfH + c.blY * warpScale },
  ];

  if (rot !== 0) {
    corners = corners.map((p) => rotatePoint(p.x, p.y, cx, cy, rot));
  }

  return corners;
}

function buildPolygonPoints(docW, docH) {
  const cx = (parseInt(els.posX.value) / 100) * docW;
  const cy = (parseInt(els.posY.value) / 100) * docH;
  const halfW = ((parseInt(els.maskWidth.value) / 100) * docW) / 2;
  const halfH = ((parseInt(els.maskHeight.value) / 100) * docH) / 2;
  const rot = parseInt(els.rotation.value) || 0;
  const sides = parseInt(els.polySides.value) || 4;

  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    let px = cx + halfW * Math.cos(angle);
    let py = cy + halfH * Math.sin(angle);
    if (rot !== 0) {
      const rp = rotatePoint(px, py, cx, cy, rot);
      px = rp.x;
      py = rp.y;
    }
    points.push({ x: px, y: py });
  }
  return points;
}

function buildEllipseDesc(docW, docH) {
  const cx = (parseInt(els.posX.value) / 100) * docW;
  const cy = (parseInt(els.posY.value) / 100) * docH;
  const halfW = ((parseInt(els.maskWidth.value) / 100) * docW) / 2;
  const halfH = ((parseInt(els.maskHeight.value) / 100) * docH) / 2;
  return {
    top: cy - halfH,
    left: cx - halfW,
    bottom: cy + halfH,
    right: cx + halfW,
  };
}

function pointsToPathDesc(points) {
  return points.map((pt) => ({
    _obj: "pathPoint",
    anchor: { _obj: "point", horizontal: { _unit: "pixelsUnit", _value: pt.x }, vertical: { _unit: "pixelsUnit", _value: pt.y } },
    leftDirection: { _obj: "point", horizontal: { _unit: "pixelsUnit", _value: pt.x }, vertical: { _unit: "pixelsUnit", _value: pt.y } },
    rightDirection: { _obj: "point", horizontal: { _unit: "pixelsUnit", _value: pt.x }, vertical: { _unit: "pixelsUnit", _value: pt.y } },
    smooth: false,
  }));
}

async function applyWindowMask() {
  const doc = app.activeDocument;
  if (!doc) {
    showStatus("No document open", "error");
    return;
  }

  const docW = doc.width;
  const docH = doc.height;
  const featherPx = parseInt(els.feather.value) || 0;
  const opacity = parseInt(els.maskOpacity.value) || 100;
  const isReveal = currentMaskMode === "reveal";
  const onNewLayer = els.newLayer.checked;
  const doSoftEdge = els.softEdge.checked;
  const rot = parseInt(els.rotation.value) || 0;

  showStatus("Creating window mask...", "working");
  els.btnApplyMask.disabled = true;

  try {
    await executeAsModal(async () => {

      if (onNewLayer) {
        await action.batchPlay([{
          _obj: "make",
          _target: [{ _ref: "layer" }],
          using: { _obj: "layer", name: `Window Mask — ${currentShape}` },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }

      if (currentShape === "ellipse") {
        const bounds = buildEllipseDesc(docW, docH);
        const selDesc = {
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: {
            _obj: "ellipse",
            top: { _unit: "pixelsUnit", _value: bounds.top },
            left: { _unit: "pixelsUnit", _value: bounds.left },
            bottom: { _unit: "pixelsUnit", _value: bounds.bottom },
            right: { _unit: "pixelsUnit", _value: bounds.right },
          },
          feather: { _unit: "pixelsUnit", _value: featherPx },
          antiAlias: true,
          _options: { dialogOptions: "dontDisplay" }
        };
        await action.batchPlay([selDesc], {});

        if (rot !== 0) {
          await action.batchPlay([{
            _obj: "rotateEventEnum",
            _target: [{ _ref: "channel", _property: "selection" }],
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            angle: { _unit: "angleUnit", _value: rot },
            _options: { dialogOptions: "dontDisplay" }
          }], {});
        }
      } else {
        const points = currentShape === "rectangle"
          ? buildRectanglePoints(docW, docH)
          : buildPolygonPoints(docW, docH);

        const pathPointDescs = pointsToPathDesc(points);

        await action.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "path", _property: "workPath" }],
          to: {
            _obj: "path",
            pathComponents: [{
              _obj: "pathComponent",
              shapeOperation: { _enum: "shapeOperation", _value: "xor" },
              subpathListKey: [{
                _obj: "subpath",
                closedSubpath: true,
                points: pathPointDescs,
              }]
            }]
          },
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        await action.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: { _ref: "path", _property: "workPath" },
          feather: { _unit: "pixelsUnit", _value: featherPx },
          antiAlias: true,
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        try {
          await action.batchPlay([{
            _obj: "delete",
            _target: [{ _ref: "path", _property: "workPath" }],
            _options: { dialogOptions: "dontDisplay" }
          }], {});
        } catch { }
      }

      const fillColor = isReveal
        ? { _obj: "RGBColor", red: 255, grain: 255, blue: 255 }
        : { _obj: "RGBColor", red: 0, grain: 0, blue: 0 };

      const fillOpacity = opacity < 100
        ? { _unit: "percentUnit", _value: opacity }
        : { _unit: "percentUnit", _value: 100 };

      await action.batchPlay([{
        _obj: "fill",
        using: { _enum: "fillContents", _value: "color" },
        color: fillColor,
        opacity: fillOpacity,
        mode: { _enum: "blendMode", _value: "normal" },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      await action.batchPlay([{
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _enum: "ordinal", _value: "none" },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      if (doSoftEdge && featherPx > 0) {
        await action.batchPlay([{
          _obj: "gaussianBlur",
          radius: { _unit: "pixelsUnit", _value: Math.round(featherPx * 0.5) },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }

      try {
        await action.batchPlay([{
          _obj: "make",
          new: { _class: "channel" },
          at: { _ref: "channel", _enum: "channel", _value: "mask" },
          using: { _enum: "userMaskEnabled", _value: "revealAll" },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      } catch (e) {
        console.warn("Mask creation skipped:", e.message);
      }

    }, { commandName: "Apply Window Mask" });

    showStatus(`${currentShape} mask applied`, "success");
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
    console.error("Window Mask Error:", err);
  } finally {
    els.btnApplyMask.disabled = false;
  }
}

async function applyMaskToAdjustment() {
  const doc = app.activeDocument;
  if (!doc) {
    showStatus("No document open", "error");
    return;
  }

  const docW = doc.width;
  const docH = doc.height;
  const featherPx = parseInt(els.feather.value) || 0;
  const isReveal = currentMaskMode === "reveal";
  const rot = parseInt(els.rotation.value) || 0;

  showStatus("Creating adjustment with mask...", "working");

  try {
    await executeAsModal(async () => {
      await action.batchPlay([{
        _obj: "make",
        _target: [{ _ref: "adjustmentLayer" }],
        using: {
          _obj: "adjustmentLayer",
          type: { _obj: "curves" }
        },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      await action.batchPlay([{
        _obj: "set",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "layer", name: "Window Mask Curves" },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      if (currentShape === "ellipse") {
        const bounds = buildEllipseDesc(docW, docH);
        await action.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: {
            _obj: "ellipse",
            top: { _unit: "pixelsUnit", _value: bounds.top },
            left: { _unit: "pixelsUnit", _value: bounds.left },
            bottom: { _unit: "pixelsUnit", _value: bounds.bottom },
            right: { _unit: "pixelsUnit", _value: bounds.right },
          },
          feather: { _unit: "pixelsUnit", _value: featherPx },
          antiAlias: true,
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        if (rot !== 0) {
          await action.batchPlay([{
            _obj: "rotateEventEnum",
            _target: [{ _ref: "channel", _property: "selection" }],
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            angle: { _unit: "angleUnit", _value: rot },
            _options: { dialogOptions: "dontDisplay" }
          }], {});
        }
      } else {
        const points = currentShape === "rectangle"
          ? buildRectanglePoints(docW, docH)
          : buildPolygonPoints(docW, docH);

        const pathPointDescs = pointsToPathDesc(points);

        await action.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "path", _property: "workPath" }],
          to: {
            _obj: "path",
            pathComponents: [{
              _obj: "pathComponent",
              shapeOperation: { _enum: "shapeOperation", _value: "xor" },
              subpathListKey: [{
                _obj: "subpath",
                closedSubpath: true,
                points: pathPointDescs,
              }]
            }]
          },
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        await action.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: { _ref: "path", _property: "workPath" },
          feather: { _unit: "pixelsUnit", _value: featherPx },
          antiAlias: true,
          _options: { dialogOptions: "dontDisplay" }
        }], {});

        try {
          await action.batchPlay([{
            _obj: "delete",
            _target: [{ _ref: "path", _property: "workPath" }],
            _options: { dialogOptions: "dontDisplay" }
          }], {});
        } catch { }
      }

      try {
        await action.batchPlay([{
          _obj: "delete",
          _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      } catch { }

      const maskFrom = isReveal ? "revealSelection" : "hideSelection";
      try {
        await action.batchPlay([{
          _obj: "make",
          new: { _class: "channel" },
          at: { _ref: "channel", _enum: "channel", _value: "mask" },
          using: { _enum: "userMaskEnabled", _value: maskFrom },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      } catch (e) {
        console.warn("Adjustment mask failed:", e.message);
      }

      await action.batchPlay([{
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _enum: "ordinal", _value: "none" },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

    }, { commandName: "Apply Mask to Adjustment" });

    showStatus("Curves adjustment with window mask created", "success");
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
    console.error("Adjustment mask error:", err);
  }
}

async function invertCurrentMask() {
  const doc = app.activeDocument;
  if (!doc) { showStatus("No document open", "error"); return; }

  try {
    await executeAsModal(async () => {
      await action.batchPlay([{
        _obj: "select",
        _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
        _options: { dialogOptions: "dontDisplay" }
      }], {});
      await action.batchPlay([{
        _obj: "invert",
        _options: { dialogOptions: "dontDisplay" }
      }], {});
      await action.batchPlay([{
        _obj: "select",
        _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }],
        _options: { dialogOptions: "dontDisplay" }
      }], {});
    }, { commandName: "Invert Mask" });
    showStatus("Mask inverted", "success");
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
  }
}

async function deleteCurrentMask() {
  const doc = app.activeDocument;
  if (!doc) { showStatus("No document open", "error"); return; }

  try {
    await executeAsModal(async () => {
      await action.batchPlay([{
        _obj: "delete",
        _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
        apply: false,
        _options: { dialogOptions: "dontDisplay" }
      }], {});
    }, { commandName: "Delete Mask" });
    showStatus("Mask deleted", "success");
  } catch (err) {
    showStatus("No mask on current layer", "error");
  }
}

function initDOM() {
  els = {
    posX: $("#posX"), posXVal: $("#posXVal"),
    posY: $("#posY"), posYVal: $("#posYVal"),
    maskWidth: $("#maskWidth"), maskWidthVal: $("#maskWidthVal"),
    maskHeight: $("#maskHeight"), maskHeightVal: $("#maskHeightVal"),
    feather: $("#feather"), featherVal: $("#featherVal"),
    rotation: $("#rotation"), rotationVal: $("#rotationVal"),
    maskOpacity: $("#maskOpacity"), maskOpacityVal: $("#maskOpacityVal"),
    polySides: $("#polySides"), polySidesVal: $("#polySidesVal"),
    cornerSection: $("#cornerSection"),
    polygonSection: $("#polygonSection"),
    newLayer: $("#newLayer"),
    softEdge: $("#softEdge"),
    btnApplyMask: $("#btnApplyMask"),
    btnInvertMask: $("#btnInvertMask"),
    btnDeleteMask: $("#btnDeleteMask"),
    btnApplyToAdj: $("#btnApplyToAdj"),
    btnResetCorners: $("#btnResetCorners"),
    status: $("#status"),
    docName: $("#docName"),
    docSize: $("#docSize"),
  };

  syncSlider(els.posX, els.posXVal);
  syncSlider(els.posY, els.posYVal);
  syncSlider(els.maskWidth, els.maskWidthVal);
  syncSlider(els.maskHeight, els.maskHeightVal);
  syncSlider(els.feather, els.featherVal);
  syncSlider(els.rotation, els.rotationVal);
  syncSlider(els.maskOpacity, els.maskOpacityVal);
  syncSlider(els.polySides, els.polySidesVal);

  $$("input[name='shapeType']").forEach((radio) => {
    radio.addEventListener("change", (e) => setShape(e.target.value));
  });

  $$("input[name='maskMode']").forEach((radio) => {
    radio.addEventListener("change", (e) => setMaskMode(e.target.value));
  });

  $$(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  els.btnApplyMask.addEventListener("click", applyWindowMask);
  els.btnInvertMask.addEventListener("click", invertCurrentMask);
  els.btnDeleteMask.addEventListener("click", deleteCurrentMask);
  els.btnApplyToAdj.addEventListener("click", applyMaskToAdjustment);
  els.btnResetCorners.addEventListener("click", resetCorners);

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
      windowMasksPanel: {
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
  console.error("Window Masks: entrypoints.setup failed:", err);
}
