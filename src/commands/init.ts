import { Command } from 'commander';
import inquirer from 'inquirer';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { Logger } from '../core/logger.js';
import type { ForgeConfig } from '../core/config.js';
import { TemplateEngine } from '../core/template-engine.js';
import { validatePackageName } from '../utils/validation.js';

interface InitOptions {
  template?: string;
  dir?: string;
  force?: boolean;
  registry?: string;
  branch?: string;
}

export function initCommand(logger: Logger, _config: ForgeConfig): Command {
  const cmd = new Command('init')
    .alias('new')
    .description('Scaffold a new project from a template')
    .argument('[directory]', 'project directory')
    .option('-t, --template <name>', 'template to use')
    .option('-f, --force', 'overwrite existing directory')
    .option('-r, --registry <url>', 'template registry')
    .option('-b, --branch <name>', 'template branch')
    .action(async (dir: string | undefined, options: InitOptions) => {
      const targetDir = dir ?? '.';
      const fullPath = join(process.cwd(), targetDir);

      if (existsSync(fullPath) && !options.force) {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${targetDir} already exists. Overwrite?`,
            default: false,
          },
        ]);
        if (!overwrite) {
          logger.error('Aborted');
          process.exit(1);
        }
      }

      const answers = await inquirer.prompt<{
        projectName: string;
        description: string;
        author: string;
      }>([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: targetDir !== '.' ? targetDir : 'my-project',
          validate: (input: string) => {
            const result = validatePackageName(input);
            if (!result.valid) return result.errors.join(', ');
            return true;
          },
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          default: 'A project scaffolded with Forge',
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author:',
          default: '',
        },
      ]);

      const engine = new TemplateEngine();

        const templateDir = options.template
          ? await resolveTemplate(options.template, options.registry, options.branch, logger)
          : await promptForTemplate(logger);

      const context = {
        projectName: answers.projectName,
        projectVersion: '1.0.0',
        description: answers.description,
        author: answers.author,
        year: new Date().getFullYear().toString(),
      };

      try {
        await engine.renderTemplate(templateDir, context, fullPath);
        logger.info('');
        logger.info('Next steps:');
        logger.info(`  cd ${targetDir}`);
        logger.info('  npm install');
        logger.info('  npm run dev');
      } catch (err) {
        logger.error('Failed to scaffold project');
        throw err;
      }
    });

  return cmd;
}

async function promptForTemplate(_logger: Logger): Promise<string> {
  const { template } = await inquirer.prompt<{ template: string }>([
    {
      type: 'list',
      name: 'template',
      message: 'Select a template:',
      choices: [
        { name: 'Next.js App (TypeScript)', value: 'next-app' },
        { name: 'Express API (TypeScript)', value: 'express-api' },
        { name: 'React Library (TypeScript)', value: 'react-lib' },
        { name: 'Node.js CLI', value: 'node-cli' },
        { name: 'Vite + React', value: 'vite-react' },
      ],
    },
  ]);
  return resolveBuiltInTemplate(template);
}

async function resolveTemplate(
  template: string,
  registry?: string,
  _branch?: string,
  _logger?: Logger,
): Promise<string> {
  const builtIn = resolveBuiltInTemplate(template);
  if (builtIn && builtIn.length > 0) return builtIn;

  _logger?.info(`Fetching template "${template}" from registry...`);
  const { downloadTemplate } = await import('giget');
  const source = registry ? `${registry}/${template}` : `github:forge-templates/${template}`;
  const result = await downloadTemplate(source, { provider: 'github', dir: '.' });
  return result.dir;
}

function resolveBuiltInTemplate(name: string): string {
  const __dirname = new URL('.', import.meta.url).pathname;
  const templatesDir = join(__dirname, '..', 'templates');
  const templatePath = join(templatesDir, name);
  return existsSync(templatePath) ? templatePath : '';
}
