import {Box, Text, useApp, useStdout} from 'ink';
import React, {useEffect, useState} from 'react';
import SubprocessOutput from './components/SubprocessOutput.js';
import {TasksConfig} from './lib/types.js';
import {ensureError, loadConfig} from './lib/utils.js';

export default function App(props: {config?: string}) {
	const {stdout} = useStdout();
	const {exit} = useApp();

	const [config, setConfig] = useState<TasksConfig>();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Enter alternate screen mode
		stdout.write('\x1b[2J\x1b[3J\x1b[H');

		// Clean up: exit alternate screen mode when component unmounts
		return () => {
			stdout.write('\x1b[2J\x1b[3J\x1b[H');
			exit();
		};
	}, [stdout]);

	useEffect(() => {
		try {
			setConfig(loadConfig(props.config));
		} catch (e) {
			const error = ensureError(e);
			setError(error.message);
			setConfig(undefined);
		}
	}, [props.config]);

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
				paddingRight={1}
			>
				{config &&
					Object.keys(config.tasks).map((name, i) => (
						<Text key={i}>{name}</Text>
					))}
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
