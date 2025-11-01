import childProcess from 'node:child_process';
import { Task, TasksConfig } from './types.js';

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

export function getOrderedTasks(state: AppState): {
	running: string[];
	queued: QueueItem[];
	completed: string[];
} {
	const running = state.taskOrder.filter(
		(name) => state.buffers[name]?.running,
	);

	const queued = state.queue;

	const completed = state.taskOrder.filter(
		(name) => state.buffers[name] && !state.buffers[name].running,
	);

	return { running, queued, completed };
}

export function getAllTasksInOrder(state: AppState): string[] {
	const { running, queued, completed } = getOrderedTasks(state);
	return [...running, ...queued.map((q) => q.name), ...completed];
}
