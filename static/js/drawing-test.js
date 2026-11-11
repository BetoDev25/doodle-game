document.addEventListener('DOMContentLoaded', async () => {
    // Wait for taskbar to load the user
    await new Promise(resolve => setTimeout(resolve, 100));

    showDrawingScreen();
});

function showDrawingScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="game-container">
            <div class="drawing-header">
                <div id="phaseDisplay">Draw anything!</div>
            </div>
            <div class="container">
                <section class="controls-board">
                    <!-- Brush sizes -->
                    <div class="row">
                        <ul class="options sizes">
                            <li class="option size-btn active" data-size="3">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="2" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="6">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="5" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="12">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="20">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" fill="#000" />
                                </svg>
                            </li>
                        </ul>
                    </div>

                    <!-- Colors -->
                    <div class="row colors">
                        <ul class="options">
                            <li class="option" style="background-color: #3e3eff;"></li>
                            <li class="option" style="background-color: #5e00c9;"></li>
                            <li class="option" style="background-color: #800080;"></li>
                            <li class="option" style="background-color: #00FF00;"></li>
                            <li class="option" style="background-color: #FFA500;"></li>
                            <li class="option" style="background-color: #FF0000;"></li>
                            <li class="option" style="background-color: #b99b93;"></li>
                            <li class="option" style="background-color: #FFDAB9;"></li>
                            <li class="option" style="background-color: #FFFDC9;"></li>
                            <li class="option selected" style="background-color: #000000;"></li>
                            <li class="option" style="background-color: #c4c4c4;"></li>
                            <li class="option" style="background-color: #FFFFFF; border: 1px solid #ccc;"></li>
                            <li id="eraserOption" class="option eraser-option" title="Eraser">🧹</li>
                        </ul>
                    </div>

                    <!-- Background color button -->
                    <div class="row">
                        <button id="backgroundColorBtn" class="background-color-btn" style="background-color: #ffffff;" title="Set background to current color"></button>
                    </div>

                    <button id="readyBtn" style="display:none;">✅ Finished Drawing</button>
                </section>

                <div class="drawing-area-wrapper">
                    <section class="drawing-board">
                        <canvas id="background-canvas" class="layer-canvas"></canvas>
                        <canvas id="doodle-canvas" class="layer-canvas"></canvas>
                        <canvas id="drawing-canvas" class="layer-canvas"></canvas>
                    </section>
                </div>

                <div class="trash-wrapper">
                    <button id="trashBtn" class="trash-btn">🗑️</button>
                    <button id="undoBtn" class="undo-btn">↩️</button>
                    <button id="saveBtn" class="save-btn">💾</button>
                </div>
            </div>
        </div>
    `;

    // Initialize drawing tool
    initDrawingTool();
}


// ============ DRAWING TOOL CODE ============
let backgroundCanvas = null;
let backgroundCtx = null;
let doodleCanvas = null;
let doodleCtx = null;
let canvas = null;         // the drawing (top) canvas
let ctx = null;

let backgroundColor = '#ffffff';

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

let brushSize = 5;
let isEraserActive = false;
let selectedColor = '#000000';   // null => eraser mode
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let strokes = [];
let currentStroke = [];
let isInside = false;

function initDrawingTool() {
    const result = getCanvas();
    canvas = result.canvas;
    ctx = result.ctx;

    if (!canvas || !ctx) {
        console.error('Canvas not found');
        return;
    }

    resizeCanvas();
    bindEvents();

    const initialColor = document.querySelector('.colors .option.selected');
    if (initialColor) {
        selectedColor = initialColor.style.backgroundColor;
    }
    const initialSize = document.querySelector('.size-btn.active');
    if (initialSize) {
        brushSize = parseInt(initialSize.dataset.size);
    }
}

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
    if (btn.id === 'eraserOption') return; // handled separately

    document.querySelectorAll('.colors .option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const color = btn.style.backgroundColor;
    if (color) {
        selectedColor = color;

        // Deactivate eraser if active
        if (typeof isEraserActive !== 'undefined' && isEraserActive) {
            isEraserActive = false;
            const eraserOption = document.getElementById('eraserOption');
            if (eraserOption) {
                eraserOption.classList.remove('selected');
            }
        }
    }
});

// Fills the background canvas with the current backgroundColor.
function repaintBackground() {
    if (!backgroundCanvas || !backgroundCtx) return;
    backgroundCtx.globalCompositeOperation = 'source-over';
    backgroundCtx.fillStyle = backgroundColor;
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
}

function resizeCanvas() {
    // All three layers share the same rect and pixel dimensions.
    const rect = canvas.getBoundingClientRect();

    for (const c of [backgroundCanvas, doodleCanvas, canvas]) {
        if (!c) continue;
        c.width = rect.width;
        c.height = rect.height;
    }

    // Background: solid color (current backgroundColor).
    repaintBackground();

    // Doodle layer starts transparent.
    doodleCtx.globalCompositeOperation = 'source-over';
    doodleCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);

    // Drawing layer starts transparent.
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stroke settings for the drawing layer
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    if (selectedColor) {
        ctx.strokeStyle = selectedColor;
    }
}

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
        // Choose compositing mode based on whether we're erasing.
        ctx.globalCompositeOperation = (selectedColor === null) ? 'destination-out' : 'source-over';
        if (selectedColor !== null) {
            ctx.strokeStyle = selectedColor;
        }
        ctx.lineWidth = brushSize;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Reset compositing so subsequent non-erase ops behave normally.
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

function getStrokes() {
    return strokes;
}