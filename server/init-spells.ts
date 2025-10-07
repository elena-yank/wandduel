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
      // Точка 2 → 3: поворот влево-вниз (более острый)
      { x: 97, y: 235 },
      { x: 85, y: 253 },
      // Точка 3: угол
      { x: 78, y: 265 },
      // Точка 3 → 4: диагональ вниз (более прямая)
      { x: 73, y: 285 },
      // Точка 4
      { x: 67, y: 305 },
      // Точка 4 → 5: диагональ вниз-вправо (более острая)
      { x: 80, y: 335 },
      { x: 93, y: 360 },
      // Точка 5: нижняя левая
      { x: 109, y: 385 },
      // Точка 5 → 6: диагональ вниз-вправо к низу
      { x: 125, y: 398 },
      { x: 142, y: 408 },
      // Точка 6: самый низ
      { x: 158, y: 418 },
      // Точка 6 → 7: диагональ вправо-вверх (пошире по x)
      { x: 185, y: 400 },
      { x: 212, y: 383 },
      // Точка 7: нижняя правая
      { x: 238, y: 365 },
      // Точка 7 → 8: диагональ вверх-вправо (пошире)
      { x: 265, y: 330 },
      { x: 292, y: 300 },
      // Точка 8: средняя правая
      { x: 318, y: 270 },
      // Точка 8 → 9: диагональ вверх-вправо (пошире)
      { x: 342, y: 235 },
      { x: 365, y: 205 },
      // Точка 9: верхняя средняя правая
      { x: 388, y: 175 },
      // Точка 9 → 10: диагональ вверх-вправо (пошире)
      { x: 405, y: 158 },
      { x: 420, y: 145 },
      // Точка 10: угол к верхней линии
      { x: 435, y: 132 },
      // Точка 10 → 11: поворот к горизонтали
      { x: 430, y: 120 },
      { x: 425, y: 110 },
      // Точка 11: правый конец верхней линии
      { x: 420, y: 104 },
      // Точка 11 → 12: горизонталь влево
      { x: 325, y: 104 },
      { x: 290, y: 104 },
      { x: 255, y: 104 },
      { x: 220, y: 104 },
      { x: 185, y: 104 },
      // Точка 12: конец
      { x: 169, y: 104 }
    ],
    counters: [diffingoSpell.id],
  };

  const reparoSpell = await storage.createSpell(reparo);
  console.log("Created spell:", reparoSpell.name);

  console.log("Spells initialized successfully!");
}
