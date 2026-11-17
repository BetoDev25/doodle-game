// ===== Screen Management =====
function showLobbyScreen() {
    document.getElementById('game-screen').innerHTML = `
    <div class="lobby-row">
        <div class="offline-lobby-container">
            <h1>Create a sketch</h1>
            <p class="sfw-notice">Create a piece of art, then send it into the aether where another player will pick it up and finish it!</p>
            <button class="findMatchBtn" id="createSketchBtn">Sketch now</button>
        </div>
        <div class="offline-lobby-container">
            <h1>Find a sketch</h1>
            <p class="sfw-notice">Draw from a pool of other users' sketches and finish one!</p>
            <button class="findMatchBtn" id="findSketchBtn">Search now</button>
        </div>
    </div>
`;

    document.getElementById('createSketchBtn').addEventListener('click', createSketch);
    document.getElementById('findSketchBtn').addEventListener('click', finishSketch);
}

showLobbyScreen();

// ===== Sketch Creation Flow =====
function createSketch() {
    showOfflineDrawingScreen({ mode: 'sketch' });
}

async function finishSketch() {
    let drawing;
    try {
        const res = await fetch('/api/offlineDrawing', { credentials: 'same-origin' });
        if (!res.ok) {
            showToast('No sketches available right now. Try again later!');
            return;
        }
        drawing = await res.json();
    } catch (err) {
        showToast('Could not fetch a sketch.');
        return;
    }

    showOfflineDrawingScreen({ mode: 'finish', drawing });
}

function showOfflineDrawingScreen({ mode, drawing = null }) {
    document.getElementById('game-screen').innerHTML = `
        <div class="game-container">
            <div class="drawing-header">
                <div id="phaseDisplay">${mode === 'sketch' ? 'Draw something!' : 'Complete the sketch!'}</div>
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

                    <!-- Background color button (below colors) -->
                    <div class="row">
                        <button id="backgroundColorBtn" class="background-color-btn" style="background-color: #ffffff;" title="Set background to current color"></button>
                    </div>

                    <button id="readyBtn" class="submit-sketch-btn" style="display:block;">Submit sketch</button>
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

    initDrawingTool();
    wireOptionalDrawingControls();   // wires #backgroundColorBtn + #saveBtn

    if (mode === 'finish' && drawing) {
        const doodleCanvas = document.getElementById('doodle-canvas');
        renderDoodleStrokes(
            doodleCanvas.getContext('2d'),
            drawing.doodle_strokes,
            doodleCanvas.width,
            doodleCanvas.height
        );
    }

    const readyBtn= document.getElementById('readyBtn');
    if (mode === 'sketch') {
        readyBtn.textContent = 'Submit sketch';
        readyBtn.addEventListener('click', submitSketch);
    } else {
        readyBtn.textContent = 'Submit drawing';
        readyBtn.addEventListener('click', () => submitFinishedDrawing(drawing.id));
    }
}

async function submitSketch() {
    if (isDrawingLayerEmpty()) {
        showToast('Your sketch is empty — draw something first!');
        return;
    }

    if (!confirm('Are you sure you want to submit your sketch? You won\'t be able to edit it afterward.')) return;

    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) readyBtn.disabled = true;

    try {
        const res = await fetch('/api/drawings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                doodle_strokes: getStrokes(),
                is_offline: true,
            }),
        });

        if (!res.ok) {
            let msg = 'Sketch could not be submitted.';
            try {
                const data = await res.json();
                if (data && data.error) msg = data.error;
            } catch (_) { /* non-JSON body */ }
            showToast(msg);
            if (readyBtn) readyBtn.disabled = false;
            return;
        }

        sessionStorage.setItem('justFinishedSketch', 'true');
        window.location.href = '/play/offline/';
    } catch (err) {
        showToast('Sketch could not be submitted.');
        if (readyBtn) readyBtn.disabled = false;
    }
}

async function submitFinishedDrawing(drawingId) {
    if (isDrawingLayerEmpty()) {
        showToast('You haven\'t added anything yet — finish the drawing first!');
        return;
    }

    if (!confirm('Are you sure you want to submit your finished drawing? You won\'t be able to edit it afterward.')) return;

    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) readyBtn.disabled = true;

    try {
        const res = await fetch(`/api/offlineDrawing/${drawingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                finished_strokes: getStrokes(),
            }),
        });

        if (!res.ok) {
            let msg = 'Drawing could not be submitted.';
            if (res.status === 409) {
                msg = 'Someone else already finished this sketch. Try another one!';
            } else {
                try {
                    const data = await res.json();
                    if (data && data.error) msg = data.error;
                } catch (_) {}
            }
            showToast(msg);
            if (readyBtn) readyBtn.disabled = false;
            return;
        }

        sessionStorage.setItem('justFinishedDrawing', 'true');
        window.location.href = '/play/offline/';
    } catch (err) {
        showToast('Drawing could not be submitted.');
        if (readyBtn) readyBtn.disabled = false;
    }
}

function isDrawingLayerEmpty() {
    const c = document.getElementById('drawing-canvas');
    if (!c) return true;
    const cx = c.getContext('2d');
    const { width, height } = c;
    if (width === 0 || height === 0) return true;

    const data = cx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) {   // alpha channel
        if (data[i] !== 0) return false;
    }
    return true;
}