/**
 * Unit Tests for Dynamic Pricing Engine
 * 
 * This test suite provides comprehensive coverage for the pricing engine,
 * testing all calculation functions, validation logic, and edge cases.
 */

import {
  calculateDynamicPrice,
  calculateDemandFactor,
  calculateTimeFactor,
  calculateInventoryFactor,
  loadPricingWeights,
  type PricingInput,
  type PricingFactors,
  type PricingWeights,
} from './pricing';

describe('Dynamic Pricing Engine', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadPricingWeights', () => {
    it('should load default weights when env vars are not set', () => {
      delete process.env.PRICING_WEIGHT_DEMAND;
      delete process.env.PRICING_WEIGHT_TIME;
      delete process.env.PRICING_WEIGHT_INVENTORY;

      const weights = loadPricingWeights();

      expect(weights).toEqual({
        w1: 0.3,
        w2: 0.2,
        w3: 0.5,
      });
    });

    it('should load weights from environment variables', () => {
      process.env.PRICING_WEIGHT_DEMAND = '0.4';
      process.env.PRICING_WEIGHT_TIME = '0.3';
      process.env.PRICING_WEIGHT_INVENTORY = '0.6';

      const weights = loadPricingWeights();

      expect(weights).toEqual({
        w1: 0.4,
        w2: 0.3,
        w3: 0.6,
      });
    });

    it('should handle partial environment configuration', () => {
      process.env.PRICING_WEIGHT_DEMAND = '0.5';
      delete process.env.PRICING_WEIGHT_TIME;
      delete process.env.PRICING_WEIGHT_INVENTORY;

      const weights = loadPricingWeights();

      expect(weights).toEqual({
        w1: 0.5,
        w2: 0.2,
        w3: 0.5,
      });
    });
  });

  describe('calculateDemandFactor', () => {
    it('should calculate demand factor correctly for normal demand', () => {
      const result = calculateDemandFactor(50, 100);
      expect(result).toBe(0.5);
    });

    it('should return 1 when demand exceeds maximum (cap at 1)', () => {
      const result = calculateDemandFactor(150, 100);
      expect(result).toBe(1);
    });

    it('should return 0 when there are no bookings', () => {
      const result = calculateDemandFactor(0, 100);
      expect(result).toBe(0);
    });

    it('should handle fractional demand factors', () => {
      const result = calculateDemandFactor(33, 100);
      expect(result).toBe(0.33);
    });

    it('should throw error for invalid maxExpectedBookings (zero)', () => {
      expect(() => calculateDemandFactor(50, 0)).toThrow(
        'Max expected bookings must be greater than 0'
      );
    });

    it('should throw error for negative maxExpectedBookings', () => {
      expect(() => calculateDemandFactor(50, -100)).toThrow(
        'Max expected bookings must be greater than 0'
      );
    });
  });

  describe('calculateTimeFactor', () => {
    it('should calculate time factor for event far in future', () => {
      const result = calculateTimeFactor(90, 100); // 90% of time remaining
      expect(result).toBeCloseTo(-0.8, 5);
    });

    it('should calculate time factor for event happening soon', () => {
      const result = calculateTimeFactor(10, 100); // 10% of time remaining
      expect(result).toBeCloseTo(0.8, 5);
    });

    it('should return 1 when event is happening now (0 days)', () => {
      const result = calculateTimeFactor(0, 100);
      expect(result).toBe(1);
    });

    it('should return -1 when event just created (full time available)', () => {
      const result = calculateTimeFactor(100, 100);
      expect(result).toBe(-1);
    });

    it('should calculate time factor for midpoint', () => {
      const result = calculateTimeFactor(50, 100);
      expect(result).toBe(0);
    });

    it('should throw error for invalid totalDaysBeforeEvent (zero)', () => {
      expect(() => calculateTimeFactor(50, 0)).toThrow(
        'Total days before event must be greater than 0'
      );
    });

    it('should throw error for negative totalDaysBeforeEvent', () => {
      expect(() => calculateTimeFactor(50, -100)).toThrow(
        'Total days before event must be greater than 0'
      );
    });

    it('should throw error for negative daysUntilEvent', () => {
      expect(() => calculateTimeFactor(-10, 100)).toThrow(
        'Days until event cannot be negative'
      );
    });
  });

  describe('calculateInventoryFactor', () => {
    it('should calculate inventory factor for half capacity', () => {
      const result = calculateInventoryFactor(50, 100);
      expect(result).toBe(0.5);
    });

    it('should return 0 when inventory is full', () => {
      const result = calculateInventoryFactor(100, 100);
      expect(result).toBe(0);
    });

    it('should return 1 when inventory is empty', () => {
      const result = calculateInventoryFactor(0, 100);
      expect(result).toBe(1);
    });

    it('should calculate inventory factor for low remaining capacity', () => {
      const result = calculateInventoryFactor(10, 100);
      expect(result).toBe(0.9);
    });

    it('should handle fractional inventory factors', () => {
      const result = calculateInventoryFactor(33, 100);
      expect(result).toBeCloseTo(0.67, 2);
    });

    it('should throw error for invalid totalCapacity (zero)', () => {
      expect(() => calculateInventoryFactor(50, 0)).toThrow(
        'Total capacity must be greater than 0'
      );
    });

    it('should throw error for negative totalCapacity', () => {
      expect(() => calculateInventoryFactor(50, -100)).toThrow(
        'Total capacity must be greater than 0'
      );
    });

    it('should throw error when remaining capacity exceeds total', () => {
      expect(() => calculateInventoryFactor(150, 100)).toThrow(
        'Remaining capacity must be between 0 and total capacity'
      );
    });

    it('should throw error for negative remaining capacity', () => {
      expect(() => calculateInventoryFactor(-10, 100)).toThrow(
        'Remaining capacity must be between 0 and total capacity'
      );
    });
  });

  describe('calculateDynamicPrice', () => {
    const basePrice = 100;
    const defaultWeights: PricingWeights = {
      w1: 0.3,
      w2: 0.2,
      w3: 0.5,
    };

    describe('Basic Price Calculations', () => {
      it('should calculate price with zero factors (baseline)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: 0,
            inventoryFactor: 0,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(basePrice);
      });

      it('should increase price with high demand', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1,
            timeFactor: 0,
            inventoryFactor: 0,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(130); // 100 * (1 + 0.3*1) = 130
      });

      it('should increase price when event is near (positive time factor)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: 1,
            inventoryFactor: 0,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(120); // 100 * (1 + 0.2*1) = 120
      });

      it('should decrease price when event is far (negative time factor)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: -1,
            inventoryFactor: 0,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(80); // 100 * (1 + 0.2*(-1)) = 80
      });

      it('should increase price with high inventory scarcity', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: 0,
            inventoryFactor: 1,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(150); // 100 * (1 + 0.5*1) = 150
      });
    });

    describe('Combined Factor Scenarios', () => {
      it('should handle high demand, near event, low inventory (peak pricing)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1,
            timeFactor: 1,
            inventoryFactor: 1,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(200); // 100 * (1 + 0.3 + 0.2 + 0.5) = 200
      });

      it('should handle low demand, far event, high inventory (low pricing)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: -1,
            inventoryFactor: 0,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(80); // 100 * (1 + 0.2*(-1)) = 80
      });

      it('should handle moderate mixed factors', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0.5,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(150); // 100 * (1 + 0.3*0.5 + 0.2*0.5 + 0.5*0.5) = 150
      });

      it('should handle realistic scenario: medium demand, upcoming event, half sold', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.6,
            timeFactor: 0.8,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        // 100 * (1 + 0.3*0.6 + 0.2*0.8 + 0.5*0.5) = 100 * 1.59 = 159
        expect(result).toBe(159);
      });
    });

    describe('Weight Variations', () => {
      it('should use custom weights when provided', () => {
        const customWeights: PricingWeights = {
          w1: 0.5,
          w2: 0.3,
          w3: 0.2,
        };

        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1,
            timeFactor: 1,
            inventoryFactor: 1,
          },
          weights: customWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(200); // 100 * (1 + 0.5 + 0.3 + 0.2) = 200
      });

      it('should load weights from environment when not provided', () => {
        process.env.PRICING_WEIGHT_DEMAND = '0.4';
        process.env.PRICING_WEIGHT_TIME = '0.3';
        process.env.PRICING_WEIGHT_INVENTORY = '0.3';

        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1,
            timeFactor: 0,
            inventoryFactor: 1,
          },
        };

        const result = calculateDynamicPrice(input);
        // 100 * (1 + 0.4*1 + 0.3*0 + 0.3*1) = 100 * 1.7 = 170
        expect(result).toBe(170);
      });

      it('should handle zero weights (no price adjustment)', () => {
        const zeroWeights: PricingWeights = {
          w1: 0,
          w2: 0,
          w3: 0,
        };

        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1,
            timeFactor: 1,
            inventoryFactor: 1,
          },
          weights: zeroWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(basePrice);
      });
    });

    describe('Minimum Price Floor', () => {
      it('should enforce minimum price floor (10% of base price)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: -1,
            inventoryFactor: 0,
          },
          weights: {
            w1: 0,
            w2: 1, // High weight on negative time factor
            w3: 0,
          },
        };

        const result = calculateDynamicPrice(input);
        // Would calculate to 100 * (1 + 1*(-1)) = 0
        // But floor is 10% of base = 10
        expect(result).toBe(10);
      });

      it('should not apply floor when price is above minimum', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0,
            timeFactor: -0.5,
            inventoryFactor: 0,
          },
          weights: {
            w1: 0,
            w2: 1,
            w3: 0,
          },
        };

        const result = calculateDynamicPrice(input);
        // 100 * (1 + 1*(-0.5)) = 50, which is > 10% floor
        expect(result).toBe(50);
      });
    });

    describe('Input Validation', () => {
      it('should throw error for zero base price', () => {
        const input: PricingInput = {
          basePrice: 0,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Base price must be greater than 0'
        );
      });

      it('should throw error for negative base price', () => {
        const input: PricingInput = {
          basePrice: -100,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Base price must be greater than 0'
        );
      });

      it('should throw error for demand factor out of range (> 1)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 1.5,
            timeFactor: 0,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Demand factor must be between 0 and 1'
        );
      });

      it('should throw error for demand factor out of range (< 0)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: -0.5,
            timeFactor: 0,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Demand factor must be between 0 and 1'
        );
      });

      it('should throw error for time factor out of range (> 1)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: 1.5,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Time factor must be between -1 and 1'
        );
      });

      it('should throw error for time factor out of range (< -1)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: -1.5,
            inventoryFactor: 0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Time factor must be between -1 and 1'
        );
      });

      it('should throw error for inventory factor out of range (> 1)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0,
            inventoryFactor: 1.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Inventory factor must be between 0 and 1'
        );
      });

      it('should throw error for inventory factor out of range (< 0)', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0,
            inventoryFactor: -0.5,
          },
          weights: defaultWeights,
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Inventory factor must be between 0 and 1'
        );
      });

      it('should throw error for negative weights', () => {
        const input: PricingInput = {
          basePrice,
          factors: {
            demandFactor: 0.5,
            timeFactor: 0,
            inventoryFactor: 0.5,
          },
          weights: {
            w1: -0.3,
            w2: 0.2,
            w3: 0.5,
          },
        };

        expect(() => calculateDynamicPrice(input)).toThrow(
          'Weights must be non-negative'
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small base price', () => {
        const input: PricingInput = {
          basePrice: 0.01,
          factors: {
            demandFactor: 1,
            timeFactor: 1,
            inventoryFactor: 1,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(0.02); // 0.01 * 2 = 0.02
      });

      it('should handle very large base price', () => {
        const input: PricingInput = {
          basePrice: 10000,
          factors: {
            demandFactor: 1,
            timeFactor: 1,
            inventoryFactor: 1,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        expect(result).toBe(20000);
      });

      it('should handle precision for fractional calculations', () => {
        const input: PricingInput = {
          basePrice: 99.99,
          factors: {
            demandFactor: 0.33,
            timeFactor: 0.67,
            inventoryFactor: 0.55,
          },
          weights: defaultWeights,
        };

        const result = calculateDynamicPrice(input);
        // 99.99 * (1 + 0.3*0.33 + 0.2*0.67 + 0.5*0.55)
        // = 99.99 * (1 + 0.099 + 0.134 + 0.275) = 99.99 * 1.508
        expect(result).toBeCloseTo(150.78, 2);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should calculate realistic price for popular event near date with limited seats', () => {
      const basePrice = 100;
      
      // Event metrics
      const bookingsInWindow = 80;
      const maxExpectedBookings = 100;
      const daysUntilEvent = 3;
      const totalDaysBeforeEvent = 30;
      const remainingCapacity = 20;
      const totalCapacity = 200;

      // Calculate factors
      const demandFactor = calculateDemandFactor(bookingsInWindow, maxExpectedBookings);
      const timeFactor = calculateTimeFactor(daysUntilEvent, totalDaysBeforeEvent);
      const inventoryFactor = calculateInventoryFactor(remainingCapacity, totalCapacity);

      // Calculate price
      const price = calculateDynamicPrice({
        basePrice,
        factors: {
          demandFactor,
          timeFactor,
          inventoryFactor,
        },
      });

      // Verify individual factors
      expect(demandFactor).toBe(0.8);
      expect(timeFactor).toBeCloseTo(0.8, 5);
      expect(inventoryFactor).toBe(0.9);

      // Price should be significantly higher
      expect(price).toBeGreaterThan(basePrice);
      expect(price).toBeCloseTo(185, 0);
    });

    it('should calculate realistic price for new event with plenty of inventory', () => {
      const basePrice = 100;
      
      // Event metrics
      const bookingsInWindow = 5;
      const maxExpectedBookings = 50;
      const daysUntilEvent = 60;
      const totalDaysBeforeEvent = 60;
      const remainingCapacity = 200;
      const totalCapacity = 200;

      // Calculate factors
      const demandFactor = calculateDemandFactor(bookingsInWindow, maxExpectedBookings);
      const timeFactor = calculateTimeFactor(daysUntilEvent, totalDaysBeforeEvent);
      const inventoryFactor = calculateInventoryFactor(remainingCapacity, totalCapacity);

      // Calculate price
      const price = calculateDynamicPrice({
        basePrice,
        factors: {
          demandFactor,
          timeFactor,
          inventoryFactor,
        },
      });

      // Verify individual factors
      expect(demandFactor).toBe(0.1);
      expect(timeFactor).toBe(-1);
      expect(inventoryFactor).toBe(0);

      // Price should be lower than base
      expect(price).toBeLessThan(basePrice);
      expect(price).toBeCloseTo(83, 0);
    });

    it('should calculate price for sold-out event (zero remaining capacity)', () => {
      const basePrice = 100;
      
      const demandFactor = 1;
      const timeFactor = 0.5;
      const inventoryFactor = calculateInventoryFactor(0, 200);

      const price = calculateDynamicPrice({
        basePrice,
        factors: {
          demandFactor,
          timeFactor,
          inventoryFactor,
        },
      });

      expect(inventoryFactor).toBe(1);
      expect(price).toBeCloseTo(190, 0);
    });
  });
});
