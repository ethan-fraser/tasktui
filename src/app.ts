import { render, showError } from './renderer.js';
import { createState } from './state.js';
import { cleanup, ensureDependencies, spawnTask } from './tasks.js';
import { createUI } from './ui.js';
import { ensureError, loadConfig } from './utils.js';

const ui = createUI();
const state = createState();

function handleMove(steps: number): void {
	const selectedIndex = state.taskOrder.indexOf(state.selectedTask);
	const newIndex =
		(selectedIndex + steps + state.taskOrder.length) % state.taskOrder.length;
	const newTask = state.taskOrder[newIndex];
	if (newTask) {
		state.selectedTask = newTask;
		render(ui, state);
	}
}

export function loadAndProcessConfig(configPath?: string) {
	try {
		const config = loadConfig(configPath);
		state.config = config;
		const tasks = config?.tasks ?? {};

		if (!Object.keys(tasks).length && state.init) {
			cleanup(state);
			process.exit(0);
		}

		state.init = true;
		state.tasks = tasks;

		// Process tasks
		for (const [name, task] of Object.entries(tasks)) {
			if (state.spawnedTasks.has(name)) continue;
			state.spawnedTasks.add(name);

			if (task.dependsOn.length) {
				const allDepsExist = ensureDependencies(name, task.dependsOn, state);
				if (!allDepsExist) continue;
				state.queue.push({
					name,
					task,
					remainingDeps: task.dependsOn,
				});
				continue;
			}

			spawnTask(name, task, state, () => render(ui, state));
		}

		render(ui, state);
	} catch (e) {
		const error = ensureError(e);
		showError(error.message, ui, state);
	}
}

// Key bindings
ui.screen.key(['up', 'k'], () => {
	handleMove(-1);
});

ui.screen.key(['down', 'j'], () => {
	handleMove(1);
});

ui.screen.key(['C-c', 'q'], () => {
	cleanup(state);
	process.exit(0);
});

// Handle resize
ui.screen.on('resize', () => {
	render(ui, state);
});

export default ui;
