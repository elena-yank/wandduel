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

  // Create fifth attack spell: кАльворИо
  const calvorio: InsertSpell = {
    name: "кАльворИо",
    type: "attack",
    color: "#EF4444",
    colorName: "Красный",
    description: "Точка в центре",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
  };

  const calvorioSpell = await storage.createSpell(calvorio);
  console.log("Created spell:", calvorioSpell.name);

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

  // Create fourth attack spell: иммОбулюс
  const immobulus: InsertSpell = {
    name: "иммОбулюс",
    type: "attack",
    color: "#3B82F6",
    colorName: "Голубой",
    description: "Горы",
    gesturePattern: [
      // Верхняя линия - горы (зигзаг)
      // Начало слева внизу
      { x: 115, y: 290 },
      // Подъем к первой вершине (маленькая гора)
      { x: 135, y: 245 },
      { x: 155, y: 200 },
      { x: 170, y: 175 },
      { x: 180, y: 165 },
      // Спуск к впадине
      { x: 190, y: 180 },
      { x: 200, y: 195 },
      { x: 210, y: 210 },
      // Подъем к второй вершине (большая гора)
      { x: 225, y: 175 },
      { x: 240, y: 140 },
      { x: 253, y: 115 },
      { x: 265, y: 90 },
      // Спуск вправо вниз
      { x: 285, y: 130 },
      { x: 305, y: 170 },
      { x: 325, y: 210 },
      { x: 345, y: 245 },
      { x: 365, y: 270 },
      { x: 385, y: 295 },
      // Нижняя линия - волна ВЛЕВО от конца гор
      { x: 400, y: 310 },
      { x: 415, y: 325 },
      // Спуск волны
      { x: 390, y: 330 },
      { x: 365, y: 333 },
      { x: 340, y: 335 },
      // Подъем волны
      { x: 315, y: 330 },
      { x: 290, y: 320 },
      { x: 265, y: 313 },
      { x: 240, y: 310 },
      // Спуск волны
      { x: 215, y: 315 },
      { x: 190, y: 323 },
      { x: 165, y: 328 },
      // Конец влево
      { x: 140, y: 330 },
      { x: 100, y: 330 }
    ],
  };

  const immobulusSpell = await storage.createSpell(immobulus);
  console.log("Created spell:", immobulusSpell.name);

  // Create counter spell: протЕго
  const protego: InsertSpell = {
    name: "протЕго",
    type: "counter",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Точка в центре",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
    counters: [alarteSpell.id, immobulusSpell.id],
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
    counters: [baubelliusSpell.id, calvorioSpell.id],
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
      // Сглаживание угла (переход от горизонтали к диагонали)
      { x: 105, y: 225 },
      { x: 102, y: 235 },
      // ПРЯМАЯ левая диагональ вниз (от точки 2 к точке 6)
      { x: 120, y: 280 },
      { x: 140, y: 330 },
      { x: 160, y: 380 },
      { x: 180, y: 430 },
      // Сглаживание угла (переход к нижней точке)
      { x: 210, y: 460 },
      { x: 235, y: 472 },
      // Точка 6: самый низ (параллельно START на x: 260)
      { x: 260, y: 480 },
      // Сглаживание угла (переход от нижней точки к правой диагонали)
      { x: 285, y: 472 },
      { x: 310, y: 460 },
      // ПРЯМАЯ правая диагональ вверх (от точки 6 к точке 11)
      { x: 320, y: 430 },
      { x: 340, y: 380 },
      { x: 360, y: 330 },
      { x: 380, y: 280 },
      { x: 390, y: 230 },
      { x: 395, y: 180 },
      { x: 398, y: 130 },
      // Сглаживание угла (переход к верхней горизонтали)
      { x: 399, y: 115 },
      // Точка 11: верхняя правая на x: 400
      { x: 400, y: 104 },
      // Горизонталь влево (верхняя линия)
      { x: 360, y: 104 },
      { x: 320, y: 104 },
      { x: 280, y: 104 },
      { x: 240, y: 104 },
      { x: 200, y: 104 },
      // Конец узора
      { x: 169, y: 104 }
    ],
    counters: [diffingoSpell.id],
  };

  const reparoSpell = await storage.createSpell(reparo);
  console.log("Created spell:", reparoSpell.name);

  // Create sixth attack spell: кАнтис (19 точек)
  const cantis: InsertSpell = {
    name: "кАнтис",
    type: "attack",
    color: "#EC4899",
    colorName: "Розовый",
    description: "Нота",
    gesturePattern: [
      // Старт справа (разрыв круга), идем вниз по кругу
      { x: 230, y: 365 },
      { x: 240, y: 395 },
      { x: 220, y: 420 },
      { x: 180, y: 435 },
      { x: 145, y: 430 },
      { x: 115, y: 405 },
      { x: 90, y: 375 },
      { x: 75, y: 340 },
      { x: 70, y: 300 },
      { x: 80, y: 265 },
      { x: 105, y: 235 },
      { x: 140, y: 220 },
      { x: 180, y: 225 },
      // Плавная вертикальная линия вверх (штиль ноты)
      { x: 215, y: 245 },
      { x: 280, y: 280 },
      { x: 325, y: 220 },
      { x: 345, y: 130 },
      // Флажок (две точки)
      { x: 385, y: 115 },
      { x: 465, y: 250 }
    ],
  };

  const cantisSpell = await storage.createSpell(cantis);
  console.log("Created spell:", cantisSpell.name);

  console.log("Spells initialized successfully!");
}
