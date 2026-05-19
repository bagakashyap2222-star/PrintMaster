export const applyImageFilters = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, settings: any) => {
  const { brightness, contrast, saturation, threshold, removeBg } = settings;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];

    // Brightness
    r += brightness; g += brightness; b += brightness;

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Saturation
    if (saturation !== 0) {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const sat = 1 + (saturation / 100);
      r = lum + sat * (r - lum);
      g = lum + sat * (g - lum);
      b = lum + sat * (b - lum);
    }

    // Custom clamp to 0-255 before threshold logic
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;

    // Threshold (B&W)
    if (threshold > 0) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const val = lum >= (255 - threshold) ? 255 : 0;
      r = g = b = val;
    }

    d[i] = r; d[i+1] = g; d[i+2] = b;

    // Remove BG (White)
    if (removeBg > 0) {
      // Very simple white tolerance check
      if (r >= 255 - removeBg && g >= 255 - removeBg && b >= 255 - removeBg) {
        d[i+3] = 0; // alpha to 0
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
};
