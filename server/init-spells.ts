import { storage } from "./storage";
import { type InsertSpell } from "@shared/schema";

export async function initializeSpells() {
  // Create first attack spell: алАрте аскЕндаре
  const alarte: InsertSpell = {
    name: "алАрте аскЕндаре",
    type: "attack",
    color: "#FFD700",
    colorName: "Золотой",
    description: "Направить на оппонента",
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
    description: "Направить на оппонента",
    gesturePattern: [{ x: 200, y: 200 }], // Same as алАрте аскЕндаре - point at opponent
  };

  const baubelliusSpell = await storage.createSpell(baubellius);
  console.log("Created spell:", baubelliusSpell.name);

  // Create counter spell: протЕго
  const protego: InsertSpell = {
    name: "протЕго",
    type: "counter",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Направить на объект",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
    counters: [alarteSpell.id],
  };

  const protegoSpell = await storage.createSpell(protego);
  console.log("Created spell:", protegoSpell.name);

  // Create counter spell: финИте инкантАтем (shield pattern)
  const finiteIncantatem: InsertSpell = {
    name: "финИте инкантАтем",
    type: "counter",
    color: "#DC143C",
    colorName: "Красный",
    description: "Щит",
    gesturePattern: [
      // Wavy top line (two waves)
      { x: 90, y: 80 },    // Start left
      { x: 120, y: 100 },  // First wave down
      { x: 150, y: 80 },   // First peak up
      { x: 180, y: 70 },   // Middle dip
      { x: 220, y: 80 },   // Second wave up
      { x: 250, y: 100 },  // Second wave down
      { x: 310, y: 80 },   // End right
      // Right side down
      { x: 310, y: 120 },
      { x: 310, y: 180 },
      { x: 300, y: 240 },
      // Bottom curve (shield point)
      { x: 270, y: 290 },
      { x: 230, y: 320 },
      { x: 200, y: 330 },  // Bottom center point
      { x: 170, y: 320 },
      { x: 130, y: 290 },
      // Left side up
      { x: 100, y: 240 },
      { x: 90, y: 180 },
      { x: 90, y: 120 },
      { x: 90, y: 80 }     // Back to start
    ],
    counters: [baubelliusSpell.id],
  };

  const finiteSpell = await storage.createSpell(finiteIncantatem);
  console.log("Created spell:", finiteSpell.name);

  console.log("Spells initialized successfully!");
}
