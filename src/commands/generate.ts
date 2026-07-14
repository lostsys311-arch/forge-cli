import { join } from "node:path";
import { Command } from "commander";
import inquirer from "inquirer";
import type { Logger } from "../core/logger.js";
import { writeTextFile } from "../utils/file-system.js";
import { Spinner } from "../utils/spinner.js";

interface GenerateOptions {
	type?: string;
	name?: string;
	dir?: string;
}

const generators: Record<
	string,
	(name: string, dir: string) => GeneratorFile[]
> = {
	component: (name, dir) => [
		{
			path: join(dir, `${name}.tsx`),
			content: `export interface ${name}Props {\n  children?: React.ReactNode;\n}\n\nexport function ${name}({ children }: ${name}Props) {\n  return (\n    <div>\n      {children}\n    </div>\n  );\n}\n`,
		},
		{
			path: join(dir, `${name}.test.tsx`),
			content: `import { describe, it, expect } from 'vitest';\nimport { render, screen } from '@testing-library/react';\nimport { ${name} } from './${name}';\n\ndescribe('${name}', () => {\n  it('renders', () => {\n    render(<${name} />);\n    expect(screen.getByRole('region')).toBeDefined();\n  });\n});\n`,
		},
	],
	hook: (name, dir) => [
		{
			path: join(dir, `use${name.replace(/^use/, "")}.ts`),
			content: `import { useState, useCallback } from 'react';\n\nexport function use${name.replace(/^use/, "")}() {\n  const [state, setState] = useState(null);\n\n  const update = useCallback((value: unknown) => {\n    setState(value);\n  }, []);\n\n  return { state, update };\n}\n`,
		},
	],
	api: (name, dir) => [
		{
			path: join(dir, `${name}.ts`),
			content: `import { Router } from 'express';\n\nconst router = Router();\n\nrouter.get('/', (req, res) => {\n  res.json({ message: '${name} endpoint' });\n});\n\nrouter.post('/', (req, res) => {\n  res.status(201).json(req.body);\n});\n\nexport default router;\n`,
		},
		{
			path: join(dir, `${name}.test.ts`),
			content: `import { describe, it, expect } from 'vitest';\nimport request from 'supertest';\nimport app from '../app';\n\ndescribe('${name} API', () => {\n  it('returns ok', async () => {\n    const res = await request(app).get('/${name.toLowerCase()}');\n    expect(res.status).toBe(200);\n  });\n});\n`,
		},
	],
	model: (name, dir) => [
		{
			path: join(dir, `${name}.ts`),
			content: `export interface ${name} {\n  id: string;\n  createdAt: Date;\n  updatedAt: Date;\n}\n\nexport type Create${name}Input = Omit<${name}, 'id' | 'createdAt' | 'updatedAt'>;\nexport type Update${name}Input = Partial<Create${name}Input>;\n`,
		},
	],
	util: (name, dir) => [
		{
			path: join(dir, `${name}.ts`),
			content: `export function ${name.charAt(0).toLowerCase() + name.slice(1)}<T>(input: T): T {\n  return input;\n}\n`,
		},
		{
			path: join(dir, `${name}.test.ts`),
			content: `import { describe, it, expect } from 'vitest';\nimport { ${name.charAt(0).toLowerCase() + name.slice(1)} } from './${name}';\n\ndescribe('${name.charAt(0).toLowerCase() + name.slice(1)}', () => {\n  it('works', () => {\n    expect(${name.charAt(0).toLowerCase() + name.slice(1)}('test')).toBe('test');\n  });\n});\n`,
		},
	],
};

interface GeneratorFile {
	path: string;
	content: string;
}

export function generateCommand(logger: Logger): Command {
	const cmd = new Command("generate")
		.alias("g")
		.description("Generate code from templates")
		.argument(
			"[type]",
			"type of code to generate (component, hook, api, model, util)",
		)
		.argument("[name]", "name of the generated code")
		.option("-d, --dir <path>", "output directory", ".")
		.action(
			async (
				type: string | undefined,
				name: string | undefined,
				options: GenerateOptions,
			) => {
				const genType = type ?? (await promptType());
				const genName = name ?? (await promptName(genType));
				const genDir = join(process.cwd(), options.dir ?? "");

				const generator = generators[genType];
				if (!generator) {
					logger.error(`Unknown generator type: ${genType}`);
					logger.info(`Available types: ${Object.keys(generators).join(", ")}`);
					process.exit(1);
				}

				const spinner = new Spinner();
				await spinner.start(`Generating ${genType}: ${genName}...`);

				try {
					const files = generator(genName, genDir);
					for (const file of files) {
						await writeTextFile(file.path, file.content);
					}
					spinner.succeed(`Created ${files.length} files`);

					for (const file of files) {
						logger.info(`  ${file.path}`);
					}
				} catch (err) {
					spinner.fail("Generation failed");
					throw err;
				}
			},
		);

	return cmd;
}

async function promptType(): Promise<string> {
	const { type } = await inquirer.prompt<{ type: string }>([
		{
			type: "list",
			name: "type",
			message: "What do you want to generate?",
			choices: [
				{ name: "React Component", value: "component" },
				{ name: "React Hook", value: "hook" },
				{ name: "API Route", value: "api" },
				{ name: "Data Model", value: "model" },
				{ name: "Utility Function", value: "util" },
			],
		},
	]);
	return type;
}

async function promptName(type: string): Promise<string> {
	const { name } = await inquirer.prompt<{ name: string }>([
		{
			type: "input",
			name: "name",
			message: `Name for the ${type}:`,
			validate: (input: string) => input.length > 0 || "Name is required",
		},
	]);
	return name;
}
