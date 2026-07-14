import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Logger } from './logger.js';

export interface ForgePlugin {
  name: string;
  version: string;
  description?: string;
  hooks?: PluginHooks;
  commands?: PluginCommand[];
  initialize?(ctx: PluginContext): Promise<void>;
}

export interface PluginHooks {
  preInit?: (ctx: PluginContext, options: Record<string, unknown>) => Promise<void>;
  postInit?: (ctx: PluginContext, options: Record<string, unknown>) => Promise<void>;
  preGenerate?: (ctx: PluginContext, options: Record<string, unknown>) => Promise<void>;
  postGenerate?: (ctx: PluginContext, options: Record<string, unknown>) => Promise<void>;
}

export interface PluginCommand {
  name: string;
  description: string;
  run(args: string[], ctx: PluginContext): Promise<void>;
}

export interface PluginContext {
  logger: Logger;
  cwd: string;
  config: Record<string, unknown>;
}

interface LoadedPlugin {
  plugin: ForgePlugin;
  path: string;
}

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private logger: Logger;
  private cwd: string;

  constructor(logger: Logger, cwd: string = process.cwd()) {
    this.logger = logger;
    this.cwd = cwd;
  }

  async loadFromConfig(pluginNames: string[]): Promise<void> {
    for (const name of pluginNames) {
      await this.load(name);
    }
  }

  async load(name: string): Promise<ForgePlugin> {
    if (this.plugins.has(name)) {
      return this.plugins.get(name)!.plugin;
    }

    this.logger.debug(`Loading plugin: ${name}`);

    try {
      const pluginPath = this.resolvePluginPath(name);
      const mod = await import(pluginPath);
      const plugin = mod.default ?? mod.plugin ?? mod;

      if (!plugin.name || !plugin.version) {
        throw new Error(`Plugin ${name} must export name and version`);
      }

      this.plugins.set(plugin.name, { plugin, path: pluginPath });

      if (plugin.initialize) {
        await plugin.initialize({ logger: this.logger, cwd: this.cwd, config: {} });
      }

      this.logger.success(`Loaded plugin: ${plugin.name}@${plugin.version}`);
      return plugin as ForgePlugin;
    } catch (err) {
      this.logger.error(`Failed to load plugin "${name}"`, err);
      throw err;
    }
  }

  getCommands(): PluginCommand[] {
    const cmds: PluginCommand[] = [];
    for (const [, loaded] of this.plugins) {
      if (loaded.plugin.commands) {
        cmds.push(...loaded.plugin.commands);
      }
    }
    return cmds;
  }

  async runHooks(hook: keyof PluginHooks, options: Record<string, unknown>): Promise<void> {
    const ctx: PluginContext = { logger: this.logger, cwd: this.cwd, config: {} };
    for (const [, loaded] of this.plugins) {
      const hookFn = loaded.plugin.hooks?.[hook];
      if (hookFn) {
        await hookFn(ctx, options);
      }
    }
  }

  list(): ForgePlugin[] {
    return Array.from(this.plugins.values()).map(l => l.plugin);
  }

  unload(name: string): boolean {
    return this.plugins.delete(name);
  }

  private resolvePluginPath(name: string): string {
    if (name.startsWith('.') || name.startsWith('/')) {
      return join(this.cwd, name);
    }
    const req = createRequire(join(this.cwd, 'package.json'));
    return req.resolve(name);
  }
}
