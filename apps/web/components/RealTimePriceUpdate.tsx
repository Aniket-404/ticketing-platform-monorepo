'use client';

import { useEffect, useState } from 'react';

interface PriceUpdateProps {
  eventId: string;
  initialPrice: string;
}

export default function RealTimePriceUpdate({ eventId, initialPrice }: PriceUpdateProps) {
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [previousPrice, setPreviousPrice] = useState(initialPrice);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [priceChange, setPriceChange] = useState<'up' | 'down' | 'same'>('same');

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.currentPrice) {
            const newPrice = data.data.currentPrice;
            const prevPrice = currentPrice;
            
            setPreviousPrice(prevPrice);
            setCurrentPrice(newPrice);
            setLastUpdated(new Date());

            // Determine price change direction
            const newPriceFloat = parseFloat(newPrice);
            const prevPriceFloat = parseFloat(prevPrice);
            
            if (newPriceFloat > prevPriceFloat) {
              setPriceChange('up');
            } else if (newPriceFloat < prevPriceFloat) {
              setPriceChange('down');
            } else {
              setPriceChange('same');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching price update:', error);
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [eventId, currentPrice]);

  const priceChangeFloat = parseFloat(currentPrice) - parseFloat(previousPrice);
  const priceChangePercent = parseFloat(previousPrice) !== 0 
    ? ((priceChangeFloat / parseFloat(previousPrice)) * 100).toFixed(2) 
    : '0.00';

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-blue-400">
          ${parseFloat(currentPrice).toFixed(2)}
        </span>
        {priceChange !== 'same' && (
          <span className={`text-sm font-medium ${priceChange === 'up' ? 'text-red-400' : 'text-green-400'}`}>
            {priceChange === 'up' ? '↑' : '↓'} {Math.abs(priceChangeFloat).toFixed(2)} ({Math.abs(parseFloat(priceChangePercent))}%)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${priceChange === 'same' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
          <span className="text-xs text-slate-400">
            Live pricing • Updated {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)}s ago
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500">Price updates every 30 seconds</p>
    </div>
  );
}
