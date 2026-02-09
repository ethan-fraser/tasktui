import childProcess from 'node:child_process';
import { CLEANUP_TIMEOUT } from './constants.js';
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
    detached: true,
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

function killProcessGroup(
  pid: number | undefined,
  signal: NodeJS.Signals,
): void {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // Process group already exited
  }
}

export async function cleanup(state: AppState): Promise<void> {
  const processes = [...state.childProcesses.entries()].filter(
    ([_, proc]) => !proc.killed,
  );

  if (processes.length === 0) return;

  const exitPromises = processes.map(
    ([_, proc]) =>
      new Promise<void>((resolve) => {
        proc.on('close', resolve);
        killProcessGroup(proc.pid, 'SIGINT');
      }),
  );

  const timeout = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), CLEANUP_TIMEOUT),
  );

  const result = await Promise.race([
    Promise.all(exitPromises).then(() => 'done' as const),
    timeout,
  ]);

  if (result === 'timeout') {
    for (const [_, proc] of processes) {
      if (!proc.killed) {
        killProcessGroup(proc.pid, 'SIGKILL');
      }
    }
  }
}
