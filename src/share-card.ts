/**
 * Draws the invite ticket that gets shared.
 *
 * Purpose-built rather than a gameplay screenshot: the code has to stay
 * legible at chat-bubble size, so it is drawn large on a plain card instead
 * of being buried in the scene.
 */

const WIDTH = 1200;
const HEIGHT = 720;
const PANEL = { x: 88, y: 196, w: WIDTH - 176, h: 356 };
const TRACKING = 18;

const PURPLE = "#8b3ddb";
const INK = "#15121c";
const MUTED = "#6c6478";
const STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export type InviteCard = {
  title: string;
  code: string;
  footer: string;
  playerName: string;
  avatarUrl?: string | null;
};

/** Returns a PNG data URL, ready to hand to `shareImage({ image })`. */
export async function renderInviteCard(card: InviteCard): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d canvas context unavailable");
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = PURPLE;
  ctx.beginPath();
  ctx.roundRect(0, 0, WIDTH, HEIGHT, 48);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 76px ${STACK}`;
  ctx.fillText(card.title, WIDTH / 2, 118, WIDTH - 160);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 20);
  ctx.fill();

  const avatar = card.avatarUrl ? await loadImage(card.avatarUrl) : null;
  drawAvatar(ctx, avatar, card.playerName, WIDTH / 2, PANEL.y + 96, 64);

  ctx.fillStyle = MUTED;
  ctx.font = `500 36px ${STACK}`;
  ctx.fillText("Village code", WIDTH / 2, PANEL.y + 212);

  ctx.fillStyle = INK;
  ctx.font = `800 96px ${STACK}`;
  ctx.letterSpacing = `${TRACKING}px`;
  // Tracking lands after the last glyph too, so nudge back to true centre.
  ctx.fillText(
    card.code.toUpperCase(),
    WIDTH / 2 + TRACKING / 2,
    PANEL.y + 288,
  );
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 42px ${STACK}`;
  ctx.fillText(card.footer, WIDTH / 2, HEIGHT - 92, WIDTH - 160);

  return canvas.toDataURL("image/png");
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  playerName: string,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#9b6ef0";
  ctx.fill();
  ctx.clip();
  if (image) {
    ctx.drawImage(image, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${r}px ${STACK}`;
    ctx.fillText((playerName.trim()[0] ?? "?").toUpperCase(), cx, cy);
  }
  ctx.restore();
}

/**
 * Null rather than throwing: a blocked or CORS-less avatar must not take the
 * whole card down, and a tainted canvas would make `toDataURL` throw.
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
