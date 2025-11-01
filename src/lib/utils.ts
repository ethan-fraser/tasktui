import fs from 'node:fs';
import path from 'node:path';
import z from 'zod';
import { CONFIG_PATH } from './constants.js';
import { TasksConfig, TasksConfigSchema } from './types.js';

function getConfigPath(cliOption?: string): string {
	if (cliOption) return cliOption;
	return CONFIG_PATH;
}

export default function formatZodError(error: z.ZodError): string {
	if (error.issues.length === 0) {
		return 'Unknown Zod error';
	}
	const issue = error.issues[0];
	if (!issue) return error.message;
	const path = issue.path.join('.');
	return `${issue.message} at '${path}' [code: ${issue.code}]`;
}

export function loadConfig(configPath?: string): TasksConfig {
	try {
		const relativePath = path.join(process.cwd(), getConfigPath(configPath));
		const raw = fs.readFileSync(relativePath, 'utf-8');
		const parsed = JSON.parse(raw);
		return z.parse(TasksConfigSchema, parsed);
	} catch (e) {
		const error = ensureError(e);
		throw error;
	}
}

export function ensureError(error: unknown): Error {
	if (error instanceof z.ZodError) return new Error(formatZodError(error));
	if (error instanceof Error) return error;

	let stringified = '[Unable to stringify the thrown value]';
	try {
		stringified = JSON.stringify(error);
	} catch {}

	return new Error(stringified);
}
