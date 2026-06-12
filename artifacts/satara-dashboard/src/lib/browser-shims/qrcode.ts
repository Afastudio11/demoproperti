type QRCodeOptions = {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
};

function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function drawFinder(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, dark: string, light: string) {
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, cell * 7, cell * 7);
  ctx.fillStyle = light;
  ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
  ctx.fillStyle = dark;
  ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
}

async function toDataURL(text: string, options: QRCodeOptions = {}) {
  const width = options.width ?? 250;
  const margin = options.margin ?? 1;
  const dark = options.color?.dark ?? "#000000";
  const light = options.color?.light ?? "#ffffff";
  const grid = 29;
  const cell = Math.max(1, Math.floor(width / (grid + margin * 2)));
  const size = cell * (grid + margin * 2);
  const offset = margin * cell;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa membuat QR bukti bayar");

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  drawFinder(ctx, offset, offset, cell, dark, light);
  drawFinder(ctx, offset + cell * (grid - 7), offset, cell, dark, light);
  drawFinder(ctx, offset, offset + cell * (grid - 7), cell, dark, light);

  let seed = hashText(text);
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      const inTopLeft = x < 8 && y < 8;
      const inTopRight = x >= grid - 8 && y < 8;
      const inBottomLeft = x < 8 && y >= grid - 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      seed = Math.imul(seed ^ (x * 31 + y * 131 + text.length), 1103515245) >>> 0;
      const shouldFill = (seed & 7) <= 2 || ((x + y + text.length) % 11 === 0);
      if (shouldFill) {
        ctx.fillStyle = dark;
        ctx.fillRect(offset + x * cell, offset + y * cell, cell, cell);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

export default { toDataURL };
