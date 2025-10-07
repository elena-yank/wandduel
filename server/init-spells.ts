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
      { x: 50, y: 10 },  // Top center
      { x: 20, y: 15 },  // Left top
      { x: 15, y: 50 },  // Left middle
      { x: 35, y: 85 },  // Left bottom
      { x: 50, y: 95 },  // Bottom point (shield tip)
      { x: 65, y: 85 },  // Right bottom
      { x: 85, y: 50 },  // Right middle
      { x: 80, y: 15 },  // Right top
      { x: 50, y: 10 }   // Back to top (close the shield)
    ],
    counters: [baubelliusSpell.id],
  };

  const finiteSpell = await storage.createSpell(finiteIncantatem);
  console.log("Created spell:", finiteSpell.name);

  console.log("Spells initialized successfully!");
}
