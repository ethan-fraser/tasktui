import {Box, Text, useApp, useInput, useStdout} from 'ink';
import React, {useEffect, useState} from 'react';
import SubprocessOutput from './components/SubprocessOutput.js';
import {TasksConfig} from './lib/types.js';
import {ensureError, loadConfig} from './lib/utils.js';

export default function App(props: {config?: string}) {
	const {stdout} = useStdout();
	const {exit} = useApp();

	const [config, setConfig] = useState<TasksConfig>();
	const [error, setError] = useState<string | null>(null);
	const [selectedTask, setSelectedTask] = useState<string>('');

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
		if (!config) return;
		const tasks = Object.keys(config.tasks);
		const selectedIndex = tasks.indexOf(selectedTask);
		const newIndex = (selectedIndex + steps + tasks.length) % tasks.length;
		const newTask = tasks[newIndex];
		setSelectedTask(newTask ?? '');
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
					{config &&
						Object.keys(config.tasks).map((name, i) => (
							<Box key={i} justifyContent="space-between" gap={1}>
								<Text color={selectedTask === name ? 'yellow' : undefined}>
									{name}
								</Text>
								<Text color={selectedTask === name ? 'yellow' : undefined}>
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
				{config &&
					Object.values(config.tasks).map((task, i) => (
						<SubprocessOutput key={i} command={task.command} />
					))}
			</Box>
		</Box>
	);
}
