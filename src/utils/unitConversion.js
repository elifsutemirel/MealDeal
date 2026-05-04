// Unit conversion utilities for MealDeal
// Handles conversions between weight units, volume units, and count units.

/**
 * Unit groups with their base unit and conversion factors.
 * toBase[unit] = how many base-units are in 1 of that unit.
 * e.g. weight base = 'g', so toBase['kg'] = 1000 (1 kg = 1000 g)
 */
export const UNIT_GROUPS = {
  weight: {
    units: ['kg', 'g', 'mg', 'lb', 'oz'],
    baseUnit: 'g',
    toBase: { kg: 1000, g: 1, mg: 0.001, lb: 453.592, oz: 28.3495 },
  },
  volume: {
    units: ['L', 'ml', 'cup', 'tbsp', 'tsp'],
    baseUnit: 'ml',
    toBase: { L: 1000, ml: 1, cup: 236.588, tbsp: 14.7868, tsp: 4.92892 },
  },
  // Count units are only compatible with themselves (no cross-conversion)
  count: {
    units: ['pc', 'pcs', 'bunch', 'clove', 'spear', 'can', 'adet'],
    baseUnit: 'pc',
    toBase: { pc: 1, pcs: 1, bunch: 1, clove: 1, spear: 1, can: 1, adet: 1 },
  },
};

/**
 * Returns the group entry for a unit, or null if the unit is unknown.
 * @param {string} unit
 * @returns {{ groupName: string, group: object } | null}
 */
export function getUnitGroup(unit) {
  for (const [groupName, group] of Object.entries(UNIT_GROUPS)) {
    if (group.units.includes(unit)) return { groupName, group };
  }
  return null;
}

/**
 * Returns true when unitA and unitB can be converted between each other.
 * Count units are only compatible with themselves.
 */
export function areUnitsCompatible(unitA, unitB) {
  if (unitA === unitB) return true;
  const gA = getUnitGroup(unitA);
  const gB = getUnitGroup(unitB);
  if (!gA || !gB) return false;
  if (gA.groupName !== gB.groupName) return false;
  if (gA.groupName === 'count') return false; // different count units are not interchangeable
  return true;
}

/**
 * Converts `amount` from `fromUnit` to `toUnit`.
 * Returns null when the units are not compatible.
 */
export function convertAmount(amount, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount;
  const gA = getUnitGroup(fromUnit);
  const gB = getUnitGroup(toUnit);
  if (!gA || !gB || gA.groupName !== gB.groupName) return null;
  if (gA.groupName === 'count') return null; // different count units cannot be converted
  const inBase = amount * gA.group.toBase[fromUnit];
  return inBase / gA.group.toBase[toUnit];
}

/**
 * Returns true when a supplier with `supplierQty` in `supplierUnit` can
 * provide the `recipeQty` required in `recipeUnit`.
 */
export function canSupplierFulfill(supplierQty, supplierUnit, recipeQty, recipeUnit) {
  if (supplierUnit === recipeUnit) return supplierQty >= recipeQty;
  const convertedSupplierQty = convertAmount(supplierQty, supplierUnit, recipeUnit);
  if (convertedSupplierQty === null) return false; // incompatible units
  return convertedSupplierQty >= recipeQty;
}

/**
 * Returns the price for 1 recipeUnit given the supplier's price per supplierUnit.
 *
 * Example: supplier charges $10/g, recipe unit is kg
 *   → returns $10,000/kg  (because 1 kg = 1000 g, so 1000 × $10 = $10,000)
 *
 * Returns null when the units are not compatible.
 */
export function getPricePerRecipeUnit(supplierPrice, supplierUnit, recipeUnit) {
  if (supplierUnit === recipeUnit) return supplierPrice;
  // How many supplierUnits are in 1 recipeUnit?
  const supplierUnitsPerRecipeUnit = convertAmount(1, recipeUnit, supplierUnit);
  if (supplierUnitsPerRecipeUnit === null) return null;
  return supplierPrice * supplierUnitsPerRecipeUnit;
}

/** Human-readable label for each unit symbol. */
export const UNIT_LABELS = {
  kg: 'kg (Kilogram)',
  g: 'g (Gram)',
  mg: 'mg (Milligram)',
  lb: 'lb (Pound)',
  oz: 'oz (Ounce)',
  L: 'L (Litre)',
  ml: 'ml (Millilitre)',
  cup: 'cup',
  tbsp: 'tbsp (Tablespoon)',
  tsp: 'tsp (Teaspoon)',
  pc: 'pc (Piece)',
  pcs: 'pcs (Pieces)',
  bunch: 'bunch',
  clove: 'clove',
  spear: 'spear',
  can: 'can',
  adet: 'adet',
};
