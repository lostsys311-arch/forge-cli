import { Command } from "commander";
import inquirer from "inquirer";
import picocolors from "picocolors";
import { type AIMessage, createAIProvider } from "../ai/provider.js";
import type { ForgeConfig } from "../core/config.js";
import type { Logger } from "../core/logger.js";

interface AIOptions {
	prompt?: string;
	model?: string;
	provider?: string;
	stream?: boolean;
}

export function aiCommand(logger: Logger, _config: ForgeConfig): Command {
	const cmd = new Command("ai")
		.alias("ask")
		.description("Ask AI to help with your code")
		.argument("[prompt]", "what do you want to do?")
		.option("-m, --model <name>", "AI model to use")
		.option("-p, --provider <name>", "AI provider (openai, anthropic)")
		.option("--no-stream", "disable streaming output")
		.action(async (prompt: string | undefined, options: AIOptions) => {
			const providerType = (options.provider ?? _config.ai.provider) as
				| "openai"
				| "anthropic"
				| "none";

			if (providerType === "none") {
				logger.warn("No AI provider configured");
				logger.info('Run "forge ai setup" to configure an AI provider');
				const { setup } = await inquirer.prompt<{ setup: boolean }>([
					{
						type: "confirm",
						name: "setup",
						message: "Configure AI provider now?",
						default: true,
					},
				]);
				if (!setup) return;
				await setupAIProvider(logger, _config);
				return;
			}

			const apiKey = _config.ai.apiKey;
			if (!apiKey) {
				logger.error(`No API key configured for ${providerType}`);
				logger.info("Set it with: forge config set ai.apiKey <key>");
				process.exit(1);
			}

			const provider = createAIProvider(providerType, apiKey, logger);
			if (!provider.isAvailable()) {
				logger.error(`Invalid API key for ${providerType}`);
				process.exit(1);
			}

			const userPrompt = prompt ?? (await promptForInput());

			const messages: AIMessage[] = [
				{
					role: "system",
					content:
						"You are Forge, an expert developer assistant integrated into a CLI tool. Provide concise, actionable code solutions. When suggesting code, explain briefly. Focus on best practices, TypeScript, and modern web development.",
				},
				{ role: "user", content: userPrompt },
			];

			const model = options.model ?? _config.ai.model;
			const stream = options.stream !== false;

			logger.info(
				picocolors.cyan(`\n  ${picocolors.bold("Forge AI")} (${model})\n`),
			);

			if (stream) {
				let fullResponse = "";
				await provider.streamComplete(messages, {
					model,
					maxTokens: _config.ai.maxTokens,
					onToken: (token) => {
						fullResponse += token;
						process.stdout.write(token);
					},
				});
				process.stdout.write("\n\n");
			} else {
				const response = await provider.complete(messages, {
					model,
					maxTokens: _config.ai.maxTokens,
				});
				logger.info(response);
			}
		});

	const setupCmd = new Command("setup")
		.description("Configure AI provider")
		.action(async () => {
			await setupAIProvider(logger, _config);
		});

	cmd.addCommand(setupCmd);
	return cmd;
}

async function setupAIProvider(
	logger: Logger,
	_config: ForgeConfig,
): Promise<void> {
	const answers = await inquirer.prompt<{
		provider: string;
		apiKey: string;
		model: string;
	}>([
		{
			type: "list",
			name: "provider",
			message: "Select AI provider:",
			choices: [
				{ name: "OpenAI (GPT-4o, GPT-4, GPT-3.5)", value: "openai" },
				{ name: "Anthropic (Claude 3.5 Sonnet, Claude 3)", value: "anthropic" },
			],
		},
		{
			type: "password",
			name: "apiKey",
			message: "Enter your API key:",
			validate: (input: string) => input.length > 0 || "API key is required",
		},
		{
			type: "input",
			name: "model",
			message: "Model (leave empty for default):",
			default: "",
		},
	]);

	const { updateConfig } = await import("../core/config.js");
	updateConfig({
		ai: {
			provider: answers.provider as "openai" | "anthropic",
			apiKey: answers.apiKey,
			model:
				answers.model ||
				(answers.provider === "openai"
					? "gpt-4o"
					: "claude-3-5-sonnet-20240620"),
			maxTokens: 4096,
		},
	});

	logger.success("AI provider configured");
}

async function promptForInput(): Promise<string> {
	const { prompt } = await inquirer.prompt<{ prompt: string }>([
		{
			type: "editor",
			name: "prompt",
			message: "What do you need help with?",
			waitUserInput: true,
		},
	]);
	return prompt;
}
