import { evaluateDrawing } from "./shared/advanced-gesture-recognition";
import { type Point } from "./shared/schema";

function run() {
  const engorgio: Point[] = [
    { x: 179.63, y: 66.24 },
    { x: 176.45, y: 112.87 },
    { x: 133.53, y: 139.91 },
    { x: 100.68, y: 175.41 },
    { x: 94.85, y: 221.00 },
    { x: 96.44, y: 268.69 },
    { x: 126.33, y: 306.84 },
    { x: 171.29, y: 336.52 },
    { x: 228.71, y: 336.52 },
    { x: 273.67, y: 306.84 },
    { x: 303.56, y: 268.69 },
    { x: 305.15, y: 221.00 },
    { x: 299.32, y: 175.41 },
    { x: 266.47, y: 139.91 },
    { x: 223.55, y: 112.87 },
    { x: 220.37, y: 66.24 }
  ];

  const userApprox: Point[] = engorgio.map(p => ({ x: p.x + (Math.random() * 12 - 6), y: p.y + (Math.random() * 12 - 6) }));
  const result1 = evaluateDrawing(userApprox, engorgio);
  console.log("Engorgio approx ->", result1);

  const skinnyCircles: Point[] = [
    { x: 180, y: 80 }, { x: 175, y: 120 }, { x: 150, y: 140 }, { x: 130, y: 170 }, { x: 125, y: 210 }, { x: 128, y: 250 }, { x: 150, y: 280 }, { x: 175, y: 300 },
    { x: 225, y: 300 }, { x: 250, y: 280 }, { x: 272, y: 250 }, { x: 275, y: 210 }, { x: 270, y: 170 }, { x: 250, y: 140 }, { x: 225, y: 120 }, { x: 220, y: 80 }
  ];
  const result2 = evaluateDrawing(skinnyCircles, engorgio);
  console.log("Engorgio skinny ->", result2);
}

run();