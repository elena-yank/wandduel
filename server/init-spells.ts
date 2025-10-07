import { storage } from "./storage";
import { type InsertSpell } from "@shared/schema";

export async function initializeSpells() {
  // Create first attack spell: алАрте аскЕндаре
  const alarte: InsertSpell = {
    name: "алАрте аскЕндаре",
    type: "attack",
    color: "#FFD700",
    colorName: "Золотой",
    description: "Точка в центре",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
  };

  const alarteSpell = await storage.createSpell(alarte);
  console.log("Created spell:", alarteSpell.name);

  // Create second attack spell: баубИллиус
  const baubellius: InsertSpell = {
    name: "баубИллиус",
    type: "attack",
    color: "#FFFACD",
    colorName: "Бело-жёлтый",
    description: "Точка в центре",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas - point at center
  };

  const baubelliusSpell = await storage.createSpell(baubellius);
  console.log("Created spell:", baubelliusSpell.name);

  // Create third attack spell: диффИндо
  const diffindo: InsertSpell = {
    name: "диффИндо",
    type: "attack",
    color: "#22C55E",
    colorName: "Зелёный",
    description: "V с крючком",
    gesturePattern: [
      // Left diagonal down (точка 1 -> точка 2 -> точка 3)
      { x: 83, y: 97 },      // Точка 1: верхний левый
      { x: 100, y: 153 },    // Между точками
      { x: 117, y: 210 },    // Точка 2: середина левой диагонали
      { x: 142, y: 277 },    // Между точками
      { x: 167, y: 343 },    // Точка 3: низ V
      // Right diagonal up (точка 3 -> точка 4 -> точка 5)
      { x: 183, y: 277 },    // Между точками
      { x: 200, y: 210 },    // Точка 4: середина правой диагонали
      { x: 211, y: 145 },    // Между точками
      { x: 223, y: 80 },     // Точка 5: верх V
      // Wavy tail down and up (точки 6-11)
      { x: 233, y: 108 },    // Между точками
      { x: 243, y: 137 },    // Точка 6: начало хвоста
      { x: 253, y: 165 },    // Между точками
      { x: 263, y: 193 },    // Точка 7: хвост вниз
      { x: 273, y: 215 },    // Между точками
      { x: 283, y: 237 },    // Точка 8: хвост еще вниз
      { x: 297, y: 244 },    // Между точками
      { x: 310, y: 250 },    // Точка 9: начало подъема
      { x: 327, y: 247 },    // Между точками
      { x: 343, y: 243 },    // Точка 10: подъем
      { x: 365, y: 235 },    // Между точками
      { x: 387, y: 227 }     // Точка 11: конец хвоста
    ],
  };

  const diffingoSpell = await storage.createSpell(diffindo);
  console.log("Created spell:", diffingoSpell.name);

  // Create counter spell: протЕго
  const protego: InsertSpell = {
    name: "протЕго",
    type: "counter",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Точка в центре",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
    counters: [alarteSpell.id],
  };

  const protegoSpell = await storage.createSpell(protego);
  console.log("Created spell:", protegoSpell.name);

  // Create counter spell: финИте инкантАтем (shield pattern - 24 points)
  const finiteIncantatem: InsertSpell = {
    name: "финИте инкантАтем",
    type: "counter",
    color: "#DC143C",
    colorName: "Красный",
    description: "Щит",
    gesturePattern: [
      // Smooth wavy top line - left to right
      { x: 80, y: 90 },    // Start left
      { x: 110, y: 100 },  // First wave start
      { x: 140, y: 110 },  // First dip
      { x: 170, y: 100 },  // Between waves
      { x: 200, y: 90 },   // Center peak
      { x: 230, y: 100 },  // Between waves
      { x: 260, y: 110 },  // Second dip
      { x: 290, y: 100 },  // Second wave end
      { x: 320, y: 90 },   // End right
      // Right side straight down
      { x: 320, y: 140 },
      { x: 320, y: 190 },
      { x: 320, y: 240 },
      // Bottom curve - right to left (SYMMETRICAL)
      { x: 300, y: 280 },
      { x: 270, y: 310 },
      { x: 235, y: 330 },
      { x: 200, y: 340 },  // Bottom center
      { x: 165, y: 330 },  // Mirror of right side
      { x: 130, y: 310 },  // Mirror of right side
      { x: 100, y: 280 },  // Mirror of right side
      // Left side straight up (SYMMETRICAL)
      { x: 80, y: 240 },
      { x: 80, y: 190 },
      { x: 80, y: 140 }
    ],
    counters: [baubelliusSpell.id],
  };

  const finiteSpell = await storage.createSpell(finiteIncantatem);
  console.log("Created spell:", finiteSpell.name);

  // Create counter spell: репАро (triangle pattern)
  const reparo: InsertSpell = {
    name: "репАро",
    type: "counter",
    color: "#3B82F6",
    colorName: "Голубой",
    description: "Треугольник",
    gesturePattern: [
      // Bottom left corner - starting point
      { x: 83, y: 377 },
      { x: 100, y: 360 },
      // Left side going up
      { x: 117, y: 343 },
      { x: 125, y: 310 },
      { x: 133, y: 277 },
      { x: 142, y: 243 },
      { x: 150, y: 210 },
      // Top left corner
      { x: 158, y: 177 },
      { x: 167, y: 143 },
      // Top horizontal line - left to right
      { x: 200, y: 143 },
      { x: 233, y: 143 },
      { x: 267, y: 143 },
      { x: 300, y: 143 },
      { x: 333, y: 143 },
      { x: 367, y: 143 },
      { x: 400, y: 143 },
      { x: 433, y: 143 },
      { x: 467, y: 143 },
      // Top right corner - turning down
      { x: 483, y: 160 },
      { x: 500, y: 177 },
      // Right side going down
      { x: 508, y: 210 },
      { x: 517, y: 243 },
      { x: 525, y: 277 },
      // Bottom right corner - curve
      { x: 517, y: 310 },
      { x: 508, y: 343 },
      { x: 492, y: 360 },
      { x: 475, y: 377 },
      // Bottom horizontal line - back to start
      { x: 442, y: 377 },
      { x: 408, y: 377 },
      { x: 375, y: 377 },
      { x: 342, y: 377 },
      { x: 308, y: 377 },
      { x: 275, y: 377 },
      { x: 242, y: 377 },
      { x: 208, y: 377 },
      { x: 175, y: 377 },
      { x: 142, y: 377 },
      { x: 108, y: 377 }
    ],
    counters: [diffingoSpell.id],
  };

  const reparoSpell = await storage.createSpell(reparo);
  console.log("Created spell:", reparoSpell.name);

  console.log("Spells initialized successfully!");
}
