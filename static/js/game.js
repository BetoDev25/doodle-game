let ws = null;
let matchID = null;
let role = null;
let gameInterval = null;
let opponentDoodle = null;

// ===== Screen Management =====
function showLobbyScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="lobby-container">
            <h1>Doodle Duel</h1>
            <button id="findMatchBtn">Find Match</button>
            <div id="queueStatus" style="margin-top: 10px;"></div>
        </div>
    `;

    document.getElementById('findMatchBtn').addEventListener('click', startMatchmaking);
}

function showQueueScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="lobby-container">
            <h1>Doodle Duel</h1>
            <div id="queueStatus">⏳ Searching for opponent...</div>
            <button id="cancelQueueBtn">Cancel</button>
        </div>
    `;

    document.getElementById('cancelQueueBtn').addEventListener('click', cancelMatchmaking);
}

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
                        <canvas id="background-canvas" class="layer-canvas"></canvas>
                        <canvas id="doodle-canvas" class="layer-canvas"></canvas>
                        <canvas id="drawing-canvas" class="layer-canvas"></canvas>
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
    connectWebSocket();
}

// ===== WebSocket =====
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(`ws://localhost:8080/ws`);

    ws.onopen = () => {
        console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };

    ws.onclose = () => {
        console.log('Disconnected');
        ws = null;
    };
}

// ===== Message Handler =====
function handleMessage(msg) {
    switch(msg.type) {
        case 'match_found':
            handleMatchFound(msg.data);
            break;
        case 'receive_doodle':
            handleReceiveDoodle(msg.data);
            break;
        case 'match_complete':
            handleMatchComplete(msg.data);
            break;
        case 'partner_disconnected':
            handlePartnerDisconnected();
            break;
    }
}

// ===== Game State =====
let gameState = {
    phase: 'idle',
    timer: 0,
    matchID: null,
    role: null
};

// ===== Timer =====
function updateTimer(seconds) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `⏱️ ${seconds}s`;
    }
}

function updatePhase(text) {
    const phaseDisplay = document.getElementById('phaseDisplay');
    if (phaseDisplay) {
        phaseDisplay.textContent = text;
    }
}

// ===== Matchmaking =====
async function startMatchmaking() {
    if (!window.currentUser) {
        await getCurrentUser();
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
    }
    showQueueScreen();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'join_queue' }));
    } else {
        // Wait for connection
        const checkConnection = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                clearInterval(checkConnection);
                ws.send(JSON.stringify({ type: 'join_queue' }));
            }
        }, 100);
    }
}

function cancelMatchmaking() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_queue' }));
    }
    clearInterval(gameInterval);
    showLobbyScreen();
}

// ===== Match Found =====
function handleMatchFound(data) {
    matchID = data.match_id;
    role = data.role;
    gameState.matchID = matchID;
    gameState.role = role;

    showDrawingScreen();

    startDoodlePhase(10);
}

function handlePartnerDisconnected() {
    clearInterval(gameInterval);

    document.getElementById('game-screen').innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>😔 Your partner has disconnected</h2>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button id="rematchBtn" class="btn-primary">Find Another Match</button>
                    <button id="homeBtn" class="btn-secondary">Return Home</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('rematchBtn').addEventListener('click', () => {
        showLobbyScreen();
        startMatchmaking();
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
        window.location.href = '/';
    });
}

// ===== Doodle Phase =====
function startDoodlePhase(duration) {
    gameState.phase = 'doodle';
    gameState.timer = duration;
    updatePhase('🎨 Draw something!');
    updateTimer(duration);

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameState.timer--;
        updateTimer(gameState.timer);

        if (gameState.timer <= 0) {
            clearInterval(gameInterval);
            submitDoodle();
        }
    }, 1000);
}

function submitDoodle() {
    updatePhase('⏳ Waiting for opponent...');
    const strokes = getStrokes();
    ws.send(JSON.stringify({
        type: 'doodle_complete',
        data: {
            match_id: matchID,
            strokes: strokes
        }
    }));
}

// ===== Finish Phase =====
function handleReceiveDoodle(data) {
    opponentDoodle = data.strokes;

    // Render the opponent's doodle onto the read-only doodle layer,
    // then clear the drawing layer so the player starts phase 2 fresh.
    renderDoodle(data.strokes);
    clearDrawingLayer();

    startFinishPhase(60);
}

function startFinishPhase(duration) {
    gameState.phase = 'finish';
    gameState.timer = duration;
    updatePhase('✏️ Complete the drawing!');
    updateTimer(duration);

// === Ready button logic ===
let isReady = false;
const readyBtn = document.getElementById('readyBtn');

// Show and reset button
readyBtn.style.display = 'block';
readyBtn.classList.remove('ready');
readyBtn.innerHTML = `
    <span class="empty-box">☐</span>
    <span class="checkmark">✓</span>
    Finished Drawing
`;

readyBtn.onclick = function() {
    isReady = !isReady;
    if (isReady) {
        readyBtn.classList.add('ready');
        ws.send(JSON.stringify({
            type: 'ready_for_results',
            data: {
                match_id: matchID,
                ready: true
            }
        }));
        submitFinishedDrawing();
    } else {
        readyBtn.classList.remove('ready');
        ws.send(JSON.stringify({
            type: 'ready_for_results',
            data: {
                match_id: matchID,
                ready: false
            }
        }));
    }
};
// === End Of Ready button logic ===

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameState.timer--;
        updateTimer(gameState.timer);

        if (gameState.timer <= 0) {
            clearInterval(gameInterval);
            isReady = true;
            readyBtn.style.display = 'none';
            ws.send(JSON.stringify({
                type: 'ready_for_results',
                data: {
                    match_id: matchID,
                    ready: true
                }
            }));
            submitFinishedDrawing();
        }
    }, 1000);
}

function submitFinishedDrawing() {
    updatePhase('⏳ Sending drawing...');
    const strokes = getStrokes();
    ws.send(JSON.stringify({
        type: 'finish_drawing',
        data: {
            match_id: matchID,
            strokes: strokes
        }
    }));
    console.log('📤 finish_drawing sent');
}

// ===== Match Complete =====
function handleMatchComplete(data) {
    console.log('Match complete data:', data);
    clearInterval(gameInterval);
    window.location.href = `/match/${data.match_id}`;
}

// ===== Initialize =====
showLobbyScreen();