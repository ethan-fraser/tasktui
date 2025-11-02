import childProcess from 'node:child_process';
import { showError } from './renderer.js';
import { AppState, QueueItem } from './state.js';
import { Task } from './types.js';
import { ensureError } from './utils.js';

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
      state.taskOrder.push(task);
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
    env: {
      ...process.env,
      npm_config_color: 'always',
      FORCE_COLOR: '3',
      CLICOLOR_FORCE: '1',
    },
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

  const handleOutput = (newOutput: Buffer) => {
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
  };
  subProcess.stdout.on('data', handleOutput);
  subProcess.stderr.on('data', handleOutput);

  subProcess.on('close', (code) => {
    const currentText = state.buffers[name]?.text ?? '';
    state.buffers[name] = {
      running: false,
      text: currentText,
      errored: code !== null && code !== 0,
    };
    state.childProcesses.delete(name);

    // Check queue for dependent tasks
    checkQueue(state, onUpdate);
    onUpdate();
  });

  subProcess.on('error', (e) => {
    const error = ensureError(e);
    showError(error.message);
  });
}

function checkQueue(state: AppState, onUpdate: () => void): void {
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
