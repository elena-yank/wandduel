import { type Point } from "@shared/schema";

// Predefined gesture patterns for spells
export const spellGesturePatterns = {
  // Attack spells
  stupefy: [
    { x: 0, y: 50 },
    { x: 100, y: 50 }
  ] as Point[], // Straight horizontal line
  
  expelliarmus: [
    { x: 20, y: 80 },
    { x: 50, y: 40 },
    { x: 80, y: 20 }
  ] as Point[], // Upward diagonal swish
  
  incendio: [
    { x: 50, y: 20 },
    { x: 80, y: 50 },
    { x: 50, y: 80 },
    { x: 20, y: 50 },
    { x: 50, y: 20 }
  ] as Point[], // Circular motion
  
  // Counter spells
  protego: [
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
    { x: 95.38, y: 303.62 }
  ] as Point[], // Upward V shape
  
  finiteIncantatem: [
    { x: 20, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 },
    { x: 80, y: 20 }
  ] as Point[], // X pattern
  
  aguamenti: [
    { x: 50, y: 20 },
    { x: 30, y: 40 },
    { x: 70, y: 60 },
    { x: 50, y: 80 }
  ] as Point[], // Wavy pattern
};

// Spell counter relationships
export const spellCounters = {
  stupefy: ["protego"],
  expelliarmus: ["finiteIncantatem"],
  incendio: ["aguamenti"],
} as const;

// Spell colors and descriptions
export const spellInfo = {
  stupefy: {
    name: "Stupefy",
    color: "#EF4444",
    colorName: "Red",
    description: "Stunning spell that renders the target unconscious",
    type: "attack" as const,
  },
  expelliarmus: {
    name: "Expelliarmus", 
    color: "#DC2626",
    colorName: "Scarlet",
    description: "Disarming charm that forces the target to release whatever they're holding",
    type: "attack" as const,
  },
  incendio: {
    name: "Incendio",
    color: "#F97316", 
    colorName: "Orange",
    description: "Fire spell that produces flames from the wand tip",
    type: "attack" as const,
  },
  protego: {
    name: "Protego",
    color: "#3B82F6",
    colorName: "Blue", 
    description: "Shield charm that creates a magical barrier",
    type: "counter" as const,
  },
  finiteIncantatem: {
    name: "Finite Incantatem",
    color: "#A855F7",
    colorName: "Purple",
    description: "Spell cancellation that ends ongoing magical effects",
    type: "counter" as const,
  },
  aguamenti: {
    name: "Aguamenti", 
    color: "#06B6D4",
    colorName: "Aqua",
    description: "Water conjuring spell that produces a stream of water",
    type: "counter" as const,
  },
} as const;

// Helper function to get gesture pattern for a spell
export function getSpellGesturePattern(spellName: string): Point[] | null {
  const normalizedName = spellName.toLowerCase().replace(/\s+/g, '');
  
  switch (normalizedName) {
    case 'stupefy':
      return spellGesturePatterns.stupefy;
    case 'expelliarmus':
      return spellGesturePatterns.expelliarmus;
    case 'incendio':
      return spellGesturePatterns.incendio;
    case 'protego':
      return spellGesturePatterns.protego;
    case 'finiteincantatem':
      return spellGesturePatterns.finiteIncantatem;
    case 'aguamenti':
      return spellGesturePatterns.aguamenti;
    default:
      return null;
  }
}

// Helper function to check if a spell can counter another
export function canCounterSpell(attackSpell: string, counterSpell: string): boolean {
  const normalizedAttack = attackSpell.toLowerCase().replace(/\s+/g, '') as keyof typeof spellCounters;
  const normalizedCounter = counterSpell.toLowerCase().replace(/\s+/g, '');
  
  const validCounters = spellCounters[normalizedAttack];
  return validCounters ? (validCounters as readonly string[]).includes(normalizedCounter) : false;
}
