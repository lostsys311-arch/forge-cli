import { Command } from "commander";
import picocolors from "picocolors";
import type { Logger } from "../core/logger.js";
import type { PluginManager } from "../core/plugin-manager.js";

export function pluginCommand(
	logger: Logger,
	pluginManager: PluginManager,
): Command {
	const cmd = new Command("plugin")
		.alias("plugins")
		.description("Manage Forge plugins")
		.hook("preAction", () => {
			// Prevent the top-level hook from loading plugins twice
		});

	cmd
		.command("list")
		.alias("ls")
		.description("List all loaded plugins")
		.action(() => {
			const plugins = pluginManager.list();
			if (plugins.length === 0) {
				logger.info("No plugins loaded");
				return;
			}
			logger.info(picocolors.bold("Loaded plugins:"));
			for (const p of plugins) {
				logger.info(
					`  ${picocolors.cyan(p.name)}${picocolors.dim(`@${p.version}`)}  ${p.description ?? ""}`,
				);
			}
		});

	cmd
		.command("install <name>")
		.alias("add")
		.description("Install a plugin")
		.action(async (name: string) => {
			logger.info(`Installing plugin: ${name}`);
			try {
				const plugin = await pluginManager.load(name);
				logger.success(`Installed: ${plugin.name}@${plugin.version}`);
			} catch (err) {
				logger.error(`Failed to install plugin "${name}"`);
			}
		});

	cmd
		.command("remove <name>")
		.alias("rm")
		.description("Remove a plugin")
		.action((name: string) => {
			const removed = pluginManager.unload(name);
			if (removed) {
				logger.success(`Removed plugin: ${name}`);
			} else {
				logger.warn(`Plugin not found: ${name}`);
			}
		});

	cmd
		.command("info <name>")
		.description("Show plugin details")
		.action((name: string) => {
			const plugins = pluginManager.list();
			const plugin = plugins.find((p) => p.name === name);
			if (!plugin) {
				logger.error(`Plugin not found: ${name}`);
				return;
			}
			logger.info(picocolors.bold(`\n  ${plugin.name}`));
			logger.info(`  Version:    ${plugin.version}`);
			logger.info(`  Description: ${plugin.description ?? "N/A"}`);
			if (plugin.commands && plugin.commands.length > 0) {
				logger.info(
					`  Commands:   ${plugin.commands.map((c) => c.name).join(", ")}`,
				);
			}
		});

	return cmd;
}
