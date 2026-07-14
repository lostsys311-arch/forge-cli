#!/usr/bin/env node
import { ForgeCLI } from './cli.js';
import { Logger } from './core/logger.js';
import { loadConfig } from './core/config.js';

async function main() {
  const config = await loadConfig();
  const logger = new Logger(config.logLevel);

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason as Error);
    process.exit(1);
  });

  const cli = new ForgeCLI(logger, config);
  await cli.run(process.argv);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
