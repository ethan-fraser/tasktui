import {Box, Text, useApp, useInput, useStdout} from 'ink';
import childProcess from 'node:child_process';
import React, {useEffect, useState} from 'react';
import {Task, TasksConfig} from './lib/types.js';
import {ensureError, loadConfig} from './lib/utils.js';

interface TaskBuffer {
	running: boolean;
	errored: boolean;
	text: string;
}

export default function App(props: {config?: string}) {
	const {stdout} = useStdout();
	const {exit} = useApp();

	const [config, setConfig] = useState<TasksConfig>();
	const [tasks, setTasks] = useState<Record<string, Task>>({});
	const [error, setError] = useState<string | null>(null);
	const [selectedTask, setSelectedTask] = useState<string>('');
	const [buffers, setBuffers] = useState<Record<string, TaskBuffer>>({});

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
			setSelectedTask(Object.keys(config.tasks)[0] ?? '');
			setConfig(config);
		} catch (e) {
			const error = ensureError(e);
			setError(error.message);
			setConfig(undefined);
		}
	}, [props.config]);

	useEffect(() => {
		setTasks(config?.tasks ?? {});
	}, [config]);

	useEffect(() => {
		for (const [name, task] of Object.entries(tasks)) {
			const subProcess = childProcess.spawn('sh', ['-c', task.command]);
			subProcess.on('spawn', () => {
				setBuffers(prev => {
					return {...prev, [name]: {running: true, text: '', errored: false}};
				});
			});
			subProcess.stdout.on('data', (newOutput: Buffer) => {
				const text = newOutput.toString('utf8').trim();
				console.log('got data for', name, text);
				setBuffers(prev => {
					const currentText = prev[name]?.text ?? '';
					return {
						...prev,
						[name]: {running: true, text: currentText + text, errored: false},
					};
				});
			});
			subProcess.on('close', code => {
				console.log(name, 'closed', code);
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
	}, [tasks]);

	useEffect(() => {
		if (!Object.values(buffers).length) return;
		if (Object.values(buffers).every(task => !task.running)) process.exit(0);
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

	function handleMove(steps: number) {
		const taskNames = Object.keys(tasks);
		const selectedIndex = taskNames.indexOf(selectedTask);
		const newIndex =
			(selectedIndex + steps + taskNames.length) % taskNames.length;
		const newTask = taskNames[newIndex];
		setSelectedTask(newTask ?? '');
	}

	function getTaskNameColor(task: string): {color: string; dim: boolean} {
		const buffer = buffers[task];
		if (selectedTask === task) return {color: 'yellow', dim: false};
		if (buffer?.errored) return {color: 'red', dim: true};
		if (buffer?.running) return {color: 'white', dim: false};
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
					<Text dimColor>Tasks</Text>
					{Object.keys(tasks).map((name, i) => (
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
