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
                size: brushSize
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
                size: brushSize
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
                size: brushSize
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

// === Size buttons ===
document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        brushSize = parseInt(btn.dataset.size);
        ctx.lineWidth = brushSize;
    });
});

// === Color buttons ===
document.querySelectorAll('.colors .option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.colors .option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const color = btn.style.backgroundColor;
        if (color) {
            selectedColor = color;
            ctx.strokeStyle = selectedColor;
        }
    });
});

// === Clear canvas ===
document.querySelector('.clear-canvas').addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    currentStroke = [];
});

// === Save image (TESTING - sends stroke data to backend) ===
document.querySelector('.save-img').addEventListener('click', async () => {
    if (strokes.length === 0) {
        alert('No strokes to save! Draw something first.');
        return;
    }

    try {
        const response = await fetch('/api/test-drawing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                strokes: strokes
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Drawing saved! ID: ${data.id}\nStrokes: ${data.stroke_count}`);
            console.log('Saved drawing:', data);
        } else {
            alert(`Error: ${data.error || 'Failed to save'}`);
        }
    } catch (error) {
        alert('Error connecting to server');
        console.error(error);
    }
});

// === Initialize ===
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Set initial color button
const initialColor = document.querySelector('.colors .option.selected');
if (initialColor) {
    selectedColor = initialColor.style.backgroundColor;
    ctx.strokeStyle = selectedColor;
}

// Set initial size button
const initialSize = document.querySelector('.size-btn.active');
if (initialSize) {
    brushSize = parseInt(initialSize.dataset.size);
    ctx.lineWidth = brushSize;
}



document.getElementById('loadDrawingBtn').addEventListener('click', async () => {
    const matchId = document.getElementById('matchIdInput').value.trim();
    const statusDiv = document.getElementById('loadStatus');
    
    if (!matchId) {
        statusDiv.textContent = '❌ Please enter a match ID';
        statusDiv.style.color = 'red';
        return;
    }

    try {
        statusDiv.textContent = '⏳ Loading drawing...';
        statusDiv.style.color = '#333';

        const response = await fetch(`/api/test-drawing/${matchId}`);
        const data = await response.json();

        if (response.ok) {
            statusDiv.textContent = `✅ Loaded ${data.stroke_count} strokes!`;
            statusDiv.style.color = 'green';
            
            // Render the drawing
            renderStrokes(data.strokes);
        } else {
            statusDiv.textContent = `❌ Error: ${data.error || 'Failed to load'}`;
            statusDiv.style.color = 'red';
        }
    } catch (error) {
        statusDiv.textContent = '❌ Error connecting to server';
        statusDiv.style.color = 'red';
        console.error(error);
    }
});

// Render strokes on canvas (clears first)
function renderStrokes(strokesData) {
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw each stroke
    strokesData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }
    });
}