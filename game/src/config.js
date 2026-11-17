// Emberlight — tuning and world constants. One place for every number that
// shapes how the game feels, so balance changes never touch logic.
export const WORLD = {
  width: 960,
  height: 600,
};

export const EMBER = {
  radius: 10,
  speed: 230,
  // Flame drains the whole time; the game is a race against it.
  flameMax: 100,
  flameStart: 100,
  // Lighting a brazier feeds the flame.
  brazierFlame: 18,
  // A wisp touch steals this much flame.
  wispHitFlame: 22,
  // After a hit the ember flickers and cannot kindle for this long.
  flickerSeconds: 1.2,
  // A firefly feeds this much flame.
  fireflyFlame: 10,
};

export const BRAZIER = {
  // How close the ember must stand to kindle.
  kindleRadius: 52,
  // Seconds of standing close to light a brazier.
  kindleSeconds: 0.7,
  // Light radius a lit brazier throws.
  glowRadius: 120,
};

export const WISP = {
  radius: 13,
};

export const FIREFLY = {
  radius: 4,
  collectRadius: 26,
  // Seconds after being caught before one returns.
  respawnSeconds: 6,
};

export const SCORE = {
  brazier: 150,
  firefly: 25,
  // Lighting braziers quickly in a row builds a chain; each extra link
  // in the chain is worth this much times the chain length.
  comboStep: 50,
  // Seconds between brazier lights before the chain resets.
  comboWindow: 6,
  levelBase: 200,
  // Level-clear bonus adds this per point of flame left.
  flameBonus: 5,
  // Level-clear bonus adds this much minus seconds played times this.
  timeBonusMax: 300,
  timeBonusPerSecond: 5,
};

export const LIGHT = {
  emberRadius: 215,
  fireflyRadius: 42,
};

export const BEST_KEY = 'emberlight.best';
