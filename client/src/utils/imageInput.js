// Shared helpers for turning File/DataTransfer/ClipboardEvent input into
// downscaled data URLs, used by the image-editing panels (Remix, Referencias,
// Retocar). Kept framework-agnostic so both ImageInputPanel and any future
// consumer can reuse it without depending on component state.

/**
 * Read a File and return a data URL, downscaling it first (via canvas) if its
 * longest side exceeds maxDim. Aspect ratio is preserved. Output is always PNG.
 * @param {File} file
 * @param {number} maxDim
 * @returns {Promise<string>}
 */
function readAndDownscaleImage(file, maxDim = 2048) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const longest = Math.max(w, h);

        if (longest <= maxDim) {
          resolve(dataUrl);
          return;
        }

        const scale = maxDim / longest;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extract the first image File out of a drag/drop or clipboard-paste event.
 * @param {DragEvent|ClipboardEvent} event
 * @returns {File|null}
 */
function extractImageFile(event) {
  const items = event.dataTransfer?.items || event.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        return item.getAsFile();
      }
    }
  }

  const files = event.dataTransfer?.files || event.clipboardData?.files;
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.type.startsWith('image/')) return file;
    }
  }

  return null;
}

/**
 * Recolor a black/white mask data URL to a red, semi-transparent preview
 * (white -> rgba(239,68,68,0.45), black -> fully transparent) for on-screen
 * display. The original black/white mask sent to the API is left untouched.
 * @param {string} maskDataUrl
 * @returns {Promise<string>}
 */
function tintMaskRed(maskDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('No se pudo procesar la mascara'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      // Draw the mask, then recolor: keep alpha from luminance, fill with red.
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const luminance = px[i]; // mask is grayscale, R=G=B
        px[i] = 239;
        px[i + 1] = 68;
        px[i + 2] = 68;
        px[i + 3] = luminance > 10 ? Math.round(luminance * 0.45) : 0;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = maskDataUrl;
  });
}

export { readAndDownscaleImage, extractImageFile, tintMaskRed };
