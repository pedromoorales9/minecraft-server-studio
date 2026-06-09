import { describe, it, expect } from 'vitest';
import {
  supportsMods,
  supportsPlugins,
  isHybrid,
  LOADERS,
  LOADER_LABEL,
} from '../../src/shared/types/loader';

describe('loader registry', () => {
  it('has a label for every loader', () => {
    for (const l of LOADERS) {
      expect(LOADER_LABEL[l]).toBeTruthy();
    }
  });

  it('classifies plugin loaders', () => {
    expect(supportsPlugins('paper')).toBe(true);
    expect(supportsPlugins('fabric')).toBe(false);
  });

  it('classifies mod loaders', () => {
    expect(supportsMods('fabric')).toBe(true);
    expect(supportsMods('paper')).toBe(false);
  });

  it('marks hybrid loaders as supporting both', () => {
    for (const l of ['mohist', 'arclight', 'magma'] as const) {
      expect(isHybrid(l)).toBe(true);
      expect(supportsPlugins(l)).toBe(true);
      expect(supportsMods(l)).toBe(true);
    }
  });
});
