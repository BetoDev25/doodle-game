document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('justFinishedSketch') === 'true') {
        sessionStorage.setItem('justFinishedSketch', 'false');
        showToast('Sketch successfully submitted!');
    }
});