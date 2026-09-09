document.addEventListener('DOMContentLoaded', async () => {
    // Wait for taskbar to load the user
    await new Promise(resolve => setTimeout(resolve, 100));
    
    showDrawingScreen();
});

function showDrawingScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="game-container">
            <div class="drawing-header">
                <div id="timerDisplay">⏱️ 10s</div>
                <div id="phaseDisplay">Draw something!</div>
            </div>
            <div class="container">
                <section class="controls-board">
                    <!-- Brush sizes -->
                    <div class="row">
                        <label class="title"><strong>Size</strong></label>
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
                        <label class="title"><strong>Colors</strong></label>
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

                    <button id="readyBtn" style="display:none;">✅ Finished Drawing</button>
                </section>

                <div class="drawing-area-wrapper">
                    <section class="drawing-board">
                        <canvas id="drawing-canvas"></canvas>
                    </section>
                </div>

                <div class="trash-wrapper">
                    <button id="trashBtn" class="trash-btn">🗑️</button>
                    <button id="undoBtn" class="undo-btn">↩️</button>
                </div>
            </div>
        </div>
    `;
    
    // Initialize drawing tool
    initDrawingTool();
    
    // ===== UNDO SYSTEM =====
    let undoStack = [];
    let isRestoring = false;
    let lastSavedState = '';
    let wasDrawing = false;
    
    function saveState() {
        if (isRestoring) return;
        const canvas = document.getElementById('drawing-canvas');
        if (!canvas) return;
        const state = canvas.toDataURL();
        
        // Skip if canvas hasn't changed
        if (state === lastSavedState) return;
        
        undoStack.push(state);
        lastSavedState = state;
        if (undoStack.length > 50) undoStack.shift();
        updateUndoButton();
    }
    
    function undo() {
        if (undoStack.length <= 1) return;
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        isRestoring = true;
        undoStack.pop();
        const previousState = undoStack[undoStack.length - 1];
        lastSavedState = previousState;
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            strokes = [];
            currentStroke = [];
            isRestoring = false;
            updateUndoButton();
        };
        img.src = previousState;
    }
    
    function updateUndoButton() {
        const btn = document.getElementById('undoBtn');
        if (btn) {
            btn.disabled = undoStack.length <= 1;
        }
    }
    
    // Save initial state
    setTimeout(() => {
        const canvas = document.getElementById('drawing-canvas');
        if (canvas) {
            const initialState = canvas.toDataURL();
            undoStack.push(initialState);
            lastSavedState = initialState;
            updateUndoButton();
        }
    }, 200);
    
    // Check for when drawing stops - save state only when a stroke completes
    setInterval(function() {
        const canvas = document.getElementById('drawing-canvas');
        if (!canvas) return;
        
        // Check if we were drawing and now we're not (stroke just completed)
        if (wasDrawing && !isDrawing) {
            // Stroke completed! Save the state.
            saveState();
        }
        
        // Update wasDrawing for next check
        wasDrawing = isDrawing;
    }, 100);
    
    // Trash button
    document.getElementById('trashBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to erase your drawing?')) {
            const result = getCanvas();
            const canvas = result.canvas;
            const ctx = result.ctx;
            if (ctx && canvas) {
                saveState();
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                if (typeof strokes !== 'undefined') {
                    strokes = [];
                    currentStroke = [];
                }
                lastSavedState = canvas.toDataURL();
                updateUndoButton();
            }
        }
    });
    
    // Undo button
    document.getElementById('undoBtn').addEventListener('click', undo);
    
    // ===== ERASER TOOL =====
    let isEraserActive = false;
    let previousColor = '#000000';
    const eraserOption = document.getElementById('eraserOption');
    
    eraserOption.addEventListener('click', function(e) {
        e.stopPropagation();
        isEraserActive = !isEraserActive;
        this.classList.toggle('selected');
        
        if (isEraserActive) {
            // Save current color
            previousColor = selectedColor;
            // Set color to white (eraser)
            selectedColor = '#ffffff';
            if (ctx) ctx.strokeStyle = '#ffffff';
            // Deselect any color option
            document.querySelectorAll('.colors .option').forEach(el => {
                if (el.id !== 'eraserOption') {
                    el.classList.remove('selected');
                }
            });
        } else {
            // Restore previous color
            selectedColor = previousColor;
            if (ctx) ctx.strokeStyle = selectedColor;
            // Re-select the previous color
            document.querySelectorAll('.colors .option').forEach(el => {
                if (el.style.backgroundColor === previousColor) {
                    el.classList.add('selected');
                }
            });
        }
    });
    
    // Override color selection to deactivate eraser
    document.querySelectorAll('.colors .option').forEach(el => {
        if (el.id !== 'eraserOption') {
            el.addEventListener('click', function() {
                if (isEraserActive) {
                    isEraserActive = false;
                    eraserOption.classList.remove('selected');
                    // Restore previous color will happen in the color selection
                }
                // The existing color selection logic will handle the rest
            });
        }
    });
}


// ============ DRAWING TOOL CODE (unchanged from your working version) ============
let canvas = null;
let ctx = null;

function getCanvas() {
    if (!canvas) {
        canvas = document.getElementById('drawing-canvas');
        ctx = canvas?.getContext('2d');
    }
    return { canvas, ctx };
}

let brushSize = 5;
let selectedColor = '#000000';
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
        ctx.strokeStyle = selectedColor;
    }
    const initialSize = document.querySelector('.size-btn.active');
    if (initialSize) {
        brushSize = parseInt(initialSize.dataset.size);
        ctx.lineWidth = brushSize;
    }
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.size-btn');
    if (!btn) return;
    
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brushSize = parseInt(btn.dataset.size);
    if (ctx) ctx.lineWidth = brushSize;
});

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.colors .option');
    if (!btn) return;
    if (btn.id === 'eraserOption') return; // Skip eraser, handled separately
    
    document.querySelectorAll('.colors .option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const color = btn.style.backgroundColor;
    if (color) {
        selectedColor = color;
        if (ctx) ctx.strokeStyle = selectedColor;
        
        // Deactivate eraser if active
        if (isEraserActive) {
            isEraserActive = false;
            const eraserOption = document.getElementById('eraserOption');
            if (eraserOption) {
                eraserOption.classList.remove('selected');
            }
        }
    }
});

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = selectedColor;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
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