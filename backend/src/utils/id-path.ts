/**
 * ID Path Computation
 * 
 * Computes the full hierarchical path (idPath) for a problem.
 * The idPath shows the full path from root to the problem, joined by dashes.
 * 
 * Examples:
 * - Root problem: id="a2", idPath="a2"
 * - Child: id="df", parent idPath="a2", so idPath="a2-df"
 * - Grandchild: id="7f", parent idPath="a2-df", so idPath="a2-df-7f"
 */

import { getPrismaClient } from '../database/prisma-client';

/**
 * Compute idPath for a new problem
 * 
 * @param id - The problem's unique ID
 * @param parentId - The parent problem's ID (null for root problems)
 * @param workspaceId - The workspace ID (for querying parent)
 * @returns The full hierarchical path
 */
export async function computeIdPath(
  id: string,
  parentId: string | null,
  workspaceId: string
): Promise<string> {
  // Root problems: idPath = id
  if (!parentId) {
    return id;
  }
  
  // Child problems: idPath = parent's idPath + "-" + this id
  const prisma = getPrismaClient();
  
  const parent = await prisma.problem.findUnique({
    where: {
      id: parentId,
      workspaceId, // Ensure parent is in same workspace
    },
    select: {
      idPath: true,
    },
  });
  
  if (!parent) {
    throw new Error(`Parent problem with id "${parentId}" not found in workspace "${workspaceId}"`);
  }
  
  return `${parent.idPath}-${id}`;
}

/**
 * Compute idPath synchronously when parent's idPath is already known
 * 
 * This is useful when creating multiple problems in a transaction
 * where you already have the parent's idPath.
 * 
 * @param id - The problem's unique ID
 * @param parentIdPath - The parent's idPath (null for root problems)
 * @returns The full hierarchical path
 */
export function computeIdPathSync(
  id: string,
  parentIdPath: string | null
): string {
  // Root problems: idPath = id
  if (!parentIdPath) {
    return id;
  }
  
  // Child problems: idPath = parent's idPath + "-" + this id
  return `${parentIdPath}-${id}`;
}

