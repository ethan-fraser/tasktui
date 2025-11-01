import { AppState, getTaskNameColor } from './state.js';
import { UIComponents } from './ui.js';

export function showError(message: string, ui: UIComponents, state: AppState) {
	state.error = message;
	ui.errorBox.setContent(`{red-fg}Error: ${message}{/}`);
	ui.errorBox.show();
	ui.screen.render();
}

export function render(ui: UIComponents, state: AppState): void {
	const taskListContent = state.taskOrder
		.map((name) => {
			const color = getTaskNameColor(name, state);
			const indicator = name === state.selectedTask ? '»' : ' ';
			return `{${color}}${name}{/} ${indicator}`;
		})
		.join('\n');
	ui.taskList.setContent(taskListContent);

	// Update queue
	if (state.queue.length > 0) {
		const queueContent =
			'{gray-fg} Queue{/}\n' +
			state.queue
				.map(({ name, remainingDeps }) => {
					return `{gray-fg}${name} (${remainingDeps.length}){/}`;
				})
				.join('\n');
		ui.queueContainer.setContent(queueContent);
		ui.queueContainer.show();
	} else {
		ui.queueContainer.hide();
	}

	// Update output pane
	if (state.selectedTask) {
		ui.taskNameBox.setContent(`{gray-fg}${state.selectedTask}{/}`);
		const output = state.buffers[state.selectedTask]?.text ?? '';
		ui.taskOutputBox.setContent(output);
		ui.taskOutputBox.setScrollPerc(100); // Auto-scroll to bottom
	}

	ui.screen.render();
}
