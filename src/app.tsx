import {Box, Text, useApp, useInput, useStdout} from 'ink';
import childProcess from 'node:child_process';
import React, {useEffect, useRef, useState} from 'react';
import {Task, TasksConfig} from './lib/types.js';
import {ensureError, loadConfig} from './lib/utils.js';

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

export default function App(props: {config?: string; autoClose?: boolean}) {
	const {stdout} = useStdout();
	const {exit} = useApp();

	const init = useRef(false);
	const spawnedTasks = useRef(new Set<string>());
	const [config, setConfig] = useState<TasksConfig>();
	const [tasks, setTasks] = useState<Record<string, Task>>({});
	const [error, setError] = useState<string | null>(null);
	const [selectedTask, setSelectedTask] = useState<string>('');
	const [buffers, setBuffers] = useState<Record<string, TaskBuffer>>({});
	const [queue, setQueue] = useState<QueueItem[]>([]);

	useEffect(() => {
		// Enter alternate screen mode
		stdout.write('\x1b[2J\x1b[3J\x1b[H');

		// Exit alternate screen mode when component unmounts
		return () => {
			stdout.write('\x1b[2J\x1b[3J\x1b[H');
			exit();
		};
	}, [stdout]);

	useEffect(() => {
		try {
			const config = loadConfig(props.config);
			setConfig(config);
		} catch (e) {
			const error = ensureError(e);
			setError(error.message);
			setConfig(undefined);
		}
	}, [props.config]);

	useEffect(() => {
		const tasks = config?.tasks ?? {};
		if (!Object.keys(tasks).length && init.current) {
			process.exit(0);
		}
		init.current = true;
		setTasks(tasks);
	}, [config]);

	useEffect(() => {
		for (const [name, task] of Object.entries(tasks)) {
			if (spawnedTasks.current.has(name)) continue; // Already spawned
			spawnedTasks.current.add(name);

			if (task.dependsOn.length) {
				let allDepsExist = ensureDependencies(name, task.dependsOn);
				if (!allDepsExist) continue;
				setQueue(prev => [
					...prev,
					{name, task, remainingDeps: task.dependsOn},
				]);
				continue;
			}

			// no dependencies, spawn now
			spawnTask(name, task);
		}
	}, [tasks]);

	useEffect(() => {
		if (!Object.values(buffers).length) return;

		// Check if deps of queue items have finished
		setQueue(prev => {
			const next: QueueItem[] = [];

			for (const queueItem of prev) {
				const remaining = queueItem.remainingDeps.filter(dep => {
					const buffer = buffers[dep];
					return buffer?.running || buffer?.errored || !buffer;
				});

				if (remaining.length === 0) {
					spawnTask(queueItem.name, queueItem.task);
					continue;
				}

				next.push({...queueItem, remainingDeps: remaining});
			}

			return next;
		});
	}, [buffers]);

	useInput((input, key) => {
		if (key.upArrow || input === 'k') {
			handleMove(1);
		}

		if (key.downArrow || input === 'j') {
			handleMove(-1);
		}

		if (key.ctrl && input === 'c') {
			// Handle Ctrl+C
			process.exit(0);
		}
	});

	function ensureDependencies(task: string, deps: string[]): boolean {
		let allDepsExist = true;
		for (const dep of deps) {
			if (!Object.keys(tasks).includes(dep)) {
				setBuffers(prev => ({
					...prev,
					[task]: {
						running: false,
						text: `Cannot depend on ${dep} as it does not exist`,
						errored: true,
					},
				}));
				allDepsExist = false;
				break;
			}
		}
		return allDepsExist;
	}

	function spawnTask(name: string, task: Task): void {
		const subProcess = childProcess.spawn('sh', ['-c', task.command]);
		subProcess.on('spawn', () => {
			setBuffers(prev => {
				if (!Object.keys(prev).length) {
					// nothing will be selected yet
					setSelectedTask(name);
				}
				return {...prev, [name]: {running: true, text: '', errored: false}};
			});
		});
		subProcess.stdout.on('data', (newOutput: Buffer) => {
			const text = newOutput.toString('utf8').trim();
			setBuffers(prev => {
				const currentText = prev[name]?.text ?? '';
				return {
					...prev,
					[name]: {running: true, text: currentText + text, errored: false},
				};
			});
		});
		subProcess.on('close', code => {
			setBuffers(prev => {
				const currentText = prev[name]?.text ?? '';
				return {
					...prev,
					[name]: {
						running: false,
						text: currentText + `\n----\nDone (exit code: ${code})`,
						errored: code ? code > 0 : false,
					},
				};
			});
		});
	}

	function handleMove(steps: number): void {
		const taskNames = Object.keys(buffers);
		const selectedIndex = taskNames.indexOf(selectedTask);
		const newIndex =
			(selectedIndex + steps + taskNames.length) % taskNames.length;
		const newTask = taskNames[newIndex];
		setSelectedTask(newTask ?? '');
	}

	function getTaskNameColor(task: string): {color: string; dim: boolean} {
		const buffer = buffers[task];
		if (!buffer) return {color: 'white', dim: false};
		if (selectedTask === task) return {color: 'yellow', dim: false};
		if (buffer.errored) return {color: 'red', dim: true};
		if (buffer.running) return {color: 'white', dim: false};
		return {color: 'white', dim: true};
	}

	if (error) return <Text color="redBright">{error}</Text>;
	return (
		<Box
			width={stdout.columns}
			height={stdout.rows - 1} // -1 to avoid overflow
			flexDirection="row"
			gap={1}
		>
			<Box
				borderTop={false}
				borderBottom={false}
				borderLeft={false}
				borderStyle="single"
				flexDirection="column"
				justifyContent="space-between"
			>
				<Box flexDirection="column">
					<Text dimColor> Running</Text>
					{Object.entries(buffers)
						.filter(([_, b]) => b.running)
						.map(([name], i) => (
							<Box key={i} justifyContent="space-between" gap={1}>
								<Text
									color={getTaskNameColor(name).color}
									dimColor={getTaskNameColor(name).dim}
								>
									{name}
								</Text>
								<Text
									color={getTaskNameColor(name).color}
									dimColor={getTaskNameColor(name).dim}
								>
									»
								</Text>
							</Box>
						))}
				</Box>

				{Object.keys(queue).length > 0 && (
					<Box flexDirection="column">
						<Text dimColor> Queue</Text>
						{queue.map(({name, remainingDeps}, i) => (
							<Box key={i} justifyContent="space-between" gap={1}>
								<Text
									color={getTaskNameColor(name).color}
									dimColor={getTaskNameColor(name).dim}
								>
									{name}
								</Text>
								<Text
									color={getTaskNameColor(name).color}
									dimColor={getTaskNameColor(name).dim}
								>
									({remainingDeps.length})
								</Text>
							</Box>
						))}
					</Box>
				)}

				{Object.entries(buffers).filter(([_, b]) => !b.running).length > 0 && (
					<Box flexDirection="column">
						<Text dimColor> Finished</Text>
						{Object.entries(buffers)
							.filter(([_, b]) => !b.running)
							.map(([name], i) => (
								<Box key={i} justifyContent="space-between" gap={1}>
									<Text
										color={getTaskNameColor(name).color}
										dimColor={getTaskNameColor(name).dim}
									>
										{name}
									</Text>
									<Text
										color={getTaskNameColor(name).color}
										dimColor={getTaskNameColor(name).dim}
									>
										»
									</Text>
								</Box>
							))}
					</Box>
				)}

				<Box>
					<Text dimColor>↑ ↓ - Select</Text>
				</Box>
			</Box>

			<Box flexDirection="column" flexGrow={1}>
				<Text dimColor>{selectedTask}</Text>
				<Text>{buffers[selectedTask]?.text ?? ''}</Text>
			</Box>
		</Box>
	);
}
