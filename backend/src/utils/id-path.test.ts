/**
 * Tests for ID Path Computation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeIdPath, computeIdPathSync } from './id-path';
import { getPrismaClient } from '../database/prisma-client';

vi.mock('../database/prisma-client');

describe('ID Path Computation', () => {
  const mockPrisma = {
    problem: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma as any);
  });

  describe('computeIdPath', () => {
    it('should return id for root problems (no parent)', async () => {
      const idPath = await computeIdPath('a2', null, 'project-1');
      
      expect(idPath).toBe('a2');
      expect(mockPrisma.problem.findUnique).not.toHaveBeenCalled();
    });

    it('should compute idPath for child problems', async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        idPath: 'a2',
      });
      
      const idPath = await computeIdPath('df', 'a2', 'project-1');
      
      expect(idPath).toBe('a2-df');
      expect(mockPrisma.problem.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'a2',
          projectId: 'project-1',
        },
        select: {
          idPath: true,
        },
      });
    });

    it('should compute idPath for grandchild problems', async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        idPath: 'a2-df',
      });
      
      const idPath = await computeIdPath('7f', 'df', 'project-1');
      
      expect(idPath).toBe('a2-df-7f');
    });

    it('should compute idPath for deeper hierarchies', async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        idPath: 'a2-df-7f',
      });
      
      const idPath = await computeIdPath('x9', '7f', 'project-1');
      
      expect(idPath).toBe('a2-df-7f-x9');
    });

    it('should throw error if parent not found', async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);
      
      await expect(
        computeIdPath('df', 'nonexistent', 'project-1')
      ).rejects.toThrow('Parent problem with id "nonexistent" not found');
    });

    it('should ensure parent is in same project', async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);
      
      await expect(
        computeIdPath('df', 'a2', 'project-1')
      ).rejects.toThrow();
      
      expect(mockPrisma.problem.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'a2',
          projectId: 'project-1',
        },
        select: {
          idPath: true,
        },
      });
    });
  });

  describe('computeIdPathSync', () => {
    it('should return id for root problems (no parent)', () => {
      const idPath = computeIdPathSync('a2', null);
      
      expect(idPath).toBe('a2');
    });

    it('should compute idPath for child problems', () => {
      const idPath = computeIdPathSync('df', 'a2');
      
      expect(idPath).toBe('a2-df');
    });

    it('should compute idPath for grandchild problems', () => {
      const idPath = computeIdPathSync('7f', 'a2-df');
      
      expect(idPath).toBe('a2-df-7f');
    });

    it('should compute idPath for deeper hierarchies', () => {
      const idPath = computeIdPathSync('x9', 'a2-df-7f');
      
      expect(idPath).toBe('a2-df-7f-x9');
    });
  });
});

