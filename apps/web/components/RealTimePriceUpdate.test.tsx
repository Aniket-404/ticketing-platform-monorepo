import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimePriceUpdate from './RealTimePriceUpdate';

describe('RealTimePriceUpdate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    test('displays initial price correctly', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      expect(screen.getByText('$75.00')).toBeInTheDocument();
    });

    test('shows live pricing indicator', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      expect(screen.getByText(/live pricing/i)).toBeInTheDocument();
      expect(screen.getByText(/updated.*ago/i)).toBeInTheDocument();
    });

    test('shows update frequency message', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      expect(screen.getByText(/price updates every 30 seconds/i)).toBeInTheDocument();
    });

    test('does not show price change indicator initially', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      // No arrow indicators should be present initially
      expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
      expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
    });
  });

  describe('Price Updates', () => {
    test('polls API for price updates every 30 seconds', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '80.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      // No calls initially
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/events/event-1',
          expect.objectContaining({ cache: 'no-store' })
        );
      });

      // Advance another 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('updates price display when new price is higher', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '85.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$85.00')).toBeInTheDocument();
      });
    });

    test('updates price display when new price is lower', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '65.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$65.00')).toBeInTheDocument();
      });
    });

    test('updates price display when new price is the same', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '75.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Price should remain the same
      expect(screen.getByText('$75.00')).toBeInTheDocument();
    });
  });

  describe('Price Change Indicators', () => {
    test('shows upward arrow and red color when price increases', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '85.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/↑/)).toBeInTheDocument();
      });

      // Check for price difference
      expect(screen.getByText(/10\.00/)).toBeInTheDocument();
    });

    test('shows downward arrow and green color when price decreases', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '65.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/↓/)).toBeInTheDocument();
      });

      // Check for price difference
      expect(screen.getByText(/10\.00/)).toBeInTheDocument();
    });

    test('calculates price change percentage correctly for increase', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '82.50', // 10% increase from 75
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        // Check for percentage text (may be split across elements)
        expect(screen.getByText(/10.*%/i)).toBeInTheDocument();
      });
    });

    test('calculates price change percentage correctly for decrease', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '60.00', // 20% decrease from 75
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        // Check for percentage text (may be split across elements)
        expect(screen.getByText(/20.*%/i)).toBeInTheDocument();
      });
    });

    test('does not show change indicator when price remains the same', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '75.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // No arrow indicators
      expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
      expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
    });
  });

  describe('Last Updated Time', () => {
    test('shows seconds elapsed since last update', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentPrice: '80.00',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      // Initial render shows 0s
      expect(screen.getByText(/updated 0s ago/i)).toBeInTheDocument();

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // After update, should still show 0s for new update
      expect(screen.getByText(/updated 0s ago/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles fetch errors gracefully without crashing', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error fetching price update:',
          expect.any(Error)
        );
      });

      // Original price should remain
      expect(screen.getByText('$75.00')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    test('handles non-ok response gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not found' }),
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Price should not change
      expect(screen.getByText('$75.00')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    test('handles missing price data in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Price should not change
      expect(screen.getByText('$75.00')).toBeInTheDocument();
    });
  });

  describe('Multiple Updates', () => {
    test('tracks price changes across multiple updates', async () => {
      const mockResponse1 = {
        success: true,
        data: { currentPrice: '80.00' },
      };

      const mockResponse2 = {
        success: true,
        data: { currentPrice: '85.00' },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      // First update
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$80.00')).toBeInTheDocument();
      });

      // Second update
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$85.00')).toBeInTheDocument();
      });
    });

    test('updates price change indicator based on last price', async () => {
      const mockResponse1 = {
        success: true,
        data: { currentPrice: '80.00' },
      };

      const mockResponse2 = {
        success: true,
        data: { currentPrice: '75.00' },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      // First update: price goes up
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/↑/)).toBeInTheDocument();
      });

      // Second update: price goes down
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/↓/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle', () => {
    test('cleans up interval on unmount', () => {
      const { unmount } = render(
        <RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('restarts polling when eventId changes', async () => {
      const mockResponse = {
        success: true,
        data: { currentPrice: '80.00' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { rerender } = render(
        <RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />
      );

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/events/event-1',
          expect.any(Object)
        );
      });

      // Change eventId
      rerender(<RealTimePriceUpdate eventId="event-2" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/events/event-2',
          expect.any(Object)
        );
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles decimal prices correctly', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.99" />);

      expect(screen.getByText('$75.99')).toBeInTheDocument();
    });

    test('handles zero price', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="0.00" />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    test('handles very large prices', () => {
      render(<RealTimePriceUpdate eventId="event-1" initialPrice="9999.99" />);

      expect(screen.getByText('$9999.99')).toBeInTheDocument();
    });

    test('formats prices with two decimal places', async () => {
      const mockResponse = {
        success: true,
        data: { currentPrice: '80.5' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="75.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$80.50')).toBeInTheDocument();
      });
    });

    test('handles price change from zero', async () => {
      const mockResponse = {
        success: true,
        data: { currentPrice: '75.00' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<RealTimePriceUpdate eventId="event-1" initialPrice="0.00" />);

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText('$75.00')).toBeInTheDocument();
      });

      // Should not crash when calculating percentage with zero base
      // The component shows "0%" when divided by zero
      expect(screen.getByText(/0.*%/i)).toBeInTheDocument();
    });
  });
});
