import { Command } from 'commander';
import type { Logger } from './core/logger.js';
import type { ForgeConfig } from './core/config.js';
import { PluginManager } from './core/plugin-manager.js';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { doctorCommand } from './commands/doctor.js';
import { aiCommand } from './commands/ai.js';
import { pluginCommand } from './commands/plugin.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function getPackageVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export class ForgeCLI {
  private program: Command;
  private logger: Logger;
  private config: ForgeConfig;
  private pluginManager: PluginManager;

  constructor(logger: Logger, config: ForgeConfig) {
    this.logger = logger;
    this.config = config;
    this.pluginManager = new PluginManager(logger);

    this.program = new Command()
      .name('forge')
      .version(getPackageVersion())
      .description('Universal project scaffolder & developer assistant')
      .option('-d, --debug', 'enable debug output')
      .option('--no-color', 'disable colored output')
      .hook('preAction', async () => {
        if (this.config.plugins.length > 0) {
          await this.pluginManager.loadFromConfig(this.config.plugins);
        }
      });

    this.registerCommands();
  }

  private registerCommands(): void {
    this.program.addCommand(initCommand(this.logger, this.config));
    this.program.addCommand(generateCommand(this.logger));
    this.program.addCommand(doctorCommand(this.logger));
    this.program.addCommand(aiCommand(this.logger, this.config));
    this.program.addCommand(pluginCommand(this.logger, this.pluginManager));
  }

  async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
