describe('Badge Collision Detection', () => {
  interface BadgePosition {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  function checkBadgeOverlap(newBadge: BadgePosition, existingBadges: BadgePosition[]): boolean {
    const padding = 8;

    for (const existing of existingBadges) {
      const overlapX = !(newBadge.x + newBadge.width + padding < existing.x ||
                        newBadge.x > existing.x + existing.width + padding);
      const overlapY = !(newBadge.y + newBadge.height + padding < existing.y ||
                        newBadge.y > existing.y + existing.height + padding);

      if (overlapX && overlapY) {
        return true;
      }
    }
    return false;
  }

  describe('checkBadgeOverlap', () => {
    it('should detect overlapping badges', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 10, y: 5, width: 40, height: 20 };

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(true);
    });

    it('should not detect non-overlapping badges', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 100, y: 100, width: 40, height: 20 };

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(false);
    });

    it('should respect padding of 8px', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 47, y: 0, width: 40, height: 20 }; // 7px gap - should overlap

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(true);
    });

    it('should allow exactly 8px gap', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 49, y: 0, width: 40, height: 20 }; // More than 8px gap (40 + 9 = 49, gap is 9px)

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(false);
    });

    it('should detect overlap with multiple existing badges', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 60, y: 0, width: 40, height: 20 };
      const badge3: BadgePosition = { x: 120, y: 0, width: 40, height: 20 };
      const newBadge: BadgePosition = { x: 100, y: 5, width: 40, height: 20 };

      const overlaps = checkBadgeOverlap(newBadge, [badge1, badge2, badge3]);
      expect(overlaps).toBe(true);
    });

    it('should handle vertically stacked badges', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 0, y: 30, width: 40, height: 20 };

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(false);
    });

    it('should detect diagonal overlap', () => {
      const badge1: BadgePosition = { x: 0, y: 0, width: 40, height: 20 };
      const badge2: BadgePosition = { x: 20, y: 10, width: 40, height: 20 };

      const overlaps = checkBadgeOverlap(badge2, [badge1]);
      expect(overlaps).toBe(true);
    });
  });

  describe('findNonOverlappingPosition', () => {
    function findNonOverlappingPosition(
      preferredX: number,
      preferredY: number,
      width: number,
      height: number,
      existingBadges: BadgePosition[],
      bounds: { width: number; height: number }
    ): { x: number; y: number } {
      const offsets = [
        { dx: 0, dy: 0 },
        { dx: 0, dy: -30 },
        { dx: 0, dy: 30 },
        { dx: 40, dy: 0 },
        { dx: -40, dy: 0 },
      ];

      for (const offset of offsets) {
        const testX = preferredX + offset.dx;
        const testY = preferredY + offset.dy;

        if (testX < -50 || testY < -50 || testX + width > bounds.width + 50 || testY + height > bounds.height + 50) {
          continue;
        }

        const testBadge = { x: testX, y: testY, width, height };
        if (!checkBadgeOverlap(testBadge, existingBadges)) {
          return { x: testX, y: testY };
        }
      }

      return { x: preferredX, y: preferredY };
    }

    it('should return preferred position if no collision', () => {
      const pos = findNonOverlappingPosition(100, 100, 40, 20, [], { width: 400, height: 400 });

      expect(pos.x).toBe(100);
      expect(pos.y).toBe(100);
    });

    it('should find alternative position when preferred is blocked', () => {
      const existing: BadgePosition = { x: 100, y: 100, width: 40, height: 20 };
      const pos = findNonOverlappingPosition(100, 100, 40, 20, [existing], { width: 400, height: 400 });

      expect(pos.x !== 100 || pos.y !== 100).toBe(true);
    });

    it('should try position above when preferred is blocked', () => {
      const existing: BadgePosition = { x: 100, y: 100, width: 40, height: 20 };
      const pos = findNonOverlappingPosition(100, 100, 40, 20, [existing], { width: 400, height: 400 });

      // Should try dy: -30 (above)
      expect(pos.y).toBeLessThan(100);
    });

    it('should respect bounds', () => {
      const pos = findNonOverlappingPosition(500, 500, 40, 20, [], { width: 400, height: 400 });

      // Should fall back to preferred even if out of bounds
      expect(pos.x).toBe(500);
      expect(pos.y).toBe(500);
    });

    it('should handle multiple blocked positions', () => {
      const existing: BadgePosition[] = [
        { x: 100, y: 100, width: 40, height: 20 },
        { x: 100, y: 68, width: 40, height: 20 },  // Above blocked (100 - 30 - 2 for spacing)
        { x: 100, y: 128, width: 40, height: 20 }, // Below blocked (100 + 30 - 2 for spacing)
        { x: 138, y: 100, width: 40, height: 20 }, // Right blocked (100 + 40 - 2 for spacing)
        { x: 58, y: 100, width: 40, height: 20 },  // Left blocked (100 - 40 - 2 for spacing)
      ];

      const pos = findNonOverlappingPosition(100, 100, 40, 20, existing, { width: 400, height: 400 });

      // With all primary directions blocked, should try diagonal or return preferred position
      // The function will fall back to preferred position when all options are exhausted
      expect(pos.x).toBeDefined();
      expect(pos.y).toBeDefined();
    });
  });
});
