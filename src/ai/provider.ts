import type { Logger } from "../core/logger.js";

export interface AIMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface AICompletionOptions {
	model?: string;
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
	onToken?: (token: string) => void;
}

export interface AIProvider {
	readonly name: string;
	complete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): Promise<string>;
	streamComplete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): AsyncIterable<string>;
	isAvailable(): boolean;
}

export type AIProviderType = "openai" | "anthropic";

export function createAIProvider(
	type: AIProviderType,
	apiKey: string,
	logger: Logger,
): AIProvider {
	switch (type) {
		case "openai":
			return new OpenAIProvider(apiKey, logger);
		case "anthropic":
			return new AnthropicProvider(apiKey, logger);
		default:
			throw new Error(`Unknown AI provider: ${type}`);
	}
}

class OpenAIProvider implements AIProvider {
	readonly name = "openai";
	private apiKey: string;
	private logger: Logger;

	constructor(apiKey: string, logger: Logger) {
		this.apiKey = apiKey;
		this.logger = logger;
	}

	isAvailable(): boolean {
		return this.apiKey.startsWith("sk-");
	}

	async complete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): Promise<string> {
		const { OpenAI } = await import("openai");
		const client = new OpenAI({ apiKey: this.apiKey });

		this.logger.debug(`OpenAI completion: ${options?.model ?? "gpt-4o"}`);

		const response = await client.chat.completions.create({
			model: options?.model ?? "gpt-4o",
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
			max_tokens: options?.maxTokens ?? 4096,
			temperature: options?.temperature ?? 0.7,
		});

		return response.choices[0]?.message?.content ?? "";
	}

	async *streamComplete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): AsyncIterable<string> {
		const { OpenAI } = await import("openai");
		const client = new OpenAI({ apiKey: this.apiKey });

		const stream = await client.chat.completions.create({
			model: options?.model ?? "gpt-4o",
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
			max_tokens: options?.maxTokens ?? 4096,
			temperature: options?.temperature ?? 0.7,
			stream: true,
		});

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta?.content;
			if (delta) {
				options?.onToken?.(delta);
				yield delta;
			}
		}
	}
}

class AnthropicProvider implements AIProvider {
	readonly name = "anthropic";
	private apiKey: string;
	private logger: Logger;

	constructor(apiKey: string, logger: Logger) {
		this.apiKey = apiKey;
		this.logger = logger;
	}

	isAvailable(): boolean {
		return this.apiKey.startsWith("sk-ant-");
	}

	async complete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): Promise<string> {
		const Anthropic = await import("@anthropic-ai/sdk");
		const client = new Anthropic.default({ apiKey: this.apiKey });

		this.logger.debug(
			`Anthropic completion: ${options?.model ?? "claude-3-5-sonnet-20240620"}`,
		);

		const systemMsg = messages.find((m) => m.role === "system");
		const userMessages = messages.filter((m) => m.role !== "system");

		const completionsParams: Record<string, unknown> = {
			model: options?.model ?? "claude-3-5-sonnet-20240620",
			max_tokens: options?.maxTokens ?? 4096,
			messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
		};
		if (systemMsg?.content) completionsParams.system = systemMsg.content;

		const response = (await client.messages.create(
			completionsParams as never,
		)) as { content: { type: string; text: string }[] };
		return response.content[0]?.type === "text" ? response.content[0].text : "";
	}

	async *streamComplete(
		messages: AIMessage[],
		options?: AICompletionOptions,
	): AsyncIterable<string> {
		const Anthropic = await import("@anthropic-ai/sdk");
		const client = new Anthropic.default({ apiKey: this.apiKey });

		const systemMsg = messages.find((m) => m.role === "system");
		const userMessages = messages.filter((m) => m.role !== "system");

		const stream: AsyncIterable<{
			type: string;
			delta?: { type?: string; text?: string };
		}> = (await client.messages.create({
			model: options?.model ?? "claude-3-5-sonnet-20240620",
			max_tokens: options?.maxTokens ?? 4096,
			messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
			stream: true,
			...(systemMsg?.content ? { system: systemMsg.content } : {}),
		} as never)) as never;

		for await (const event of stream) {
			if (
				event.type === "content_block_delta" &&
				event.delta?.type === "text_delta"
			) {
				const text = event.delta.text;
				if (!text) continue;
				options?.onToken?.(text);
				yield text;
			}
		}
	}
}
