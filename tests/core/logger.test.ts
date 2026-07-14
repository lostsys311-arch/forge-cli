import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, LogLevel } from '../../src/core/logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = new Logger(LogLevel.Debug);
  });

  it('logs debug messages when level is Debug', () => {
    logger.debug('test');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('suppresses debug messages when level is Info', () => {
    logger.setLevel(LogLevel.Info);
    logger.debug('test');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs info messages', () => {
    logger.info('hello');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs error messages', () => {
    logger.error('something broke');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('suppresses everything at Silent level', () => {
    logger.setLevel(LogLevel.Silent);
    logger.info('test');
    logger.warn('test');
    logger.error('test');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs success as info level', () => {
    logger.success('done');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
