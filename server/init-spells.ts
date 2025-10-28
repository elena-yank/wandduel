import { type PostgresStorage } from "./storage";
import { type InsertSpell } from "@shared/schema";

export async function initializeSpells(storage: PostgresStorage) {
  // Expected number of spells in the system
  const EXPECTED_SPELL_COUNT = 27;
  
  // Check if spells already exist in the database
  const existingSpells = await storage.getSpells();
  
  // If we have the expected number of spells, check if they need to be updated
  if (existingSpells.length >= EXPECTED_SPELL_COUNT) {
    console.log(`Spells already initialized (${existingSpells.length} spells found). Checking for updates...`);
    await updateExistingSpells(existingSpells, storage);
    return;
  }

  // If we have some spells but not all, clear and reinitialize
  if (existingSpells.length > 0) {
    console.log(`Found ${existingSpells.length} spells, but expected ${EXPECTED_SPELL_COUNT}. Clearing and reinitializing...`);
    
    // Delete gesture attempts first to avoid foreign key constraint violations
    await storage.deleteAllGestureAttempts();
    console.log('Cleared all gesture attempts');
    
    // Now safe to delete spells
    await storage.deleteAllSpells();
    console.log('Cleared all spells');
  }

  console.log("Initializing spells in database...");
  
  // Create first attack spell: алАрте аскЕндаре
  const alarte: InsertSpell = {
    name: "алАрте аскЕндаре",
    type: "attack",
    color: "#FFD700",
    colorName: "Золотой",
    description: "Перо",
    gesturePattern: [
      { x: 178.57, y: 357.14 },
      { x: 174.86, y: 321.65 },
      { x: 170.09, y: 289.33 },
      { x: 164.79, y: 259.64 },
      { x: 152.60, y: 215.15 },
      { x: 145.18, y: 164.29 },
      { x: 149.42, y: 119.27 },
      { x: 164.77, y: 87.51 },
      { x: 190.20, y: 71.08 },
      { x: 233.94, y: 69.53 },
      { x: 256.70, y: 86.90 },
      { x: 264.12, y: 111.88 },
      { x: 264.65, y: 139.45 },
      { x: 255.12, y: 163.22 },
      { x: 224.67, y: 163.22 } ]
  };

  const alarteSpell = await storage.createSpell(alarte);
  console.log("Created spell:", alarteSpell.name);

  // Create second attack spell: баубИллиус
  const baubellius: InsertSpell = {
    name: "баубИллиус",
    type: "attack",
    color: "#FFFACD",
    colorName: "Бело-жёлтый",
    description: "Обратная молния",
    gesturePattern: [
      { x: 63.12, y: 46.28 },
      { x: 156.10, y: 101.88 },
      { x: 261.84, y: 164.96 },
      { x: 353.00, y: 218.43 },
      { x: 159.75, y: 201.32 },
      { x: 44.89, y: 191.70 },
      { x: 221.73, y: 288.99 },
      { x: 354.82, y: 362.78 }
    ],
  };

  const baubelliusSpell = await storage.createSpell(baubellius);
  console.log("Created spell:", baubelliusSpell.name);

  // Create fifth attack spell: кАльворИо
  const calvorio: InsertSpell = {
    name: "кАльворИо",
    type: "attack",
    color: "#EF4444",
    colorName: "Красный",
    description: "Лысина",
    gesturePattern: [
      { x: 74.18, y: 298.92 },
      { x: 128.74, y: 298.92 },
      { x: 120.52, y: 267.84 },
      { x: 116.63, y: 234.56 },
      { x: 120.93, y: 208.00 },
      { x: 138.13, y: 175.49 },
      { x: 174.67, y: 154.04 },
      { x: 206.84, y: 146.38 },
      { x: 238.01, y: 154.04 },
      { x: 277.77, y: 176.54 },
      { x: 294.97, y: 207.69 },
      { x: 298.73, y: 236.28 },
      { x: 292.20, y: 272.22 },
      { x: 284.52, y: 298.06 },
      { x: 343.34, y: 298.09 }
    ],
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

  // Create thirteenth attack spell: флиппЕндо (17 точек из SVG - V с крючком)
  const flippendo: InsertSpell = {
    name: "флиппЕндо",
    type: "attack",
    color: "#FFA500",
    colorName: "Оранжевый",
    description: "V с крючком",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 55.64, y: 190.23 },
      { x: 85.31, y: 208.24 },
      { x: 112.34, y: 234.20 },
      { x: 134.59, y: 270.77 },
      { x: 147.85, y: 296.20 },
      { x: 160.57, y: 255.40 },
      { x: 185.47, y: 192.87 },
      { x: 216.20, y: 144.12 },
      { x: 232.63, y: 125.06 },
      { x: 249.05, y: 117.64 },
      { x: 268.66, y: 124.53 },
      { x: 273.96, y: 143.10 },
      { x: 278.73, y: 162.18 },
      { x: 291.99, y: 178.60 },
      { x: 312.66, y: 178.60 },
      { x: 333.85, y: 158.08 },
      { x: 339.15, y: 135.30 },
      { x: 337.00, y: 119.83 }
    ],
  };

  const flippendoSpell = await storage.createSpell(flippendo);
  console.log("Created spell:", flippendoSpell.name);

  // Create counter spell: протЕго
  const protego: InsertSpell = {
    name: "протЕго",
    type: "counter",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Округлый треугольник",
    gesturePattern: [
      { x: 97.50, y: 277.66 },
      { x: 131.41, y: 189.70 },
      { x: 158.96, y: 119.22 },
      { x: 176.98, y: 87.96 },
      { x: 207.71, y: 76.30 },
      { x: 240.04, y: 85.31 },
      { x: 259.64, y: 120.28 },
      { x: 295.15, y: 199.77 },
      { x: 324.29, y: 262.29 },
      { x: 327.99, y: 289.32 },
      { x: 317.40, y: 310.51 },
      { x: 290.38, y: 325.88 },
      { x: 225.73, y: 326.94 },
      { x: 125.05, y: 325.88 },
      { x: 101.74, y: 318.46 },
      { x: 95.38, y: 303.62 }], 
    counters: [alarteSpell.id, immobulusSpell.id, flippendoSpell.id],
  };

  const protegoSpell = await storage.createSpell(protego);
  console.log("Created spell:", protegoSpell.name);

  // Create tenth attack spell: риктусЕмпра (10 точек из SVG - листок)
  const rictusempra: InsertSpell = {
    name: "риктусЕмпра",
    type: "attack",
    color: "#C0C0C0",
    colorName: "Серебряный",
    description: "Листок",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 69.94, y: 279.23 },
      { x: 128.23, y: 225.71 },
      { x: 180.16, y: 176.43 },
      { x: 264.41, y: 165.83 },
      { x: 353.43, y: 170.6 },
      { x: 271.3, y: 195.51 },
      { x: 209.83, y: 252.2 },
      { x: 144.66, y: 260.15 },
      { x: 184.93, y: 216.7 },
      { x: 219.9, y: 200.81 }
    ],
  };

  const rictusempraSpell = await storage.createSpell(rictusempra);
  console.log("Created spell:", rictusempraSpell.name);

  // Create fifteenth attack spell: фурУнкулюс (12 точек из SVG - нарыв)
  const furunculus: InsertSpell = {
    name: "фурУнкулюс",
    type: "attack",
    color: "#FFD700",
    colorName: "Золотой",
    description: "Нарыв",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 193.94, y: 44.51 },
      { x: 192.88, y: 94.32 },
      { x: 201.36, y: 128.76 },
      { x: 232.62, y: 147.31 },
      { x: 275.01, y: 149.96 },
      { x: 295.15, y: 171.68 },
      { x: 296.73, y: 214.07 },
      { x: 279.25, y: 243.75 },
      { x: 240.57, y: 260.17 },
      { x: 205.59, y: 269.71 },
      { x: 192.35, y: 309.45 },
      { x: 192.35, y: 361.91 }
    ],
  };

  const furunculusSpell = await storage.createSpell(furunculus);
  console.log("Created spell:", furunculusSpell.name);

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
    counters: [baubelliusSpell.id, calvorioSpell.id, rictusempraSpell.id, furunculusSpell.id],
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

  // Create counter spell: релАшио (4 точки из SVG - вертикальная линия)
  const relaxio: InsertSpell = {
    name: "релАшио",
    type: "counter",
    color: "#FBBF24",
    colorName: "Жёлтый",
    description: "Вертикальная линия",
    gesturePattern: [
      { x: 200, y: 338 },    // Нижняя точка
      { x: 200, y: 242.61 }, // Промежуточная точка 1
      { x: 200, y: 147.22 }, // Промежуточная точка 2
      { x: 200, y: 51.84 }   // Верхняя точка
    ],
    counters: [colloshuSpell.id],
  };

  const relaxioSpell = await storage.createSpell(relaxio);
  console.log("Created spell:", relaxioSpell.name);

  // Create eighth attack spell: локомОтор мОртис (8 точек из SVG - ботинок)
  const locomotorMortis: InsertSpell = {
    name: "локомОтор мОртис",
    type: "attack",
    color: "#EF4444",
    colorName: "Красный",
    description: "Ботинок",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 147.76, y: 40 },
      { x: 163.84, y: 196.88 },
      { x: 155.84, y: 213.44 },
      { x: 61.52, y: 213.44 },
      { x: 47.44, y: 226.88 },
      { x: 47.44, y: 264.24 },
      { x: 70.72, y: 280.24 },
      { x: 273.52, y: 275.92 }
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

  // Create ninth attack spell: мУкус ад нОзем (10 точек из SVG - капля)
  const mucusAdNosem: InsertSpell = {
    name: "мУкус ад нОзем",
    type: "attack",
    color: "#22C55E",
    colorName: "Зелёный",
    description: "Капля",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 202.95, y: 59.88 },
      { x: 161.61, y: 143.6 },
      { x: 117.63, y: 208.77 },
      { x: 126.64, y: 280.31 },
      { x: 186.52, y: 331.71 },
      { x: 243.22, y: 333.3 },
      { x: 290.38, y: 277.13 },
      { x: 285.08, y: 213.01 },
      { x: 245.34, y: 143.6 },
      { x: 237.39, y: 123.46 }
    ],
  };

  const mucusAdNosemSpell = await storage.createSpell(mucusAdNosem);
  console.log("Created spell:", mucusAdNosemSpell.name);

  // Create counter spell: финИте (точка в центре)
  const finiteCounter: InsertSpell = {
    name: "финИте",
    type: "counter",
    color: "#D1D5DB",
    colorName: "Бесцветный",
    description: "Ромб",
    gesturePattern: [
      { x: 74.19, y: 223.61 },
      { x: 119.38, y: 209.84 },
      { x: 153.57, y: 187.05 },
      { x: 179.83, y: 158.44 },
      { x: 195.09, y: 121.36 },
      { x: 202.02, y: 85.88 },
      { x: 206.90, y: 55.68 },
      { x: 215.44, y: 92.76 },
      { x: 222.77, y: 120.84 },
      { x: 234.38, y: 156.33 },
      { x: 257.60, y: 186.00 },
      { x: 287.52, y: 205.07 },
      { x: 323.54, y: 219.38 },
      { x: 291.81, y: 231.03 },
      { x: 265.94, y: 246.38 },
      { x: 241.52, y: 275.52 },
      { x: 228.70, y: 303.57 },
      { x: 223.82, y: 337.47 },
      { x: 219.55, y: 373.02 },
      { x: 212.84, y: 340.80 },
      { x: 204.29, y: 309.03 },
      { x: 189.00, y: 280.40 },
      { x: 164.96, y: 251.79 },
      { x: 136.26, y: 238.55 },
      { x: 105.73, y: 234.30 }
    ],
    counters: [mucusAdNosemSpell.id],
  };

  const finiteCounterSpell = await storage.createSpell(finiteCounter);
  console.log("Created spell:", finiteCounterSpell.name);

  // Create eleventh attack spell: серпенсОртиа (5 точек из SVG - взмах палочкой)
  const serpensortia: InsertSpell = {
    name: "серпенсОртиа",
    type: "attack",
    color: "#FFFFFF",
    colorName: "Белый",
    description: "Взмах палочкой",
    gesturePattern: [
      // SVG path: m 262.95472,421.91979 v -78.15782 l -0.66235,-82.79431 -1.32471,-72.19664 -0.66236,-72.85899
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 210.36, y: 337.54 },  // m 262.95472,421.91979
      { x: 210.36, y: 275.01 },  // v -78.15782
      { x: 209.83, y: 208.78 },  // l -0.66235,-82.79431
      { x: 208.78, y: 151.02 },  // -1.32471,-72.19664
      { x: 208.25, y: 92.73 }    // -0.66236,-72.85899
    ],
  };

  const serpensortiaSpell = await storage.createSpell(serpensortia);
  console.log("Created spell:", serpensortiaSpell.name);

  // Create counter spell: випЕра эванЕско (точка в центре)
  const viperaEvanesco: InsertSpell = {
    name: "випЕра эванЕско",
    type: "counter",
    color: "#FF4500",
    colorName: "Пламенный шар",
    description: "Шар",
    gesturePattern: [
      { x: 76.30, y: 167.97 },
      { x: 97.96, y: 132.47 },
      { x: 127.10, y: 101.75 },
      { x: 163.66, y: 83.20 },
      { x: 207.11, y: 76.31 },
      { x: 243.13, y: 81.60 },
      { x: 282.35, y: 98.56 },
      { x: 310.95, y: 127.69 },
      { x: 330.03, y: 158.43 },
      { x: 341.14, y: 198.17 },
      { x: 341.14, y: 236.85 },
      { x: 331.19, y: 271.83 },
      { x: 308.87, y: 307.85 },
      { x: 279.20, y: 333.29 },
      { x: 244.23, y: 348.65 },
      { x: 207.66, y: 353.96 },
      { x: 168.43, y: 348.65 },
      { x: 132.82, y: 331.68 },
      { x: 110.03, y: 311.02 },
      { x: 85.65, y: 277.63 },
      { x: 72.96, y: 245.84 },
      { x: 69.79, y: 215.12 }
    ],
    counters: [serpensortiaSpell.id],
  };

  const viperaEvanescoSpell = await storage.createSpell(viperaEvanesco);
  console.log("Created spell:", viperaEvanescoSpell.name);

  // Create twelfth attack spell: слагУлус эрУкто (20 точек из SVG - ромб)
  const slagulusEructo: InsertSpell = {
    name: "слагУлус эрУкто",
    type: "attack",
    color: "#22C55E",
    colorName: "Зелёный",
    description: "Ромб",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 309.45, y: 48.75 },
      { x: 262.29, y: 73.65 },
      { x: 220.43, y: 93.79 },
      { x: 171.15, y: 119.22 },
      { x: 134.59, y: 136.18 },
      { x: 107.04, y: 149.96 },
      { x: 108.63, y: 190.76 },
      { x: 111.28, y: 247.99 },
      { x: 113.92, y: 294.62 },
      { x: 115.51, y: 333.83 },
      { x: 117.10, y: 361.38 },
      { x: 158.44, y: 340.19 },
      { x: 198.71, y: 321.64 },
      { x: 238.45, y: 304.15 },
      { x: 271.83, y: 289.32 },
      { x: 297.26, y: 276.60 },
      { x: 296.73, y: 236.33 },
      { x: 297.26, y: 204.01 },
      { x: 297.26, y: 161.08 },
      { x: 297.26, y: 125.58 }
    ],
  };

  const slagulusEructoSpell = await storage.createSpell(slagulusEructo);
  console.log("Created spell:", slagulusEructoSpell.name);

  // Create counter spell: вомитАре вИридис (точка в центре)
  const vomitareViridis: InsertSpell = {
    name: "вомитАре вИридис",
    type: "counter",
    color: "#22C55E",
    colorName: "Зелёный",
    description: "Поток",
    gesturePattern: [
      { x: 235.27, y: 323.23 },
      { x: 243.22, y: 295.68 },
      { x: 250.44, y: 265.59 },
      { x: 257.64, y: 233.79 },
      { x: 265.27, y: 199.07 },
      { x: 269.93, y: 169.99 },
      { x: 264.42, y: 159.82 },
      { x: 252.52, y: 159.40 },
      { x: 236.89, y: 171.69 },
      { x: 211.88, y: 192.88 },
      { x: 182.62, y: 219.58 },
      { x: 158.87, y: 244.92 },
      { x: 157.28, y: 260.29 },
      { x: 169.96, y: 261.88 },
      { x: 199.63, y: 247.34 },
      { x: 211.05, y: 244.16 },
      { x: 213.70, y: 258.04 },
      { x: 196.32, y: 285.47 },
      { x: 174.27, y: 318.54 }
    ],
    counters: [slagulusEructoSpell.id],
  };

  const vomitareViridisSpell = await storage.createSpell(vomitareViridis);
  console.log("Created spell:", vomitareViridisSpell.name);

  // Create fourteenth attack spell: фУмос (18 точек из SVG - спираль)
  const fumos: InsertSpell = {
    name: "фУмос",
    type: "attack",
    color: "#FFFF00",
    colorName: "Жёлтый",
    description: "Спираль",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 200.85, y: 152.04 },
      { x: 229.46, y: 173.23 },
      { x: 247.48, y: 199.20 },
      { x: 244.30, y: 231.52 },
      { x: 206.68, y: 254.30 },
      { x: 158.46, y: 253.77 },
      { x: 119.24, y: 225.16 },
      { x: 104.94, y: 187.54 },
      { x: 111.30, y: 141.44 },
      { x: 140.44, y: 105.41 },
      { x: 185.48, y: 86.86 },
      { x: 232.11, y: 91.63 },
      { x: 277.68, y: 119.71 },
      { x: 310.00, y: 166.34 },
      { x: 309.47, y: 240.53 },
      { x: 284.04, y: 291.92 },
      { x: 232.11, y: 321.60 },
      { x: 175.94, y: 331.67 }
    ],
  };

  const fumosSpell = await storage.createSpell(fumos);
  console.log("Created spell:", fumosSpell.name);

  // Create counter spell: вЕнтус (19 точек из SVG - вращение)
  const ventus: InsertSpell = {
    name: "вЕнтус",
    type: "counter",
    color: "#808080",
    colorName: "Серый",
    description: "Вращение",
    gesturePattern: [
      // SVG 500x500 -> Canvas 400x400 (умножаем на 0.8)
      { x: 346.01, y: 166.91 },
      { x: 304.15, y: 103.13 },
      { x: 222.53, y: 73.98 },
      { x: 148.35, y: 86.64 },
      { x: 83.17, y: 162.94 },
      { x: 70.98, y: 239.77 },
      { x: 113.90, y: 310.24 },
      { x: 198.16, y: 341.49 },
      { x: 289.82, y: 327.22 },
      { x: 333.80, y: 247.74 },
      { x: 308.37, y: 192.12 },
      { x: 258.03, y: 143.35 },
      { x: 181.73, y: 142.82 },
      { x: 139.34, y: 191.59 },
      { x: 146.23, y: 246.68 },
      { x: 198.16, y: 278.46 },
      { x: 248.49, y: 271.57 },
      { x: 264.92, y: 232.88 },
      { x: 224.12, y: 203.73 }
    ],
    counters: [fumosSpell.id],
  };

  const ventusSpell = await storage.createSpell(ventus);
  console.log("Created spell:", ventusSpell.name);

  // Create sixteenth attack spell: энгОргио (симметричные круги)
  const engorgio: InsertSpell = {
    name: "энгОргио",
    type: "attack",
    color: "#40E0D0",
    colorName: "Бирюзовый",
    description: "Круги",
    gesturePattern: [
      // Левый круг
      { x: 179.63, y: 66.24 },
      { x: 176.45, y: 112.87 },
      { x: 133.53, y: 139.91 },
      { x: 100.68, y: 175.41 },
      { x: 94.85, y: 221.00 },
      { x: 96.44, y: 268.69 },
      { x: 126.33, y: 306.84 },
      { x: 171.29, y: 336.52 },
      // Правый круг (зеркало левого)
      { x: 228.71, y: 336.52 },
      { x: 273.67, y: 306.84 },
      { x: 303.56, y: 268.69 },
      { x: 305.15, y: 221.00 },
      { x: 299.32, y: 175.41 },
      { x: 266.47, y: 139.91 },
      { x: 223.55, y: 112.87 },
      { x: 220.37, y: 66.24 }
    ],
  };

  const engorgioSpell = await storage.createSpell(engorgio);
  console.log("Created spell:", engorgioSpell.name);

  // Create counter spell: редУцио (точка в центре)
  const reducio: InsertSpell = {
    name: "редУцио",
    type: "counter",
    color: "#8B00FF",
    colorName: "Фиолетовый",
    description: "Круги",
    gesturePattern: [
      { x: 179.63, y: 333.76 },
      { x: 176.45, y: 287.13 },
      { x: 133.53, y: 260.09 },
      { x: 100.68, y: 224.59 },
      { x: 94.85, y: 179.00 },
      { x: 96.44, y: 131.31 },
      { x: 126.33, y: 93.16 },
      { x: 171.29, y: 63.48 },
      // Правый круг (зеркало левого)
      { x: 228.71, y: 63.48 },
      { x: 273.67, y: 93.16 },
      { x: 303.56, y: 131.31 },
      { x: 305.15, y: 179.00 },
      { x: 299.32, y: 224.59 },
      { x: 266.47, y: 260.09 },
      { x: 223.55, y: 287.13 },
      { x: 220.37, y: 333.76 }
    ],
    counters: [engorgioSpell.id],
  };

  const reducioSpell = await storage.createSpell(reducio);
  console.log("Created spell:", reducioSpell.name);

  console.log("Spells initialized successfully!");
}

async function updateExistingSpells(existingSpells: any[], storage: PostgresStorage) {
  console.log("Updating existing spells...");
  console.log(`Total existing spells: ${existingSpells.length}`);
  
  // Create a map of existing spells by name for easy lookup
  const spellMap = new Map(existingSpells.map(spell => [spell.name, spell]));
  console.log(`Spell map created with ${spellMap.size} spells`);
  
  // Define the spells that need to be updated with their new patterns
  const spellsToUpdate = [
    {
      name: "вомитАре вИридис",
      description: "Поток",
      gesturePattern: [
        { x: 235.27, y: 323.23 },
        { x: 243.22, y: 295.68 },
        { x: 250.44, y: 265.59 },
        { x: 257.64, y: 233.79 },
        { x: 265.27, y: 199.07 },
        { x: 269.93, y: 169.99 },
        { x: 264.42, y: 159.82 },
        { x: 252.52, y: 159.40 },
        { x: 236.89, y: 171.69 },
        { x: 211.88, y: 192.88 },
        { x: 182.62, y: 219.58 },
        { x: 158.87, y: 244.92 },
        { x: 157.28, y: 260.29 },
        { x: 169.96, y: 261.88 },
        { x: 199.63, y: 247.34 },
        { x: 211.05, y: 244.16 },
        { x: 213.70, y: 258.04 },
        { x: 196.32, y: 285.47 },
        { x: 174.27, y: 318.54 }
      ]
    },
    {
      name: "редУцио",
      description: "Круги",
      gesturePattern: [
        { x: 179.63, y: 333.76 },
        { x: 176.45, y: 287.13 },
        { x: 133.53, y: 260.09 },
        { x: 100.68, y: 224.59 },
        { x: 94.85, y: 179.00 },
        { x: 96.44, y: 131.31 },
        { x: 126.33, y: 93.16 },
        { x: 171.29, y: 63.48 },
        // Правый круг (зеркало левого)
        { x: 228.71, y: 63.48 },
        { x: 273.67, y: 93.16 },
        { x: 303.56, y: 131.31 },
        { x: 305.15, y: 179.00 },
        { x: 299.32, y: 224.59 },
        { x: 266.47, y: 260.09 },
        { x: 223.55, y: 287.13 },
        { x: 220.37, y: 333.76 }
      ]
    }
  ];

  // Update spells that need to be updated
  for (const spellData of spellsToUpdate) {
    const existingSpell = spellMap.get(spellData.name);
    if (existingSpell) {
      console.log(`Found spell to update: ${spellData.name}`);
      console.log(`Current description: ${existingSpell.description}`);
      console.log(`Expected description: ${spellData.description}`);
      console.log(`Current gesture pattern length: ${existingSpell.gesturePattern.length}`);
      console.log(`Expected gesture pattern length: ${spellData.gesturePattern.length}`);
      
      // Check if the spell needs to be updated by comparing description and gesture pattern length
      const needsUpdate = existingSpell.description !== spellData.description ||
                          existingSpell.gesturePattern.length !== spellData.gesturePattern.length;
      
      if (needsUpdate) {
        console.log(`Spell needs update: ${spellData.name}`);
        await storage.updateSpell(existingSpell.id, {
          description: spellData.description,
          gesturePattern: spellData.gesturePattern
        });
        console.log(`Updated spell: ${spellData.name}`);
      } else {
        console.log(`Spell is already up to date: ${spellData.name}`);
      }
    } else {
      console.log(`Spell not found: ${spellData.name}`);
    }
  }
  
  console.log("Finished checking and updating spells.");
}
