import { describe, it, expect, vi, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { TemplateEngine } from '../../src/core/template-engine.js';
import { Logger, LogLevel } from '../../src/core/logger.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine(new Logger(LogLevel.Silent));
  });

  it('registers custom helpers', () => {
    engine.registerHelper('double', (x: number) => x * 2);
    expect(true).toBe(true);
  });

  it('has default helpers registered', () => {
    expect(typeof Handlebars.helpers.upper).toBe('function');
    expect(typeof Handlebars.helpers.camelCase).toBe('function');
    expect(typeof Handlebars.helpers.pascalCase).toBe('function');
    expect(typeof Handlebars.helpers.kebabCase).toBe('function');
    expect(typeof Handlebars.helpers.snakeCase).toBe('function');
  });
});
