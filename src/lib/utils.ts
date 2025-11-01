import {CONFIG_PATH} from './constants.js';

export function getConfigPath(cliOption?: string): string {
	if (cliOption) return cliOption;

	return CONFIG_PATH;
}

export function ensureError(error: unknown): Error {
	if (error instanceof Error) return error;

	let stringified = '[Unable to stringify the thrown value]';
	try {
		stringified = JSON.stringify(error);
	} catch {}

	return new Error(stringified);
}
