import blessed from 'blessed';
import childProcess from 'node:child_process';
import { Task, TasksConfig } from './lib/types.js';
import { ensureError, loadConfig } from './lib/utils.js';

interface TaskBuffer {
	running: boolean;
	errored: boolean;
	text: string;
}

interface QueueItem {
	name: string;
	task: Task;
	remainingDeps: string[];
}

// Create screen
const screen = blessed.screen({
	smartCSR: true,
	title: 'Task Runner',
	fullUnicode: true,
});

// State
const state = {
	init: false,
	spawnedTasks: new Set<string>(),
	childProcesses: new Map<string, childProcess.ChildProcess>(),
	taskOrder: [] as string[],
	config: undefined as TasksConfig | undefined,
	tasks: {} as Record<string, Task>,
	error: null as string | null,
	selectedTask: '',
	buffers: {} as Record<string, TaskBuffer>,
	queue: [] as QueueItem[],
};

// Create sidebar container
const sidebar = blessed.box({
	parent: screen,
	left: 0,
	top: 0,
	width: 25,
	height: '100%',
	borderRight: {
		type: 'line',
	},
	style: {
		border: {
			fg: 'white',
		},
	},
});

// Running section
// const runningHeader = blessed.box({
// 	parent: sidebar,
// 	top: 0,
// 	width: '100%',
// 	height: 1,
// 	content: '{gray-fg} Running{/}',
// 	tags: true,
// });

const runningList = blessed.box({
	parent: sidebar,
	top: 1,
	width: '100%',
	height: 'shrink',
	tags: true,
});

// Queue section
const queueContainer = blessed.box({
	parent: sidebar,
	top: 'center',
	width: '100%',
	height: 'shrink',
	tags: true,
});

// Finished section
const finishedContainer = blessed.box({
	parent: sidebar,
	bottom: 2,
	width: '100%',
	height: 'shrink',
	tags: true,
});

// Help text at bottom
// const helpText = blessed.box({
// 	parent: sidebar,
// 	bottom: 0,
// 	width: '100%',
// 	height: 1,
// 	content: '{gray-fg}↑ ↓ - Select{/}',
// 	tags: true,
// });

// Output pane container
const outputPane = blessed.box({
	parent: screen,
	left: 25,
	top: 0,
	width: '100%-25',
	height: '100%',
});

// Task name header
const taskNameBox = blessed.box({
	parent: outputPane,
	top: 0,
	width: '100%',
	height: 1,
	content: '',
	tags: true,
	style: {
		fg: 'gray',
	},
});

// Task output (scrollable log)
const taskOutputBox = blessed.log({
	parent: outputPane,
	top: 1,
	width: '100%',
	height: '100%-1',
	scrollable: true,
	alwaysScroll: true,
	scrollbar: {
		ch: '█',
		style: {
			fg: 'yellow',
		},
	},
	keys: true,
	vi: true,
	mouse: true,
	tags: true,
});

// Error display
const errorBox = blessed.box({
	parent: screen,
	top: 'center',
	left: 'center',
	width: '80%',
	height: 'shrink',
	border: {
		type: 'line',
	},
	style: {
		fg: 'red',
		border: {
			fg: 'red',
		},
	},
	tags: true,
	hidden: true,
});

// Functions
function showError(message: string) {
	state.error = message;
	errorBox.setContent(`{red-fg}Error: ${message}{/}`);
	errorBox.show();
	screen.render();
}

function render() {
	// Update running list
	const runningTasks = state.taskOrder.filter(
		(name) => state.buffers[name]?.running,
	);
	const runningContent = runningTasks
		.map((name) => {
			const color = getTaskNameColor(name);
			const indicator = name === state.selectedTask ? '»' : ' ';
			return `{${color}}${name}{/} ${indicator}`;
		})
		.join('\n');
	runningList.setContent(runningContent);

	// Update queue
	if (state.queue.length > 0) {
		const queueContent =
			'{gray-fg} Queue{/}\n' +
			state.queue
				.map(({ name, remainingDeps }) => {
					return `{gray-fg}${name} (${remainingDeps.length}){/}`;
				})
				.join('\n');
		queueContainer.setContent(queueContent);
		queueContainer.show();
	} else {
		queueContainer.hide();
	}

	// Update finished list
	const finishedTasks = state.taskOrder.filter(
		(name) => state.buffers[name] && !state.buffers[name].running,
	);
	if (finishedTasks.length > 0) {
		const finishedContent =
			'{gray-fg} Finished{/}\n' +
			finishedTasks
				.map((name) => {
					const color = getTaskNameColor(name);
					return `{${color}}${name}{/}`;
				})
				.join('\n');
		finishedContainer.setContent(finishedContent);
		finishedContainer.show();
	} else {
		finishedContainer.hide();
	}

	// Update output pane
	if (state.selectedTask) {
		taskNameBox.setContent(`{gray-fg}${state.selectedTask}{/}`);
		const output = state.buffers[state.selectedTask]?.text ?? '';
		taskOutputBox.setContent(output);
		taskOutputBox.setScrollPerc(100); // Auto-scroll to bottom
	}

	screen.render();
}

function getTaskNameColor(task: string): string {
	const buffer = state.buffers[task];
	if (!buffer) return 'white-fg';
	if (state.selectedTask === task) return 'yellow-fg';
	if (buffer.errored) return 'red-fg';
	if (buffer.running) return 'white-fg';
	return 'gray-fg';
}

function handleMove(steps: number): void {
	const selectedIndex = state.taskOrder.indexOf(state.selectedTask);
	const newIndex =
		(selectedIndex + steps + state.taskOrder.length) % state.taskOrder.length;
	const newTask = state.taskOrder[newIndex];
	if (newTask) {
		state.selectedTask = newTask;
		render();
	}
}

function ensureDependencies(task: string, deps: string[]): boolean {
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

function spawnTask(name: string, task: Task): void {
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
		render();
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
			render();
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
			render();
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
		checkQueue();
		render();
	});
}

function checkQueue() {
	const next: QueueItem[] = [];

	for (const queueItem of state.queue) {
		const remaining = queueItem.remainingDeps.filter((dep) => {
			const buffer = state.buffers[dep];
			return buffer?.running || buffer?.errored || !buffer;
		});

		if (remaining.length === 0) {
			spawnTask(queueItem.name, queueItem.task);
			continue;
		}

		next.push({ ...queueItem, remainingDeps: remaining });
	}

	state.queue = next;
}

export function loadAndProcessConfig(configPath: string | undefined) {
	try {
		const config = loadConfig(configPath);
		state.config = config;
		const tasks = config?.tasks ?? {};

		if (!Object.keys(tasks).length && state.init) {
			cleanup();
			process.exit(0);
		}

		state.init = true;
		state.tasks = tasks;

		// Process tasks
		for (const [name, task] of Object.entries(tasks)) {
			if (state.spawnedTasks.has(name)) continue;
			state.spawnedTasks.add(name);

			if (task.dependsOn.length) {
				const allDepsExist = ensureDependencies(name, task.dependsOn);
				if (!allDepsExist) continue;
				state.queue.push({
					name,
					task,
					remainingDeps: task.dependsOn,
				});
				continue;
			}

			spawnTask(name, task);
		}

		render();
	} catch (e) {
		const error = ensureError(e);
		showError(error.message);
	}
}

function cleanup() {
	for (const [_, proc] of state.childProcesses.entries()) {
		if (!proc.killed) {
			proc.kill('SIGTERM');
		}
	}
}

// Key bindings
screen.key(['up', 'k'], () => {
	handleMove(-1);
});

screen.key(['down', 'j'], () => {
	handleMove(1);
});

screen.key(['C-c', 'q'], () => {
	cleanup();
	process.exit(0);
});

// Handle resize
screen.on('resize', () => {
	render();
});

// Focus on output box for scrolling
taskOutputBox.focus();

export default screen;
