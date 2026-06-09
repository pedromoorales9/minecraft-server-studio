import { describe, it, expect } from 'vitest';
import { recommendedJavaMajor } from '../../src/main/services/mojang/manifest';

describe('recommendedJavaMajor', () => {
  it('returns 8 for legacy releases', () => {
    expect(recommendedJavaMajor('1.8.9')).toBe(8);
    expect(recommendedJavaMajor('1.16.5')).toBe(8);
  });
  it('returns 16 for 1.17', () => {
    expect(recommendedJavaMajor('1.17.1')).toBe(16);
  });
  it('returns 17 for 1.18 and 1.19', () => {
    expect(recommendedJavaMajor('1.18.2')).toBe(17);
    expect(recommendedJavaMajor('1.19.4')).toBe(17);
  });
  it('returns 21 for modern releases', () => {
    expect(recommendedJavaMajor('1.21.1')).toBe(21);
    expect(recommendedJavaMajor('1.20.5')).toBe(21);
  });
});
