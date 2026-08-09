document.getElementById('requestBtn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks to release mic immediately
    stream.getTracks().forEach(track => track.stop());
    // Close the tab automatically on success
    window.close();
  } catch (err) {
    console.error("Microphone permission denied:", err);
    alert("Microphone permission was denied. Please click the camera/microphone icon in your URL address bar to enable access.");
  }
});
