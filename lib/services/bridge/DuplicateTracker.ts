/**
 * DuplicateTracker
 * Prevents replay attacks by tracking processed transaction hashes
 * Uses in-memory storage with singleton pattern for persistence across requests
 */

export class DuplicateTracker {
  private processedHashes: Set<string> = new Set();
  private static instance: DuplicateTracker | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   * Ensures same Set is used across all requests within the process lifecycle
   */
  static getInstance(): DuplicateTracker {
    if (!DuplicateTracker.instance) {
      DuplicateTracker.instance = new DuplicateTracker();
    }
    return DuplicateTracker.instance;
  }

  /**
   * Check if a transaction hash has already been processed
   */
  isProcessed(txHash: string): boolean {
    return this.processedHashes.has(txHash);
  }

  /**
   * Mark a transaction hash as processed
   */
  markProcessed(txHash: string): void {
    this.processedHashes.add(txHash);
    console.log(`[DuplicateTracker] Marked as processed: ${txHash.slice(0, 20)}...`);
  }

  /**
   * Get total count of processed transactions
   */
  getProcessedCount(): number {
    return this.processedHashes.size;
  }

  /**
   * Check and mark in one atomic operation
   * Returns true if already processed (duplicate), false if new
   */
  checkAndMark(txHash: string): boolean {
    if (this.isProcessed(txHash)) {
      console.log(`[DuplicateTracker] Duplicate detected: ${txHash.slice(0, 20)}...`);
      return true;
    }
    this.markProcessed(txHash);
    return false;
  }
}
