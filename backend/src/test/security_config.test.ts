import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Configuration Security', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('ONEC_PASSWORD', '');
  });

  it('should not have hardcoded GROQ_API_KEY', async () => {
    const { config } = await import('../config');
    expect(config.groqApiKey).toBe('');
    expect(config.groqApiKey).not.toBe('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');
  });

  it('should not have hardcoded JWT_SECRET', async () => {
    const { config } = await import('../config');
    expect(config.jwtSecret).toBe('');
    expect(config.jwtSecret).not.toBe('dev_secret_change_me');
  });

  it('should not have hardcoded ONEC_PASSWORD', async () => {
    const { config } = await import('../config');
    expect(config.oneCPassword).toBe('');
    expect(config.oneCPassword).not.toBe('6653');
  });
});
