document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('justFinishedSketch') === 'true') {
        sessionStorage.setItem('justFinishedSketch', 'false');
        showToast('Sketch successfully submitted!');
    }
    if (sessionStorage.getItem('justFinishedDrawing') === 'true') {
        sessionStorage.setItem('justFinishedDrawing', 'false');
        showToast('You finished someone\'s drawing!');
    }
});