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
      // Точка 1: начало в центре
      { x: 260, y: 217 },
      // Точка 1 → 2: горизонталь влево
      { x: 225, y: 217 },
      { x: 190, y: 217 },
      { x: 155, y: 217 },
      { x: 120, y: 217 },
      // Точка 2: левый конец
      { x: 109, y: 217 },
      // Левая плавная кривая вниз (точки 2→3→4→5→6)
      { x: 105, y: 235 },
      { x: 102, y: 255 },
      { x: 100, y: 275 },
      { x: 100, y: 295 },
      { x: 102, y: 315 },
      { x: 106, y: 335 },
      { x: 112, y: 355 },
      { x: 120, y: 375 },
      { x: 130, y: 395 },
      { x: 142, y: 415 },
      { x: 155, y: 435 },
      { x: 168, y: 450 },
      { x: 182, y: 463 },
      { x: 195, y: 473 },
      // Точка 6: самый низ (ЦЕНТР по горизонтали)
      { x: 200, y: 480 },
      // Правая плавная кривая вверх (точки 6→7→8→9→10→11)
      { x: 205, y: 473 },
      { x: 212, y: 463 },
      { x: 222, y: 450 },
      { x: 235, y: 435 },
      { x: 250, y: 418 },
      { x: 267, y: 398 },
      { x: 285, y: 375 },
      { x: 303, y: 350 },
      { x: 322, y: 323 },
      { x: 342, y: 295 },
      { x: 362, y: 265 },
      { x: 382, y: 233 },
      { x: 402, y: 200 },
      { x: 422, y: 165 },
      { x: 440, y: 135 },
      // Точка 11: угол к верхней линии
      { x: 455, y: 115 },
      // Поворот к горизонтали
      { x: 458, y: 108 },
      // Точка 12: правый конец верхней линии
      { x: 460, y: 104 },
      // Горизонталь влево (верхняя линия)
      { x: 410, y: 104 },
      { x: 370, y: 104 },
      { x: 330, y: 104 },
      { x: 290, y: 104 },
      { x: 250, y: 104 },
      { x: 210, y: 104 },
      // Конец узора
      { x: 185, y: 104 }
    ],
    counters: [diffingoSpell.id],
  };

  const reparoSpell = await storage.createSpell(reparo);
  console.log("Created spell:", reparoSpell.name);

  console.log("Spells initialized successfully!");
}
