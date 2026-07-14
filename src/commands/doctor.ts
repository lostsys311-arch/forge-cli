import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";
import { execa } from "execa";
import picocolors from "picocolors";
import type { Logger } from "../core/logger.js";

interface DiagnosticResult {
	name: string;
	status: "pass" | "fail" | "warn";
	message: string;
}

export function doctorCommand(logger: Logger): Command {
	const cmd = new Command("doctor")
		.description("Run diagnostics on your environment and project")
		.option("--fix", "attempt to fix common issues")
		.action(async (options: { fix?: boolean }) => {
			logger.info(picocolors.bold("🔍 Forge Diagnostics"));
			logger.info("");

			const results: DiagnosticResult[] = [];

			results.push(await checkNodeVersion());
			results.push(await checkNpm());
			results.push(await checkGit());
			results.push(await checkPackageJson());
			results.push(await checkTypeScript());
			results.push(await checkDependencies());

			const maxNameLen = Math.max(...results.map((r) => r.name.length));
			const passed = results.filter((r) => r.status === "pass").length;
			const failed = results.filter((r) => r.status === "fail").length;
			const warned = results.filter((r) => r.status === "warn").length;

			for (const result of results) {
				const icon =
					result.status === "pass" ? "✔" : result.status === "fail" ? "✖" : "⚠";
				const color =
					result.status === "pass"
						? picocolors.green
						: result.status === "fail"
							? picocolors.red
							: picocolors.yellow;
				logger.info(
					`  ${color(icon)} ${result.name.padEnd(maxNameLen)}  ${result.message}`,
				);
			}

			logger.info("");
			logger.info(
				picocolors.dim(
					`  ${results.length} checks · ${picocolors.green(`${passed} passed`)} · ${picocolors.red(`${failed} failed`)} · ${picocolors.yellow(`${warned} warnings`)}`,
				),
			);

			if (failed > 0 && options.fix) {
				logger.info("");
				logger.info(picocolors.bold("Attempting fixes..."));
				await attemptFixes(results);
			}
		});

	return cmd;
}

async function checkNodeVersion(): Promise<DiagnosticResult> {
	const minVersion = 18;
	const nodeVersion = process.version.slice(1);
	const major = Number.parseInt(nodeVersion.split(".")[0] ?? "0", 10);

	return {
		name: "Node.js",
		status: major >= minVersion ? "pass" : "fail",
		message:
			major >= minVersion
				? `v${nodeVersion}`
				: `v${nodeVersion} (minimum v${minVersion})`,
	};
}

async function checkNpm(): Promise<DiagnosticResult> {
	try {
		const { stdout } = await execa("npm", ["--version"]);
		const version = stdout.trim();
		return { name: "npm", status: "pass", message: `v${version}` };
	} catch {
		return { name: "npm", status: "fail", message: "not found" };
	}
}

async function checkGit(): Promise<DiagnosticResult> {
	try {
		const { stdout } = await execa("git", ["--version"]);
		return { name: "Git", status: "pass", message: stdout.trim() };
	} catch {
		return { name: "Git", status: "warn", message: "not found (recommended)" };
	}
}

async function checkPackageJson(): Promise<DiagnosticResult> {
	const pkgPath = join(process.cwd(), "package.json");
	if (!existsSync(pkgPath)) {
		return { name: "package.json", status: "warn", message: "not found" };
	}
	try {
		const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
		const issues: string[] = [];
		if (!pkg.name) issues.push('missing "name"');
		if (issues.length > 0) {
			return {
				name: "package.json",
				status: "warn",
				message: issues.join(", "),
			};
		}
		return { name: "package.json", status: "pass", message: `"${pkg.name}"` };
	} catch {
		return { name: "package.json", status: "fail", message: "invalid JSON" };
	}
}

async function checkTypeScript(): Promise<DiagnosticResult> {
	const tsPath = join(process.cwd(), "tsconfig.json");
	if (!existsSync(tsPath)) {
		return {
			name: "TypeScript",
			status: "warn",
			message: "tsconfig.json not found",
		};
	}
	try {
		JSON.parse(await readFile(tsPath, "utf-8"));
		return { name: "TypeScript", status: "pass", message: "configured" };
	} catch {
		return {
			name: "TypeScript",
			status: "fail",
			message: "invalid tsconfig.json",
		};
	}
}

async function checkDependencies(): Promise<DiagnosticResult> {
	const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
	const found = lockFiles.find((f) => existsSync(join(process.cwd(), f)));
	const nodeModules = existsSync(join(process.cwd(), "node_modules"));

	if (found && nodeModules) {
		return {
			name: "Dependencies",
			status: "pass",
			message: `installed (${found})`,
		};
	}
	if (!found) {
		return {
			name: "Dependencies",
			status: "warn",
			message: "no lockfile (run install)",
		};
	}
	return {
		name: "Dependencies",
		status: "warn",
		message: "not installed (run install)",
	};
}

async function attemptFixes(results: DiagnosticResult[]): Promise<void> {
	for (const result of results) {
		if (result.status === "fail") {
			console.error(`  Cannot auto-fix: ${result.name}`);
		}
	}
}
