// ============ DRAWING TOOL ============
// Owns the three-canvas stack (background / doodle / drawing), stroke capture,
// stroke replay, undo, trash, and the eraser tool.
//
// The canvas elements are created by game.js's showDrawingScreen() before
// initDrawingTool() is called. We look them up at init time, not at file load.

let backgroundCanvas = null;
let backgroundCtx = null;
let doodleCanvas = null;
let doodleCtx = null;
let canvas = null;         // the drawing (top) layer
let ctx = null;

let brushSize = 5;
let selectedColor = '#000000';   // null => eraser mode
let isDrawing = false;
let isEraserActive = false;
let lastX = 0;
let lastY = 0;
let strokes = [];                // drawing-layer strokes only; erases are { color: null }
let currentStroke = [];
let isInside = false;

// Undo state
let undoStack = [];              // [{ image: dataURL, strokeCount: number }]
let isRestoring = false;
let lastSavedState = '';
let wasDrawing = false;
let undoIntervalId = null;

function getCanvas() {
    if (!canvas) {
        backgroundCanvas = document.getElementById('background-canvas');
        backgroundCtx = backgroundCanvas?.getContext('2d');
        doodleCanvas = document.getElementById('doodle-canvas');
        doodleCtx = doodleCanvas?.getContext('2d');
        canvas = document.getElementById('drawing-canvas');
        ctx = canvas?.getContext('2d');
    }
    return { canvas, ctx };
}

function initDrawingTool() {
    const result = getCanvas();
    canvas = result.canvas;
    ctx = result.ctx;

    if (!canvas || !ctx) {
        console.error('Canvas not found');
        return;
    }

    // Reset per-match state in case a previous match left values behind.
    strokes = [];
    currentStroke = [];
    undoStack = [];
    lastSavedState = '';
    isRestoring = false;
    wasDrawing = false;
    isDrawing = false;
    isInside = false;
    isEraserActive = false;

    resizeCanvas();
    bindEvents();
    bindControlEvents();
    bindUndoAndTrash();
    bindEraser();

    // Read initial color and size from the DOM
    const initialColor = document.querySelector('.colors .option.selected');
    if (initialColor && initialColor.id !== 'eraserOption') {
        selectedColor = initialColor.style.backgroundColor || '#000000';
    } else {
        selectedColor = '#000000';
    }

    const initialSize = document.querySelector('.size-btn.active');
    if (initialSize) {
        brushSize = parseInt(initialSize.dataset.size);
    }

    // Seed the undo stack with the empty drawing layer.
    setTimeout(() => {
        if (!canvas) return;
        const initialState = canvas.toDataURL();
        undoStack.push({ image: initialState, strokeCount: 0 });
        lastSavedState = initialState;
        updateUndoButton();
    }, 200);

    // Watch for stroke completion -> snapshot
    if (undoIntervalId) clearInterval(undoIntervalId);
    undoIntervalId = setInterval(() => {
        if (!canvas) return;
        if (wasDrawing && !isDrawing) {
            saveState();
        }
        wasDrawing = isDrawing;
    }, 100);
}

// ===== Canvas sizing =====

function resizeCanvas() {
    // All three layers share the same rect and pixel dimensions.
    const rect = canvas.getBoundingClientRect();

    for (const c of [backgroundCanvas, doodleCanvas, canvas]) {
        if (!c) continue;
        c.width = rect.width;
        c.height = rect.height;
    }

    // Background: solid color (white for now).
    backgroundCtx.globalCompositeOperation = 'source-over';
    backgroundCtx.fillStyle = '#ffffff';
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    // Doodle layer starts transparent.
    doodleCtx.globalCompositeOperation = 'source-over';
    doodleCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);

    // Drawing layer starts transparent.
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    if (selectedColor) {
        ctx.strokeStyle = selectedColor;
    }
}

// ===== Coordinate helpers =====

function getPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let x = (clientX - rect.left) * (canvas.width / rect.width);
    let y = (clientY - rect.top) * (canvas.height / rect.height);
    x = Math.max(0, Math.min(canvas.width, x));
    y = Math.max(0, Math.min(canvas.height, y));
    return { x, y };
}

function toRelative(x, y) {
    return { x: x / canvas.width, y: y / canvas.height };
}

function checkInside(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
           clientY >= rect.top && clientY <= rect.bottom;
}

// ===== Stroke capture =====

function startDraw(e) {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (!checkInside(clientX, clientY)) return;

    isDrawing = true;
    isInside = true;
    const pos = getPos(clientX, clientY);
    lastX = pos.x;
    lastY = pos.y;
    const rel = toRelative(pos.x, pos.y);
    currentStroke = [{ x: rel.x, y: rel.y }];
}

function draw(e) {
    if (!isDrawing) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const inside = checkInside(clientX, clientY);
    const pos = getPos(clientX, clientY);
    const x = pos.x;
    const y = pos.y;
    const rel = toRelative(x, y);

    if (!isInside && inside) {
        if (currentStroke.length > 1) {
            strokes.push({ points: currentStroke, color: selectedColor, size: brushSize });
        }
        currentStroke = [{ x: rel.x, y: rel.y }];
        lastX = x;
        lastY = y;
        isInside = true;
        return;
    }

    if (isInside && !inside) {
        isInside = false;
        if (currentStroke.length > 1) {
            strokes.push({ points: currentStroke, color: selectedColor, size: brushSize });
        }
        currentStroke = [];
        return;
    }

    if (inside && isDrawing) {
        ctx.globalCompositeOperation = (selectedColor === null) ? 'destination-out' : 'source-over';
        if (selectedColor !== null) {
            ctx.strokeStyle = selectedColor;
        }
        ctx.lineWidth = brushSize;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';

        currentStroke.push({ x: rel.x, y: rel.y });
        lastX = x;
        lastY = y;
    }
}

function endDraw(e) {
    if (isDrawing) {
        isDrawing = false;
        isInside = false;
        if (currentStroke.length > 1) {
            strokes.push({ points: currentStroke, color: selectedColor, size: brushSize });
        }
        currentStroke = [];
    }
}

function bindEvents() {
    canvas.addEventListener('mousedown', startDraw);
    document.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    document.addEventListener('touchmove', draw, { passive: false });
    document.addEventListener('touchend', endDraw, { passive: false });
}

// ===== Controls (size + colors) =====

function bindControlEvents() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.size-btn');
        if (!btn) return;

        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        brushSize = parseInt(btn.dataset.size);
    });

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.colors .option');
        if (!btn) return;
        if (btn.id === 'eraserOption') return; // handled by bindEraser

        document.querySelectorAll('.colors .option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const color = btn.style.backgroundColor;
        if (color) {
            selectedColor = color;

            // Leaving eraser mode
            if (isEraserActive) {
                isEraserActive = false;
                const eraserOption = document.getElementById('eraserOption');
                if (eraserOption) eraserOption.classList.remove('selected');
            }
        }
    });
}

// ===== Eraser =====

function bindEraser() {
    const eraserOption = document.getElementById('eraserOption');
    if (!eraserOption) return;

    eraserOption.addEventListener('click', function(e) {
        e.stopPropagation();
        isEraserActive = !isEraserActive;
        this.classList.toggle('selected');

        if (isEraserActive) {
            selectedColor = null;
            document.querySelectorAll('.colors .option').forEach(el => {
                if (el.id !== 'eraserOption') el.classList.remove('selected');
            });
        } else {
            const selected = document.querySelector('.colors .option.selected');
            if (selected && selected.id !== 'eraserOption') {
                selectedColor = selected.style.backgroundColor;
            } else {
                selectedColor = '#000000';
            }
        }
    });
}

// ===== Undo + Trash =====

function saveState() {
    if (isRestoring) return;
    if (!canvas) return;
    const state = canvas.toDataURL();

    if (state === lastSavedState) return;

    undoStack.push({ image: state, strokeCount: strokes.length });
    lastSavedState = state;
    if (undoStack.length > 50) undoStack.shift();
    updateUndoButton();
}

function undo() {
    if (undoStack.length <= 1) return;
    if (!canvas || !ctx) return;

    isRestoring = true;
    undoStack.pop();
    const previous = undoStack[undoStack.length - 1];
    lastSavedState = previous.image;

    const img = new Image();
    img.onload = function() {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Keep the stroke array in lockstep with the bitmap
        strokes = strokes.slice(0, previous.strokeCount);
        currentStroke = [];

        isRestoring = false;
        updateUndoButton();
    };
    img.src = previous.image;
}

function updateUndoButton() {
    const btn = document.getElementById('undoBtn');
    if (btn) btn.disabled = undoStack.length <= 1;
}

function bindUndoAndTrash() {
    const trashBtn = document.getElementById('trashBtn');
    if (trashBtn) {
        trashBtn.addEventListener('click', function() {
            if (!confirm('Are you sure you want to erase your drawing?')) return;
            if (!ctx || !canvas) return;

            saveState();
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            strokes = [];
            currentStroke = [];
            lastSavedState = canvas.toDataURL();
            updateUndoButton();
        });
    }

    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
}

// ===== Public API used by game.js =====

// Returns the drawing-layer strokes (including { color: null } erase strokes).
function getStrokes() {
    return strokes;
}

// Renders the opponent's doodle onto the doodle layer.
// game.js calls this from handleReceiveDoodle.
function renderDoodle(strokesData) {
    if (!doodleCtx || !doodleCanvas) return;
    renderDoodleStrokes(doodleCtx, strokesData, doodleCanvas.width, doodleCanvas.height);
}

// Clears the drawing layer and resets stroke/undo state.
// game.js calls this at swap time, after the doodle has been rendered.
function clearDrawingLayer() {
    if (!ctx || !canvas) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes = [];
    currentStroke = [];
    undoStack = [];
    lastSavedState = '';

    // Re-seed the undo stack with the empty drawing layer.
    const initialState = canvas.toDataURL();
    undoStack.push({ image: initialState, strokeCount: 0 });
    lastSavedState = initialState;
    updateUndoButton();
}