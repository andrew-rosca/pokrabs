/**
 * ID Generator for POKRABS Entities
 * 
 * Uses a Linear Congruential Generator (LCG) to traverse the ID space
 * in a pseudo-random but deterministic order.
 * 
 * Used for generating unique IDs for problems, workspaces, and views.
 * 
 * Benefits:
 * - O(1) generation: No database lookup needed for uniqueness
 * - Full coverage: Every ID is generated exactly once
 * - Known exhaustion: We know exactly when to expand to longer IDs
 * - Appears random: IDs jump around the space unpredictably
 * - Globally unique: Counter-based, shared across all entity types
 */

import { getPrismaClient, TransactionClient } from '../database/prisma-client';

const BASE = 36; // a-z + 0-9
const INITIAL_LENGTH = 2;
const MAX_LENGTH = 4;

// Start counter in the middle of the space for less predictable first IDs
const INITIAL_COUNTER_OFFSET = Math.floor(Math.pow(BASE, INITIAL_LENGTH) / 2) + 5; // 648 for 2-char

/**
 * LCG Parameters
 * 
 * For full period (visits all values exactly once), we need:
 * - c coprime to m (space_size)
 * - a - 1 divisible by all prime factors of m
 * - If m divisible by 4, then a - 1 divisible by 4
 * 
 * For base36: m = 36^length = (2^2 * 3^2)^length
 * Prime factors: 2 and 3
 * 
 * We use a = 37 (36 + 1, which is prime) and c = 5 (coprime with 36)
 * These satisfy the full period requirements for any 36^n space.
 */
const LCG_MULTIPLIER = 37;
const LCG_INCREMENT = 5;

/**
 * Calculate the space size for a given ID length
 */
export function calculateSpaceSize(length: number): number {
  return Math.pow(BASE, length);
}

/**
 * Convert a number to a base36 string of specified length
 */
export function numberToBase36(num: number, length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result = chars[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  
  return result;
}

/**
 * Apply the LCG formula to get the shuffled index
 * 
 * @param counter - The sequential counter value
 * @param spaceSize - The size of the ID space (36^length)
 * @returns A pseudo-random index in [0, spaceSize)
 */
export function lcgShuffle(counter: number, spaceSize: number): number {
  // LCG formula: (counter * a + c) mod m
  // We apply it iteratively from seed 0 to get the nth value
  let value = 0;
  for (let i = 0; i <= counter; i++) {
    value = (value * LCG_MULTIPLIER + LCG_INCREMENT) % spaceSize;
  }
  return value;
}

/**
 * Optimized LCG that directly computes the nth value
 * 
 * Uses the formula: X_n = (a^n * X_0 + c * (a^n - 1) / (a - 1)) mod m
 * Since X_0 = 0, this simplifies to: X_n = c * (a^n - 1) / (a - 1) mod m
 */
export function lcgNth(n: number, spaceSize: number): number {
  // For small n, iterate directly (faster than modular arithmetic)
  if (n < 1000) {
    let value = 0;
    for (let i = 0; i < n; i++) {
      value = (value * LCG_MULTIPLIER + LCG_INCREMENT) % spaceSize;
    }
    return value;
  }
  
  // For large n, use modular exponentiation
  // X_n = (a^n * X_0 + c * (a^n - 1) / (a - 1)) mod m
  // Since X_0 = 0: X_n = c * (a^n - 1) / (a - 1) mod m
  const aPowN = modPow(LCG_MULTIPLIER, n, spaceSize);
  const numerator = (BigInt(LCG_INCREMENT) * (BigInt(aPowN) - 1n)) % BigInt(spaceSize);
  const denominator = BigInt(LCG_MULTIPLIER - 1);
  
  // Modular division: multiply by modular inverse
  const denominatorInverse = modInverse(Number(denominator), spaceSize);
  if (denominatorInverse === null) {
    // Fallback to iteration if no inverse exists
    let value = 0;
    for (let i = 0; i < n; i++) {
      value = (value * LCG_MULTIPLIER + LCG_INCREMENT) % spaceSize;
    }
    return value;
  }
  
  return Number((numerator * BigInt(denominatorInverse)) % BigInt(spaceSize));
}

/**
 * Modular exponentiation: (base^exp) mod mod
 */
function modPow(base: number, exp: number, mod: number): number {
  let result = 1n;
  let b = BigInt(base) % BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  
  while (e > 0n) {
    if (e % 2n === 1n) {
      result = (result * b) % m;
    }
    e = e / 2n;
    b = (b * b) % m;
  }
  
  return Number(result);
}

/**
 * Extended Euclidean Algorithm to find modular inverse
 */
function modInverse(a: number, m: number): number | null {
  let [oldR, r] = [a, m];
  let [oldS, s] = [1, 0];
  
  while (r !== 0) {
    const quotient = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  
  if (oldR !== 1) {
    return null; // No inverse exists
  }
  
  return ((oldS % m) + m) % m;
}

/**
 * Generate the next unique ID
 * 
 * This atomically increments the global counter and returns the corresponding ID.
 * When the current ID length is exhausted, it automatically expands to the next length.
 * 
 * Used for problems, workspaces, and views. All IDs are globally unique regardless of entity type.
 * 
 * @returns A globally unique ID string (2+ chars, e.g., "a2", "df", "7f1")
 */
export async function generateId(): Promise<string> {
  const prisma = getPrismaClient();
  
  // Use a transaction to atomically read, compute, and update
  const result = await prisma.$transaction(async (tx: TransactionClient) => {
    // Get or create the counter
    let counter = await tx.idCounter.findUnique({
      where: { id: 'global' }
    });
    
    if (!counter) {
      counter = await tx.idCounter.create({
        data: { id: 'global', counter: 0, length: INITIAL_LENGTH }
      });
    }
    
    const currentCounter = counter.counter;
    let currentLength = counter.length;
    const spaceSize = calculateSpaceSize(currentLength);
    
    // Check if we need to expand to next length
    if (currentCounter >= spaceSize) {
      currentLength++;
      if (currentLength > MAX_LENGTH) {
        throw new Error(
          `ID space exhausted: All ${MAX_LENGTH}-character IDs have been used. ` +
          `Total IDs generated: ${currentCounter}`
        );
      }
      
      // Reset counter for new length
      await tx.idCounter.update({
        where: { id: 'global' },
        data: { counter: 1, length: currentLength }
      });
      
      // Generate ID in new space
      const newSpaceSize = calculateSpaceSize(currentLength);
      const shuffledIndex = lcgNth(0, newSpaceSize);
      return numberToBase36(shuffledIndex, currentLength);
    }
    
    // Apply offset for initial length to start in middle of space
    const offset = currentLength === INITIAL_LENGTH ? INITIAL_COUNTER_OFFSET : 0;
    const lcgPosition = (currentCounter + offset) % spaceSize;
    
    // Generate ID using LCG
    const shuffledIndex = lcgNth(lcgPosition, spaceSize);
    const id = numberToBase36(shuffledIndex, currentLength);
    
    // Increment counter
    await tx.idCounter.update({
      where: { id: 'global' },
      data: { counter: currentCounter + 1 }
    });
    
    return id;
  });
  
  return result;
}

/**
 * Get the current state of the ID counter (for debugging/monitoring)
 */
export async function getIdCounterState(): Promise<{ counter: number; length: number; remaining: number }> {
  const prisma = getPrismaClient();
  
  const counter = await prisma.idCounter.findUnique({
    where: { id: 'global' }
  });
  
  if (!counter) {
    const spaceSize = calculateSpaceSize(INITIAL_LENGTH);
    return { counter: 0, length: INITIAL_LENGTH, remaining: spaceSize };
  }
  
  const spaceSize = calculateSpaceSize(counter.length);
  return {
    counter: counter.counter,
    length: counter.length,
    remaining: spaceSize - counter.counter
  };
}

/**
 * Reset the ID counter (for testing purposes only)
 */
export async function resetIdCounter(): Promise<void> {
  const prisma = getPrismaClient();
  
  await prisma.idCounter.upsert({
    where: { id: 'global' },
    update: { counter: 0, length: INITIAL_LENGTH },
    create: { id: 'global', counter: 0, length: INITIAL_LENGTH }
  });
}
