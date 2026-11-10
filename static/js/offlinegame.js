// ===== Screen Management =====
function showLobbyScreen() {
    document.getElementById('game-screen').innerHTML = `
    <div class="lobby-row">
        <div class="offline-lobby-container">
            <h1>Create a sketch</h1>
            <p class="sfw-notice">Create a piece of art, then send it into the aether where another player will pick it up and finish it!</p>
            <button class="findMatchBtn" id="sketchNowBtn">Sketch now</button>
        </div>
        <div class="offline-lobby-container">
            <h1>Find a sketch</h1>
            <p class="sfw-notice">Draw from a pool of other users' sketches and finish one!</p>
            <button class="findMatchBtn" id="searchNowBtn">Search now</button>
        </div>
    </div>
`;

    document.getElementById('createSketchBtn').addEventListener('click', createSketch);
    document.getElementById('findSketchBtn').addEventListener('click', findSketch);
}

showLobbyScreen();