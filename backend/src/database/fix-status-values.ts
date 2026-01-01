/**
 * Fix Status Values Script
 * 
 * Updates all 'Not Started' status values to 'Actionable' in the database
 */

import { getPrismaClient } from './prisma-client';

async function fixStatusValues() {
  const prisma = getPrismaClient();

  try {
    console.log('Updating status values from "Not Started" to "Actionable"...');
    
    // Update all problems with 'Not Started' status to 'Actionable'
    const result = await prisma.$executeRawUnsafe(
      `UPDATE problems SET status = 'Actionable' WHERE status = 'Not Started'`
    );
    
    console.log(`Updated ${result} problem(s)`);
    console.log('Status values fixed successfully!');
  } catch (error) {
    console.error('Error fixing status values:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixStatusValues();

