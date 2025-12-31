/**
 * Tests for LCG-based ID Generator
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  calculateSpaceSize,
  numberToBase36,
  lcgNth,
  generateProblemId,
  getIdCounterState,
  resetIdCounter
} from './id-generator';
import { getPrismaClient } from '../database/prisma-client';

describe('ID Generator - Pure Functions', () => {
  describe('calculateSpaceSize', () => {
    it('should calculate space size for 2-character IDs', () => {
      expect(calculateSpaceSize(2)).toBe(36 * 36); // 1296
    });

    it('should calculate space size for 3-character IDs', () => {
      expect(calculateSpaceSize(3)).toBe(36 * 36 * 36); // 46656
    });

    it('should calculate space size for 4-character IDs', () => {
      expect(calculateSpaceSize(4)).toBe(36 * 36 * 36 * 36); // 1679616
    });
  });

  describe('numberToBase36', () => {
    it('should convert 0 to "00" for length 2', () => {
      expect(numberToBase36(0, 2)).toBe('00');
    });

    it('should convert 10 to "0a" for length 2', () => {
      expect(numberToBase36(10, 2)).toBe('0a');
    });

    it('should convert 35 to "0z" for length 2', () => {
      expect(numberToBase36(35, 2)).toBe('0z');
    });

    it('should convert 36 to "10" for length 2', () => {
      expect(numberToBase36(36, 2)).toBe('10');
    });

    it('should convert 1295 to "zz" for length 2', () => {
      expect(numberToBase36(1295, 2)).toBe('zz');
    });

    it('should handle 3-character IDs', () => {
      expect(numberToBase36(0, 3)).toBe('000');
      expect(numberToBase36(1295, 3)).toBe('0zz');
      expect(numberToBase36(1296, 3)).toBe('100');
    });

    it('should only use lowercase letters and numbers', () => {
      for (let i = 0; i < 100; i++) {
        const id = numberToBase36(i, 2);
        expect(id).toMatch(/^[0-9a-z]+$/);
        expect(id).not.toMatch(/[A-Z]/);
      }
    });
  });

  describe('lcgNth', () => {
    it('should return different values for consecutive indices', () => {
      const spaceSize = 1296;
      const values = new Set<number>();
      
      for (let i = 0; i < 100; i++) {
        values.add(lcgNth(i, spaceSize));
      }
      
      // All 100 values should be unique
      expect(values.size).toBe(100);
    });

    it('should stay within bounds', () => {
      const spaceSize = 1296;
      
      for (let i = 0; i < 100; i++) {
        const value = lcgNth(i, spaceSize);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(spaceSize);
      }
    });

    it('should be deterministic', () => {
      const spaceSize = 1296;
      
      for (let i = 0; i < 50; i++) {
        const value1 = lcgNth(i, spaceSize);
        const value2 = lcgNth(i, spaceSize);
        expect(value1).toBe(value2);
      }
    });

    it('should produce non-sequential output', () => {
      const spaceSize = 1296;
      
      // Check that output is not sequential
      const v0 = lcgNth(0, spaceSize);
      const v1 = lcgNth(1, spaceSize);
      const v2 = lcgNth(2, spaceSize);
      
      // The differences should not all be 1
      const isSequential = (v1 - v0 === 1) && (v2 - v1 === 1);
      expect(isSequential).toBe(false);
    });

    it('should visit all values exactly once (full period test)', () => {
      // Test with a small space size
      const spaceSize = 36; // 1-character IDs
      const visited = new Set<number>();
      
      for (let i = 0; i < spaceSize; i++) {
        const value = lcgNth(i, spaceSize);
        expect(visited.has(value)).toBe(false);
        visited.add(value);
      }
      
      expect(visited.size).toBe(spaceSize);
    });

    it('should generate all 1296 unique 2-character IDs', () => {
      const spaceSize = calculateSpaceSize(2); // 36^2 = 1296
      const INITIAL_OFFSET = 648; // Middle of space
      const generatedIds = new Set<string>();
      
      // Generate all IDs in the order they would be produced
      for (let counter = 0; counter < spaceSize; counter++) {
        const lcgPosition = (counter + INITIAL_OFFSET) % spaceSize;
        const shuffledIndex = lcgNth(lcgPosition, spaceSize);
        const id = numberToBase36(shuffledIndex, 2);
        
        // Verify format
        expect(id).toHaveLength(2);
        expect(id).toMatch(/^[0-9a-z]{2}$/);
        
        // Verify uniqueness
        expect(generatedIds.has(id)).toBe(false);
        generatedIds.add(id);
      }
      
      // Verify we generated exactly 1296 unique IDs
      expect(generatedIds.size).toBe(1296);
      
      // Verify the full set includes some expected IDs
      expect(generatedIds.has('00')).toBe(true);
      expect(generatedIds.has('zz')).toBe(true);
      expect(generatedIds.has('a0')).toBe(true);
      expect(generatedIds.has('0a')).toBe(true);
    });
  });
});

describe('ID Generator - Database Integration', () => {
  beforeEach(async () => {
    // Reset counter before each test
    await resetIdCounter();
  });

  afterAll(async () => {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  });

  describe('generateProblemId', () => {
    it('should generate a 2-character ID', async () => {
      const id = await generateProblemId();
      
      expect(id).toHaveLength(2);
      expect(id).toMatch(/^[0-9a-z]{2}$/);
    });

    it('should generate different IDs on consecutive calls', async () => {
      const id1 = await generateProblemId();
      const id2 = await generateProblemId();
      const id3 = await generateProblemId();
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should increment the counter', async () => {
      const stateBefore = await getIdCounterState();
      expect(stateBefore.counter).toBe(0);
      
      await generateProblemId();
      
      const stateAfter = await getIdCounterState();
      expect(stateAfter.counter).toBe(1);
    });

    it('should be deterministic after reset', async () => {
      const firstRun: string[] = [];
      for (let i = 0; i < 5; i++) {
        firstRun.push(await generateProblemId());
      }
      
      await resetIdCounter();
      
      const secondRun: string[] = [];
      for (let i = 0; i < 5; i++) {
        secondRun.push(await generateProblemId());
      }
      
      expect(firstRun).toEqual(secondRun);
    });

    it('should expand to 3-character IDs when 2-character space is exhausted', async () => {
      const prisma = getPrismaClient();
      
      // Set counter to 1294 (2 IDs remaining in 2-char space: 1294 and 1295)
      await prisma.idCounter.upsert({
        where: { id: 'global' },
        update: { counter: 1294, length: 2 },
        create: { id: 'global', counter: 1294, length: 2 }
      });
      
      // Generate ID #1295 - should still be 2 characters
      const id1 = await generateProblemId();
      expect(id1).toHaveLength(2);
      expect(id1).toMatch(/^[0-9a-z]{2}$/);
      
      // Generate ID #1296 - should still be 2 characters (last one)
      const id2 = await generateProblemId();
      expect(id2).toHaveLength(2);
      expect(id2).toMatch(/^[0-9a-z]{2}$/);
      
      // Generate ID #1297 - should be 3 characters (expansion!)
      const id3 = await generateProblemId();
      expect(id3).toHaveLength(3);
      expect(id3).toMatch(/^[0-9a-z]{3}$/);
      
      // Verify counter state
      const state = await getIdCounterState();
      expect(state.length).toBe(3);
      expect(state.counter).toBe(1); // Reset to 1 after expansion
      expect(state.remaining).toBe(46655); // 46656 - 1
    });
  });

  describe('getIdCounterState', () => {
    it('should return initial state', async () => {
      const state = await getIdCounterState();
      
      expect(state.counter).toBe(0);
      expect(state.length).toBe(2);
      expect(state.remaining).toBe(1296);
    });

    it('should track remaining IDs', async () => {
      await generateProblemId();
      await generateProblemId();
      await generateProblemId();
      
      const state = await getIdCounterState();
      
      expect(state.counter).toBe(3);
      expect(state.remaining).toBe(1293);
    });
  });
});
