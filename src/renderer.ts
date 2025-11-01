import { AppState, getOrderedTasks } from './state.js';
import { UIComponents } from './ui.js';

export function showError(message: string, ui: UIComponents, state: AppState) {
  state.error = message;
  ui.errorBox.setContent(`{red-fg}Error: ${message}{/}`);
  ui.errorBox.show();
  ui.screen.render();
}

export function render(ui: UIComponents, state: AppState): void {
  const { running, queued, completed } = getOrderedTasks(state);
  const lines: string[] = [];

  // Running section
  if (running.length > 0) {
    lines.push(`{gray-fg}▶ Running (${running.length}){/}`);
    for (const name of running) {
      const isSelected = name === state.selectedTask;
      const color = isSelected ? 'yellow-fg' : 'white-fg';
      lines.push(`{${color}}${name}{/}`);
    }
    lines.push('');
  }

  // Queued section
  if (queued.length > 0) {
    lines.push(`{gray-fg}⏱ Queued (${queued.length}){/}`);
    for (const queueItem of queued) {
      const isSelected = queueItem.name === state.selectedTask;
      const color = isSelected ? 'yellow-fg' : 'gray-fg';
      lines.push(`{${color}}${queueItem.name}{/}`);
    }
    lines.push('');
  }

  // Completed section
  if (completed.length > 0) {
    lines.push(`{gray-fg}■ Completed (${completed.length}){/}`);
    for (const name of completed) {
      const buffer = state.buffers[name];
      const isSelected = name === state.selectedTask;

      let statusSymbol = '✓';
      let color = 'gray-fg';
      if (buffer?.errored) {
        statusSymbol = '✗';
        color = 'red-fg';
      }

      if (isSelected) {
        color = 'yellow-fg';
      }

      lines.push(`{${color}}${name}{/} ${statusSymbol}`);
    }
  }

  ui.taskList.setContent(lines.join('\n'));

  // Update output pane
  if (state.selectedTask) {
    ui.taskNameBox.setContent(`{gray-fg}${state.selectedTask}{/}`);
    const output = state.buffers[state.selectedTask]?.text ?? '';
    ui.taskOutputBox.setContent(output);
    ui.taskOutputBox.setScrollPerc(100); // Auto-scroll to bottom
  }

  ui.screen.render();
}
