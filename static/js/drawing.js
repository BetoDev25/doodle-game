let canvas = null;
let ctx = null;

function getCanvas() {
    if (!canvas) {
        canvas = document.getElementById('drawing-canvas');
        ctx = canvas?.getContext('2d');
    }
    return { canvas, ctx };
}

// === Canvas sizing ===
let brushSize = 5;
let selectedColor = '#000000';

// === Tool state ===
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let strokes = [];
let currentStroke = [];
let isInside = false;

// === Exported for game.js ===
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

// === Size buttons (Event Delegation) ===
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.size-btn');
    if (!btn) return;
    
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brushSize = parseInt(btn.dataset.size);
    if (ctx) ctx.lineWidth = brushSize;
});

// === Color buttons (Event Delegation) ===
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.colors .option');
    if (!btn) return;
    
    document.querySelectorAll('.colors .option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const color = btn.style.backgroundColor;
    if (color) {
        selectedColor = color;
        if (ctx) ctx.strokeStyle = selectedColor;
    }
});

// === Clear canvas (Event Delegation) ===
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('clear-canvas')) return;
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    currentStroke = [];
});

function getStrokes() {
    return strokes;
}

function renderStrokes(strokesData) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    strokesData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            const first = toAbsolute(stroke.points[0].x, stroke.points[0].y);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < stroke.points.length; i++) {
                const point = toAbsolute(stroke.points[i].x, stroke.points[i].y);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
    });
}

// === Canvas sizing ===
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

// === Get position ===
function getPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let x = (clientX - rect.left) * (canvas.width / rect.width);
    let y = (clientY - rect.top) * (canvas.height / rect.height);
    x = Math.max(0, Math.min(canvas.width, x));
    y = Math.max(0, Math.min(canvas.height, y));
    return { x, y };
}

// === Convert to relative coordinates ===
function toRelative(x, y) {
    return { x: x / canvas.width, y: y / canvas.height };
}

// === Convert from relative to absolute ===
function toAbsolute(relX, relY) {
    return { x: relX * canvas.width, y: relY * canvas.height };
}

// === Check if cursor is inside canvas ===
function checkInside(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
           clientY >= rect.top && clientY <= rect.bottom;
}

// === Start drawing ===
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

// === Draw function ===
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

// === End drawing ===
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

// === Bind Events ===
function bindEvents() {
    canvas.addEventListener('mousedown', startDraw);
    document.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    document.addEventListener('touchmove', draw, { passive: false });
    document.addEventListener('touchend', endDraw, { passive: false });
}



// === NO AUTO-INITIALIZATION ===
// game.js calls initDrawingTool() when the canvas is ready