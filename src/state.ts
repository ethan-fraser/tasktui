import childProcess from 'node:child_process';
import { Task, TasksConfig } from './lib/types.js';

export interface TaskBuffer {
	running: boolean;
	errored: boolean;
	text: string;
}

export interface QueueItem {
	name: string;
	task: Task;
	remainingDeps: string[];
}

export interface AppState {
	init: boolean;
	spawnedTasks: Set<string>;
	childProcesses: Map<string, childProcess.ChildProcess>;
	taskOrder: string[];
	config?: TasksConfig;
	tasks: Record<string, Task>;
	error: string | null;
	selectedTask: string;
	buffers: Record<string, TaskBuffer>;
	queue: QueueItem[];
}

export function createState(): AppState {
	return {
		init: false,
		spawnedTasks: new Set<string>(),
		childProcesses: new Map<string, childProcess.ChildProcess>(),
		taskOrder: [],
		config: undefined,
		tasks: {},
		error: null,
		selectedTask: '',
		buffers: {},
		queue: [],
	};
}

export function getTaskNameColor(task: string, state: AppState): string {
	const buffer = state.buffers[task];
	if (!buffer) return 'white-fg';
	if (state.selectedTask === task) return 'yellow-fg';
	if (buffer.errored) return 'red-fg';
	if (buffer.running) return 'white-fg';
	return 'gray-fg';
}
