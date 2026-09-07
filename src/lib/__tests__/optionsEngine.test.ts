/**
 * Tests for Options Engine - Black-Scholes, Greeks, Max Pain
 */

import { describe, it, expect } from 'vitest';
import {
  blackScholes,
  calculateGreeks,
  calculateImpliedVolatility,
  calculateMaxPain,
  analyzeOption,
  createStraddle,
  createStrangle,
  createBullCallSpread,
  createProtectivePut,
  OptionsEngine,
  type OptionContract,
} from '../engines/optionsEngine';

describe('Options Engine', () => {
  describe('Black-Scholes Pricing', () => {
    it('should calculate call option price correctly', () => {
      const price = blackScholes(100, 100, 1, 0.05, 0.2, 'call');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(20); // Reasonable range
    });

    it('should calculate put option price correctly', () => {
      const price = blackScholes(100, 100, 1, 0.05, 0.2, 'put');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(20);
    });

    it('should handle at-expiration options', () => {
      const callPrice = blackScholes(110, 100, 0, 0.05, 0.2, 'call');
      const putPrice = blackScholes(90, 100, 0, 0.05, 0.2, 'put');
      
      expect(callPrice).toBe(10); // Intrinsic value
      expect(putPrice).toBe(10); // Intrinsic value
    });

    it('ITM call should be more expensive than OTM call', () => {
      const itmCall = blackScholes(110, 100, 1, 0.05, 0.2, 'call');
      const otmCall = blackScholes(90, 100, 1, 0.05, 0.2, 'call');
      
      expect(itmCall).toBeGreaterThan(otmCall);
    });
  });

  describe('Greeks Calculation', () => {
    it('should calculate all Greeks for a call option', () => {
      const greeks = calculateGreeks(100, 100, 1, 0.05, 0.2, 'call');
      
      expect(greeks.delta).toBeGreaterThan(0);
      expect(greeks.delta).toBeLessThan(1);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.theta).toBeLessThan(0); // Time decay is negative
      expect(greeks.vega).toBeGreaterThan(0);
    });

    it('should calculate all Greeks for a put option', () => {
      const greeks = calculateGreeks(100, 100, 1, 0.05, 0.2, 'put');
      
      expect(greeks.delta).toBeLessThan(0);
      expect(greeks.delta).toBeGreaterThan(-1);
      expect(greeks.gamma).toBeGreaterThan(0);
    });

    it('deep ITM call should have delta close to 1', () => {
      const greeks = calculateGreeks(150, 100, 1, 0.05, 0.2, 'call');
      expect(greeks.delta).toBeGreaterThan(0.8);
    });

    it('deep OTM call should have delta close to 0', () => {
      const greeks = calculateGreeks(50, 100, 1, 0.05, 0.2, 'call');
      expect(greeks.delta).toBeLessThan(0.3);
    });
  });

  describe('Implied Volatility', () => {
    it('should calculate IV from market price', () => {
      const result = calculateImpliedVolatility(10, 100, 100, 1, 0.05, 'call');
      
      expect(result.iv).toBeGreaterThan(0);
      expect(result.iv).toBeLessThan(2); // Reasonable range
    });

    it('should converge for reasonable prices', () => {
      const theoreticalPrice = blackScholes(100, 100, 1, 0.05, 0.3, 'call');
      const result = calculateImpliedVolatility(theoreticalPrice, 100, 100, 1, 0.05, 'call');
      
      expect(result.converged).toBe(true);
      expect(Math.abs(result.iv - 0.3)).toBeLessThan(0.05);
    });
  });

  describe('Max Pain Calculation', () => {
    it('should calculate max pain price', () => {
      const contracts: OptionContract[] = [
        {
          symbol: 'OPT1',
          underlyingSymbol: 'STOCK',
          strike: 90,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          optionType: 'call',
          marketPrice: 15,
          underlyingPrice: 100,
          volume: 1000,
          openInterest: 5000,
        },
        {
          symbol: 'OPT2',
          underlyingSymbol: 'STOCK',
          strike: 100,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          optionType: 'call',
          marketPrice: 8,
          underlyingPrice: 100,
          volume: 2000,
          openInterest: 10000,
        },
        {
          symbol: 'OPT3',
          underlyingSymbol: 'STOCK',
          strike: 110,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          optionType: 'put',
          marketPrice: 12,
          underlyingPrice: 100,
          volume: 1500,
          openInterest: 8000,
        },
      ];

      const result = calculateMaxPain(contracts, 100);
      
      expect(result.maxPainPrice).toBeDefined();
      expect(result.painByStrike.length).toBeGreaterThan(0);
      expect(result.totalCallValue).toBeGreaterThanOrEqual(0);
      expect(result.totalPutValue).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty contracts list', () => {
      const result = calculateMaxPain([], 100);
      
      expect(result.maxPainPrice).toBe(100);
      expect(result.painByStrike.length).toBe(0);
    });
  });

  describe('Option Analysis', () => {
    it('should analyze a call option', () => {
      const contract: OptionContract = {
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      };

      const analysis = analyzeOption(contract);
      
      expect(analysis.greeks).toBeDefined();
      expect(analysis.impliedVolatility).toBeDefined();
      expect(analysis.fairValue).toBeDefined();
      expect(analysis.recommendation).toBeTruthy();
    });
  });

  describe('Strategy Builders', () => {
    it('should create a straddle strategy', () => {
      const strategy = createStraddle(100, 5, 5);
      
      expect(strategy.name).toContain('Straddle');
      expect(strategy.legs.length).toBe(2);
      expect(strategy.maxLoss).toBe(10);
      expect(strategy.breakEvenPoints.length).toBe(2);
    });

    it('should create a strangle strategy', () => {
      const strategy = createStrangle(110, 90, 3, 3);
      
      expect(strategy.name).toContain('Strangle');
      expect(strategy.legs.length).toBe(2);
      expect(strategy.maxLoss).toBe(6);
    });

    it('should create a bull call spread', () => {
      const strategy = createBullCallSpread(100, 110, 8, 3);
      
      expect(strategy.name).toContain('Bull Call');
      expect(strategy.bullish).toBe(true);
      expect(strategy.maxLoss).toBe(5);
      expect(strategy.maxProfit).toBe(5); // (110-100) - 5
    });

    it('should create a protective put', () => {
      const strategy = createProtectivePut(100, 95, 3);
      
      expect(strategy.name).toContain('Protective Put');
      expect(strategy.bullish).toBe(true);
      expect(strategy.maxLoss).toBeGreaterThan(0);
    });
  });

  describe('OptionsEngine Class', () => {
    const engine = new OptionsEngine(0.25);

    it('should price an option', () => {
      const contract: OptionContract = {
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      };

      const price = engine.price(contract);
      expect(price).toBeGreaterThan(0);
    });

    it('should get Greeks', () => {
      const contract: OptionContract = {
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      };

      const greeks = engine.getGreeks(contract);
      expect(greeks.delta).toBeDefined();
    });

    it('should get implied volatility', () => {
      const contract: OptionContract = {
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      };

      const iv = engine.getImpliedVolatility(contract);
      expect(iv.iv).toBeDefined();
    });

    it('should find max pain', () => {
      const contracts: OptionContract[] = [{
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      }];

      const result = engine.findMaxPain(contracts, 100);
      expect(result.maxPainPrice).toBeDefined();
    });

    it('should analyze an option', () => {
      const contract: OptionContract = {
        symbol: 'TEST',
        underlyingSymbol: 'STOCK',
        strike: 100,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optionType: 'call',
        marketPrice: 8,
        underlyingPrice: 100,
        volume: 1000,
        openInterest: 5000,
      };

      const analysis = engine.analyze(contract);
      expect(analysis.greeks).toBeDefined();
      expect(analysis.recommendation).toBeTruthy();
    });

    it('should create strategies', () => {
      const straddle = engine.createStrategy('straddle', {
        strike: 100,
        callPremium: 5,
        putPremium: 5,
      });
      
      expect(straddle).not.toBeNull();
      expect(straddle!.name).toContain('Straddle');
    });
  });
});
