export const sceneSize = Object.freeze({ width: 600, height: 340 });
export const cardRect = Object.freeze({ x: 48, y: 52, width: 280, height: 170 });
// The card's one-pixel border precedes the button's absolute 20px / 106px inset.
export const buttonRect = Object.freeze({ x: 69, y: 159, width: 240, height: 44 });

export function projectRect(rect, camera, cssWidth) {
  const ratio = cssWidth / sceneSize.width;
  return {
    x: (camera.x + rect.x * camera.zoom) * ratio,
    y: (camera.y + rect.y * camera.zoom) * ratio,
    width: rect.width * camera.zoom * ratio,
    height: rect.height * camera.zoom * ratio,
  };
}

export function rectCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
