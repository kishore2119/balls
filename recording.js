// Real-time browser export; no server rendering and no on-screen controls.
// renderFrame() is available separately for a future frame-by-frame encoder.
export async function recordVideo(canvas, renderAt, { duration = 60, fps = 60, signal } = {}) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600) {
    throw new RangeError('Export duration must be greater than 0 and at most 600 seconds.');
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new RangeError('Export frame rate must be 1–120.');
  if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
  if (document.hidden) throw new Error('Keep the animation tab visible while exporting.');
  if (!canvas.captureStream || !window.MediaRecorder) throw new Error('Video recording is unavailable in this browser.');
  const mimeType = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/mp4', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('No supported video format is available.');
  // A populated 2D capture surface avoids a blank initial WebGL stream frame.
  const capture = document.createElement('canvas');
  capture.width = canvas.width;
  capture.height = canvas.height;
  const captureContext = capture.getContext('2d', { alpha: false });
  renderAt(0);
  captureContext.drawImage(canvas, 0, 0);
  let stream = capture.captureStream(0);
  let track = stream.getVideoTracks()[0];
  if (typeof track.requestFrame !== 'function') {
    track.stop();
    stream = capture.captureStream(fps);
    track = stream.getVideoTracks()[0];
  }
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    throw error;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let request = 0, failure = null, start = null, capturedFrame = -1;
    function cleanup() {
      cancelAnimationFrame(request);
      stream.getTracks().forEach(track => track.stop());
      document.removeEventListener('visibilitychange', onVisibility);
      signal?.removeEventListener('abort', onAbort);
    }
    function stop(error) {
      if (error && !failure) failure = error;
      cancelAnimationFrame(request);
      if (recorder.state !== 'inactive') recorder.stop();
    }
    function onVisibility() {
      if (document.hidden) stop(new Error('Export interrupted: the animation tab was hidden.'));
    }
    function onAbort() { stop(new DOMException('Export cancelled.', 'AbortError')); }
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => stop(event.error || new Error('Video encoding failed.'));
    recorder.onstop = () => {
      cleanup();
      if (failure) reject(failure);
      else if (!chunks.length) reject(new Error('The browser produced an empty recording.'));
      else resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
    function frame(timestamp) {
      if (start === null) start = timestamp;
      const seconds = Math.min((timestamp - start) / 1000, duration);
      try {
        const index = Math.floor(seconds * fps);
        if (index !== capturedFrame) {
          renderAt(index / fps);
          captureContext.drawImage(canvas, 0, 0);
          track.requestFrame?.();
          capturedFrame = index;
        }
      }
      catch (error) { stop(error); return; }
      if (seconds >= duration) stop();
      else request = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', onVisibility);
    signal?.addEventListener('abort', onAbort, { once: true });
    try { recorder.start(250); request = requestAnimationFrame(frame); }
    catch (error) { cleanup(); reject(error); }
  });
}


