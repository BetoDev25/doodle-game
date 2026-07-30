const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');

// === Canvas sizing ===
let brushSize = 5;
let selectedColor = '#000000';

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

// === Tool state ===
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let selectedTool = 'brush';
let strokes = [];
let currentStroke = [];
let isInside = false;

// === Get position (clamped to canvas) ===
function getPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let x = (clientX - rect.left) * (canvas.width / rect.width);
    let y = (clientY - rect.top) * (canvas.height / rect.height);
    x = Math.max(0, Math.min(canvas.width, x));
    y = Math.max(0, Math.min(canvas.height, y));
    return { x, y };
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
    currentStroke = [{ x: pos.x, y: pos.y }];
}

// === Draw function (uses document mousemove) ===
function draw(e) {
    if (!isDrawing) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const inside = checkInside(clientX, clientY);
    const pos = getPos(clientX, clientY);
    const x = pos.x;
    const y = pos.y;
    
    // If we were outside and now inside, start a new stroke (no straight line)
    if (!isInside && inside) {
        // Save the previous stroke if it has points
        if (currentStroke.length > 1) {
            strokes.push({
                points: currentStroke,
                color: selectedColor,
                size: brushSize,
                tool: selectedTool
            });
        }
        // Start a fresh stroke at the entry point
        currentStroke = [{ x, y }];
        lastX = x;
        lastY = y;
        isInside = true;
        return;
    }
    
    // If we just left the canvas, stop drawing (don't add outside points)
    if (isInside && !inside) {
        isInside = false;
        // Save the stroke up to the edge
        if (currentStroke.length > 1) {
            strokes.push({
                points: currentStroke,
                color: selectedColor,
                size: brushSize,
                tool: selectedTool
            });
        }
        currentStroke = [];
        return;
    }
    
    // If we're inside and drawing, draw the line
    if (inside && isDrawing) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        currentStroke.push({ x, y });
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
            strokes.push({
                points: currentStroke,
                color: selectedColor,
                size: brushSize,
                tool: selectedTool
            });
        }
        currentStroke = [];
    }
}

// === Event Listeners ===

// Mouse events (use document for mousemove to track outside canvas)
canvas.addEventListener('mousedown', startDraw);
document.addEventListener('mousemove', draw);
document.addEventListener('mouseup', endDraw);

// Touch events (use document for touchmove to track outside canvas)
canvas.addEventListener('touchstart', startDraw, { passive: false });
document.addEventListener('touchmove', draw, { passive: false });
document.addEventListener('touchend', endDraw, { passive: false });

// === Tool buttons ===
document.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.tool.active')?.classList.remove('active');
        btn.classList.add('active');
        selectedTool = btn.id;
        if (selectedTool === 'eraser') {
            ctx.strokeStyle = '#ffffff';
        } else {
            ctx.strokeStyle = selectedColor;
        }
    });
});

// === Color buttons ===
document.querySelectorAll('.colors .option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.colors .selected')?.classList.remove('selected');
        btn.classList.add('selected');
        const color = btn.style.backgroundColor;
        if (color) {
            selectedColor = color;
            document.getElementById('color-picker').value = rgbToHex(color);
            if (selectedTool !== 'eraser') {
                ctx.strokeStyle = selectedColor;
            }
        }
    });
});

// === Color picker ===
document.getElementById('color-picker').addEventListener('input', (e) => {
    const color = e.target.value;
    selectedColor = color;
    document.querySelector('.colors .selected')?.classList.remove('selected');
    e.target.parentElement.classList.add('selected');
    e.target.parentElement.style.backgroundColor = color;
    if (selectedTool !== 'eraser') {
        ctx.strokeStyle = color;
    }
});

// === Size slider ===
document.getElementById('size-slider').addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    ctx.lineWidth = brushSize;
});

// === Clear canvas ===
document.querySelector('.clear-canvas').addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    currentStroke = [];
});

// === Save image ===
document.querySelector('.save-img').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `doodle-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// === Helper: RGB to Hex ===
function rgbToHex(rgb) {
    const match = rgb.match(/\d+/g);
    if (!match) return '#000000';
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// === Initialize ===
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const initialColor = document.querySelector('.colors .selected');
if (initialColor) {
    initialColor.style.backgroundColor = '#FF0000';
}