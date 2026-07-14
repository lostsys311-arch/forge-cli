import { describe, it, expect } from 'vitest';
import { validatePackageName, validateVersion, validateApiKey } from '../../src/utils/validation.js';

describe('validatePackageName', () => {
  it('accepts valid package names', () => {
    expect(validatePackageName('my-package').valid).toBe(true);
    expect(validatePackageName('@scope/pkg').valid).toBe(true);
    expect(validatePackageName('lodash').valid).toBe(true);
  });

  it('rejects invalid package names', () => {
    expect(validatePackageName(' leading-space').valid).toBe(false);
    expect(validatePackageName('UPPERCASE').valid).toBe(false);
    expect(validatePackageName('').valid).toBe(false);
  });
});

describe('validateVersion', () => {
  it('accepts valid semver', () => {
    expect(validateVersion('1.0.0')).toBe(true);
    expect(validateVersion('0.0.1')).toBe(true);
    expect(validateVersion('2.0.0-beta.1')).toBe(true);
  });

  it('rejects invalid versions', () => {
    expect(validateVersion('latest')).toBe(false);
    expect(validateVersion('1.0')).toBe(false);
    expect(validateVersion('')).toBe(false);
  });
});

describe('validateApiKey', () => {
  it('accepts OpenAI-style keys', () => {
    expect(validateApiKey('sk-proj-abc123')).toBe(true);
  });

  it('rejects empty keys', () => {
    expect(validateApiKey('')).toBe(false);
  });
});
