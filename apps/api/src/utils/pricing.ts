/**
 * Dynamic Pricing Engine
 * 
 * This module implements a dynamic pricing algorithm that adjusts ticket prices
 * based on demand, time to event, and inventory levels using configurable weights.
 * 
 * Pricing Formula:
 * price = base_price * (1 + w1*demand_factor + w2*time_factor + w3*inventory_factor)
 * 
 * Where:
 * - base_price: The initial/baseline price for the ticket
 * - w1, w2, w3: Configurable weights for demand, time, and inventory factors
 * - demand_factor: Normalized demand metric (0-1 range, higher = more demand)
 * - time_factor: Time-based adjustment (-1 to 1 range, closer to event = higher)
 * - inventory_factor: Inventory scarcity metric (0-1 range, lower inventory = higher)
 * 
 * Configuration:
 * Weights are loaded from environment variables:
 * - PRICING_WEIGHT_DEMAND (w1): Default 0.3
 * - PRICING_WEIGHT_TIME (w2): Default 0.2
 * - PRICING_WEIGHT_INVENTORY (w3): Default 0.5
 */

export interface PricingFactors {
  demandFactor: number;    // 0-1: booking velocity/demand intensity
  timeFactor: number;       // -1 to 1: time proximity to event
  inventoryFactor: number;  // 0-1: scarcity of remaining tickets
}

export interface PricingWeights {
  w1: number; // demand weight
  w2: number; // time weight
  w3: number; // inventory weight
}

export interface PricingInput {
  basePrice: number;
  factors: PricingFactors;
  weights?: PricingWeights; // Optional, will use env vars if not provided
}

/**
 * Load pricing weights from environment variables
 * Falls back to default values if not configured
 */
export function loadPricingWeights(): PricingWeights {
  return {
    w1: parseFloat(process.env.PRICING_WEIGHT_DEMAND || '0.3'),
    w2: parseFloat(process.env.PRICING_WEIGHT_TIME || '0.2'),
    w3: parseFloat(process.env.PRICING_WEIGHT_INVENTORY || '0.5'),
  };
}

/**
 * Validate pricing factors are within expected ranges
 */
function validateFactors(factors: PricingFactors): void {
  if (factors.demandFactor < 0 || factors.demandFactor > 1) {
    throw new Error('Demand factor must be between 0 and 1');
  }
  if (factors.timeFactor < -1 || factors.timeFactor > 1) {
    throw new Error('Time factor must be between -1 and 1');
  }
  if (factors.inventoryFactor < 0 || factors.inventoryFactor > 1) {
    throw new Error('Inventory factor must be between 0 and 1');
  }
}

/**
 * Validate pricing weights
 */
function validateWeights(weights: PricingWeights): void {
  if (weights.w1 < 0 || weights.w2 < 0 || weights.w3 < 0) {
    throw new Error('Weights must be non-negative');
  }
}

/**
 * Calculate dynamic ticket price based on various factors
 * 
 * @param input - Pricing input containing base price, factors, and optional weights
 * @returns Calculated dynamic price
 */
export function calculateDynamicPrice(input: PricingInput): number {
  const { basePrice, factors, weights } = input;

  // Validate base price
  if (basePrice <= 0) {
    throw new Error('Base price must be greater than 0');
  }

  // Validate factors
  validateFactors(factors);

  // Use provided weights or load from environment
  const pricingWeights = weights || loadPricingWeights();
  validateWeights(pricingWeights);

  // Calculate the adjustment multiplier
  const adjustment = 
    pricingWeights.w1 * factors.demandFactor +
    pricingWeights.w2 * factors.timeFactor +
    pricingWeights.w3 * factors.inventoryFactor;

  // Calculate final price
  const finalPrice = basePrice * (1 + adjustment);

  // Ensure price doesn't go below a minimum threshold (e.g., 10% of base price)
  const minimumPrice = basePrice * 0.1;
  return Math.max(finalPrice, minimumPrice);
}

/**
 * Calculate demand factor based on booking velocity
 * 
 * @param bookingsInWindow - Number of bookings in recent time window
 * @param maxExpectedBookings - Maximum expected bookings in that window
 * @returns Normalized demand factor (0-1)
 */
export function calculateDemandFactor(
  bookingsInWindow: number,
  maxExpectedBookings: number
): number {
  if (maxExpectedBookings <= 0) {
    throw new Error('Max expected bookings must be greater than 0');
  }
  return Math.min(bookingsInWindow / maxExpectedBookings, 1);
}

/**
 * Calculate time factor based on proximity to event
 * 
 * @param daysUntilEvent - Number of days until the event
 * @param totalDaysBeforeEvent - Total days from event creation to event date
 * @returns Time factor (-1 to 1, higher when closer to event)
 */
export function calculateTimeFactor(
  daysUntilEvent: number,
  totalDaysBeforeEvent: number
): number {
  if (totalDaysBeforeEvent <= 0) {
    throw new Error('Total days before event must be greater than 0');
  }
  if (daysUntilEvent < 0) {
    throw new Error('Days until event cannot be negative');
  }

  // Linear interpolation: -1 (far from event) to 1 (close to event)
  const progress = 1 - (daysUntilEvent / totalDaysBeforeEvent);
  return progress * 2 - 1; // Map from [0,1] to [-1,1]
}

/**
 * Calculate inventory factor based on remaining capacity
 * 
 * @param remainingCapacity - Number of tickets still available
 * @param totalCapacity - Total event capacity
 * @returns Inventory factor (0-1, higher when inventory is scarce)
 */
export function calculateInventoryFactor(
  remainingCapacity: number,
  totalCapacity: number
): number {
  if (totalCapacity <= 0) {
    throw new Error('Total capacity must be greater than 0');
  }
  if (remainingCapacity < 0 || remainingCapacity > totalCapacity) {
    throw new Error('Remaining capacity must be between 0 and total capacity');
  }

  // Scarcity factor: higher when fewer tickets remain
  return 1 - (remainingCapacity / totalCapacity);
}
