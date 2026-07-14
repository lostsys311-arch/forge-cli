import semver from "semver";
import validate from "validate-npm-package-name";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export function validatePackageName(name: string): ValidationResult {
	const result = validate(name);
	return {
		valid: result.validForNewPackages,
		errors: result.errors ?? [],
		warnings: result.warnings ?? [],
	};
}

export function validateVersion(version: string): boolean {
	return semver.valid(version) !== null;
}

export function validateDirectoryName(name: string): boolean {
	return /^[a-z0-9][a-z0-9._-]*$/i.test(name);
}

export function validateTemplateName(name: string): boolean {
	return /^[a-z0-9][a-z0-9._/-]*$/i.test(name);
}

export function validateApiKey(key: string): boolean {
	return key.length > 0 && /^(sk-|api-)/.test(key);
}
