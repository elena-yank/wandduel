import { storage } from "./storage";
import { type InsertSpell } from "@shared/schema";

export async function initializeSpells() {
  // Check if spells already exist in the database
  const existingSpells = await storage.getSpells();
  if (existingSpells.length > 0) {
    console.log(`Spells already initialized (${existingSpells.length} spells found). Skipping initialization.`);
    return;
  }

  console.log("Initializing spells in database...");
  
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

  // Create fourth attack spell: иммОбулюс (16 точек из SVG)
  const immobulus: InsertSpell = {
    name: "иммОбулюс",
    type: "attack",
    color: "#3B82F6",
    colorName: "Голубой",
    description: "Горы",
    gesturePattern: [
      { x: 115, y: 321 },
      { x: 194, y: 180 },
      { x: 223, y: 236 },
      { x: 300, y: 82 },
      { x: 417, y: 321 },
      { x: 394, y: 357 },
      { x: 352, y: 373 },
      { x: 322, y: 382 },
      { x: 276, y: 365 },
      { x: 244, y: 357 },
      { x: 207, y: 367 },
      { x: 167, y: 382 },
      { x: 121, y: 382 },
      { x: 76, y: 366 },
      { x: 49, y: 340 }
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

  // Create counter spell: репАро (13 точек из SVG)
  const reparo: InsertSpell = {
    name: "репАро",
    type: "counter",
    color: "#3B82F6",
    colorName: "Голубой",
    description: "Треугольник",
    gesturePattern: [
      { x: 274, y: 203 },
      { x: 129, y: 203 },
      { x: 95, y: 217 },
      { x: 86, y: 250 },
      { x: 105, y: 282 },
      { x: 213, y: 380 },
      { x: 243, y: 394 },
      { x: 274, y: 383 },
      { x: 382, y: 193 },
      { x: 397, y: 151 },
      { x: 389, y: 110 },
      { x: 359, y: 100 },
      { x: 174, y: 100 }
    ],
    counters: [diffingoSpell.id],
  };

  const reparoSpell = await storage.createSpell(reparo);
  console.log("Created spell:", reparoSpell.name);

  // Create sixth attack spell: кАнтис (21 точка из SVG)
  const cantis: InsertSpell = {
    name: "кАнтис",
    type: "attack",
    color: "#EC4899",
    colorName: "Розовый",
    description: "Нота",
    gesturePattern: [
      { x: 185, y: 306 },
      { x: 172, y: 262 },
      { x: 133, y: 240 },
      { x: 88, y: 245 },
      { x: 61, y: 278 },
      { x: 56, y: 330 },
      { x: 78, y: 370 },
      { x: 121, y: 390 },
      { x: 167, y: 390 },
      { x: 205, y: 373 },
      { x: 233, y: 340 },
      { x: 250, y: 304 },
      { x: 265, y: 261 },
      { x: 275, y: 208 },
      { x: 275, y: 155 },
      { x: 275, y: 107 },
      { x: 295, y: 161 },
      { x: 327, y: 194 },
      { x: 361, y: 214 },
      { x: 398, y: 226 },
      { x: 445, y: 231 }
    ],
  };

  const cantisSpell = await storage.createSpell(cantis);
  console.log("Created spell:", cantisSpell.name);

  // Create counter spell: мИмбл вИмбл (26 точек из SVG - узел)
  const mimbleWimble: InsertSpell = {
    name: "мИмбл вИмбл",
    type: "counter",
    color: "#3B82F6",
    colorName: "Голубой",
    description: "Узел",
    gesturePattern: [
      { x: 39.5, y: 295.3 },
      { x: 90.8, y: 240.2 },
      { x: 143.7, y: 201.1 },
      { x: 210.3, y: 190.4 },
      { x: 280, y: 190.4 },
      { x: 339.8, y: 212.6 },
      { x: 382.7, y: 250 },
      { x: 397.2, y: 295.3 },
      { x: 397.2, y: 343.6 },
      { x: 362.7, y: 378.1 },
      { x: 321.4, y: 388.8 },
      { x: 274.7, y: 372.7 },
      { x: 231, y: 339.8 },
      { x: 190.4, y: 289.6 },
      { x: 176.6, y: 235.6 },
      { x: 198.1, y: 169 },
      { x: 240.2, y: 123 },
      { x: 285.4, y: 103.1 },
      { x: 341.3, y: 112.3 },
      { x: 381.9, y: 141.4 },
      { x: 409.5, y: 186.6 },
      { x: 409.5, y: 236.4 },
      { x: 381.1, y: 294.6 },
      { x: 333.6, y: 331.3 },
      { x: 270.1, y: 352.8 },
      { x: 105.4, y: 382.7 }
    ],
    counters: [cantisSpell.id],
  };

  const mimbleWimbleSpell = await storage.createSpell(mimbleWimble);
  console.log("Created spell:", mimbleWimbleSpell.name);

  // Create seventh attack spell: кОллошу (12 точек из SVG - башмак)
  const colloshu: InsertSpell = {
    name: "кОллошу",
    type: "attack",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Башмак",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 60.4, y: 117.6 },
      { x: 60.4, y: 218.08 },
      { x: 81.28, y: 258.48 },
      { x: 108.8, y: 282.4 },
      { x: 301.84, y: 282.4 },
      { x: 333.12, y: 268.32 },
      { x: 351.44, y: 239.52 },
      { x: 351.44, y: 211.2 },
      { x: 325.76, y: 177.04 },
      { x: 270, y: 178.88 },
      { x: 216.08, y: 176.4 },
      { x: 184.96, y: 167.84 }
    ],
  };

  const colloshuSpell = await storage.createSpell(colloshu);
  console.log("Created spell:", colloshuSpell.name);

  // Create counter spell: релАшио (2 точки из SVG - вертикальная линия)
  const relaxio: InsertSpell = {
    name: "релАшио",
    type: "counter",
    color: "#FBBF24",
    colorName: "Жёлтый",
    description: "Вертикальная линия",
    gesturePattern: [
      { x: 200, y: 338 },    // SVG 500x500 -> Canvas 400x400: (250, 422.5) -> (200, 338)
      { x: 200, y: 51.84 }   // SVG 500x500 -> Canvas 400x400: (250, 64.8) -> (200, 51.84)
    ],
    counters: [colloshuSpell.id],
  };

  const relaxioSpell = await storage.createSpell(relaxio);
  console.log("Created spell:", relaxioSpell.name);

  // Create eighth attack spell: локомОтор мОртис (3 точки - упрощенная L-форма)
  const locomotorMortis: InsertSpell = {
    name: "локомОтор мОртис",
    type: "attack",
    color: "#EF4444",
    colorName: "Красный",
    description: "Ботинок",
    gesturePattern: [
      // Simplified L-shape pattern (vertical down, then horizontal right)
      { x: 200, y: 80 },   // Top of vertical line
      { x: 200, y: 300 },  // Bottom of vertical line (corner)
      { x: 350, y: 300 }   // End of horizontal line
    ],
  };

  const locomotorMortisSpell = await storage.createSpell(locomotorMortis);
  console.log("Created spell:", locomotorMortisSpell.name);

  // Create counter spell: диффИндо (counter version - same pattern as attack)
  const diffingoCounter: InsertSpell = {
    name: "диффИндо",
    type: "counter",
    color: "#22C55E",
    colorName: "Зелёный",
    description: "V с крючком",
    gesturePattern: [
      // Same pattern as attack диффИндо
      { x: 83, y: 97 },
      { x: 100, y: 153 },
      { x: 117, y: 210 },
      { x: 142, y: 277 },
      { x: 167, y: 343 },
      { x: 183, y: 277 },
      { x: 200, y: 210 },
      { x: 211, y: 145 },
      { x: 223, y: 80 },
      { x: 233, y: 108 },
      { x: 243, y: 137 },
      { x: 253, y: 165 },
      { x: 263, y: 193 },
      { x: 273, y: 215 },
      { x: 283, y: 237 },
      { x: 297, y: 244 },
      { x: 310, y: 250 },
      { x: 327, y: 247 },
      { x: 343, y: 243 },
      { x: 365, y: 235 },
      { x: 387, y: 227 }
    ],
    counters: [locomotorMortisSpell.id],
  };

  const diffingoCounterSpell = await storage.createSpell(diffingoCounter);
  console.log("Created spell:", diffingoCounterSpell.name);

  console.log("Spells initialized successfully!");
}
