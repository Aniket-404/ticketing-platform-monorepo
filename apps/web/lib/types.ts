// Type definitions for API responses

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  venue: string;
  totalTickets: number;
  availableTickets: number;
  bookedTickets: number;
  basePrice: string;
  currentPrice: string;
  priceFloor: string;
  priceCeiling: string;
  createdAt: string;
}

export interface EventDetail extends Event {
  pricingRules?: {
    timeBasedWeight: number;
    demandBasedWeight: number;
    inventoryBasedWeight: number;
  };
  priceBreakdown?: {
    basePrice: number;
    timeFactor: number;
    demandFactor: number;
    inventoryFactor: number;
    timeAdjustment: number;
    demandAdjustment: number;
    inventoryAdjustment: number;
    totalAdjustment: number;
    finalPrice: number;
  };
  isActive: boolean;
  updatedAt: string;
}

export interface Booking {
  id: string;
  eventId: string;
  userEmail: string;
  quantity: number;
  pricePaid: string;
  totalAmount: string;
  createdAt: string;
  event?: Event;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}
