import Conf from "conf";
import { LogLevel } from "./logger.js";

export interface ForgeConfig {
	logLevel: LogLevel;
	plugins: string[];
	ai: {
		provider: "openai" | "anthropic" | "none";
		apiKey?: string;
		model: string;
		maxTokens: number;
	};
	registry: {
		url: string;
		cacheTTL: number;
	};
	telemetry: boolean;
	templates: {
		defaultRegistry: string;
		cacheDir: string;
	};
}

const schema = {
	logLevel: { type: "number", default: LogLevel.Info },
	plugins: { type: "array", default: [] as string[] },
	ai: {
		type: "object",
		default: {
			provider: "none" as const,
			model: "gpt-4o",
			maxTokens: 4096,
		},
	},
	registry: {
		type: "object",
		default: {
			url: "https://registry.forge.dev",
			cacheTTL: 3600,
		},
	},
	telemetry: { type: "boolean", default: false },
	templates: {
		type: "object",
		default: {
			defaultRegistry: "npm",
			cacheDir: "~/.forge/cache",
		},
	},
} as const;

let _config: Conf<ForgeConfig> | null = null;

export async function loadConfig(): Promise<ForgeConfig> {
	if (_config) return _config.store;

	const store = new Conf<ForgeConfig>({
		projectName: "forge",
		schema,
		defaults: schema as unknown as ForgeConfig,
	});

	_config = store;
	return store.store;
}

export function updateConfig(updates: Partial<ForgeConfig>): void {
	if (!_config) throw new Error("Config not loaded");
	const store = _config as Conf<ForgeConfig>;
	for (const [key, value] of Object.entries(updates)) {
		store.set(
			key as keyof ForgeConfig,
			value as ForgeConfig[keyof ForgeConfig],
		);
	}
}

export function getConfigPath(): string {
	if (!_config) throw new Error("Config not loaded");
	return _config.path;
}
