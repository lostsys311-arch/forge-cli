import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Handlebars from "handlebars";
import {
	type FileEntry,
	ensureDir,
	readFiles,
	writeFiles,
} from "../utils/file-system.js";
import { Spinner } from "../utils/spinner.js";

export interface TemplateContext {
	projectName: string;
	projectVersion: string;
	description: string;
	author: string;
	year: string;
	[key: string]: unknown;
}

export interface TemplateManifest {
	name: string;
	version: string;
	description: string;
	tags: string[];
	variables: TemplateVariable[];
	hooks?: {
		preInit?: string;
		postInit?: string;
	};
}

export interface TemplateVariable {
	name: string;
	type: "string" | "boolean" | "select";
	message: string;
	default?: string | boolean;
	choices?: string[];
	required?: boolean;
}

export class TemplateEngine {
	private helpers: Map<string, Handlebars.HelperDelegate> = new Map();

	constructor() {
		this.registerDefaultHelpers();
	}

	registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
		this.helpers.set(name, fn);
		Handlebars.registerHelper(name, fn);
	}

	async renderTemplate(
		templateDir: string,
		context: TemplateContext,
		outputDir: string,
	): Promise<string[]> {
		const spinner = new Spinner();
		await spinner.start("Rendering template files...");

		try {
			await this.loadManifest(templateDir);
			const files = await readFiles(["**/*"], templateDir);

			const rendered: FileEntry[] = [];

			for (const [filePath, content] of files) {
				if (filePath === "forge.json") continue;

				const template = Handlebars.compile(content, {
					strict: false,
					noEscape: true,
				});
				const result = template(context);
				const outputPath = Handlebars.compile(filePath, { strict: false })(
					context,
				);

				rendered.push({ path: outputPath, content: result });
			}

			await ensureDir(outputDir);
			const written = await writeFiles(rendered, outputDir);

			spinner.succeed(`Generated ${written.length} files`);
			return written;
		} catch (err) {
			spinner.fail("Template rendering failed");
			throw err;
		}
	}

	async loadManifest(templateDir: string): Promise<TemplateManifest | null> {
		try {
			const content = await readFile(join(templateDir, "forge.json"), "utf-8");
			return JSON.parse(content) as TemplateManifest;
		} catch {
			return null;
		}
	}

	private registerDefaultHelpers(): void {
		this.registerHelper("upper", (s: string) => s.toUpperCase());
		this.registerHelper("lower", (s: string) => s.toLowerCase());
		this.registerHelper(
			"capitalize",
			(s: string) => s.charAt(0).toUpperCase() + s.slice(1),
		);
		this.registerHelper("camelCase", (s: string) =>
			s
				.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
				.replace(/^[A-Z]/, (c) => c.toLowerCase()),
		);
		this.registerHelper("pascalCase", (s: string) =>
			s
				.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
				.replace(/^[a-z]/, (c) => c.toUpperCase()),
		);
		this.registerHelper("kebabCase", (s: string) =>
			s
				.replace(/([a-z])([A-Z])/g, "$1-$2")
				.replace(/[\s_]+/g, "-")
				.toLowerCase(),
		);
		this.registerHelper("snakeCase", (s: string) =>
			s
				.replace(/([a-z])([A-Z])/g, "$1_$2")
				.replace(/[\s-]+/g, "_")
				.toLowerCase(),
		);
		this.registerHelper("eq", (a: unknown, b: unknown) => a === b);
		this.registerHelper("ne", (a: unknown, b: unknown) => a !== b);
		this.registerHelper("and", (...args: unknown[]) =>
			args.slice(0, -1).every(Boolean),
		);
		this.registerHelper("or", (...args: unknown[]) =>
			args.slice(0, -1).some(Boolean),
		);
		this.registerHelper("not", (v: unknown) => !v);
		this.registerHelper(
			"includes",
			(arr: unknown[], val: unknown) => Array.isArray(arr) && arr.includes(val),
		);
	}
}
