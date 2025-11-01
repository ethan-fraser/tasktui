import childProcess from 'node:child_process';
import { AppState, QueueItem } from './state.js';
import { Task } from './types.js';

export function ensureDependencies(
	task: string,
	deps: string[],
	state: AppState,
): boolean {
	let allDepsExist = true;
	for (const dep of deps) {
		if (!Object.keys(state.tasks).includes(dep)) {
			state.buffers[task] = {
				running: false,
				text: `Cannot depend on ${dep} as it does not exist`,
				errored: true,
			};
			allDepsExist = false;
			break;
		}
	}
	return allDepsExist;
}

export function spawnTask(
	name: string,
	task: Task,
	state: AppState,
	onUpdate: () => void,
): void {
	const subProcess = childProcess.spawn('sh', ['-c', task.command], {
		cwd: task.cwd,
	});
	state.childProcesses.set(name, subProcess);

	subProcess.on('spawn', () => {
		if (Object.keys(state.buffers).length === 0) {
			state.selectedTask = name;
		}
		state.buffers[name] = { running: true, text: '', errored: false };
		state.taskOrder.push(name);
		onUpdate();
	});

	subProcess.stdout.on('data', (newOutput: Buffer) => {
		const text = newOutput.toString('utf8');
		const currentText = state.buffers[name]?.text ?? '';
		state.buffers[name] = {
			running: true,
			text: currentText + text,
			errored: false,
		};
		if (state.selectedTask === name) {
			onUpdate();
		}
	});

	subProcess.stderr.on('data', (newOutput: Buffer) => {
		const text = newOutput.toString('utf8');
		const currentText = state.buffers[name]?.text ?? '';
		state.buffers[name] = {
			running: true,
			text: currentText + text,
			errored: false,
		};
		if (state.selectedTask === name) {
			onUpdate();
		}
	});

	subProcess.on('close', (code) => {
		const currentText = state.buffers[name]?.text ?? '';
		state.buffers[name] = {
			running: false,
			text: currentText + `\n----\nDone (exit code: ${code})`,
			errored: code ? code > 0 : false,
		};
		state.childProcesses.delete(name);

		// Check queue for dependent tasks
		checkQueue(state, onUpdate);
		onUpdate();
	});
}

export function checkQueue(state: AppState, onUpdate: () => void): void {
	const next: QueueItem[] = [];

	for (const queueItem of state.queue) {
		const remaining = queueItem.remainingDeps.filter((dep) => {
			const buffer = state.buffers[dep];
			return buffer?.running || buffer?.errored || !buffer;
		});

		if (remaining.length === 0) {
			spawnTask(queueItem.name, queueItem.task, state, onUpdate);
			continue;
		}

		next.push({ ...queueItem, remainingDeps: remaining });
	}

	state.queue = next;
}

export function cleanup(state: AppState): void {
	for (const [_, proc] of state.childProcesses.entries()) {
		if (!proc.killed) {
			proc.kill('SIGTERM');
		}
	}
}
