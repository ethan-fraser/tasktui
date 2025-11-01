import {Box, Text} from 'ink';
import React, {useEffect, useState} from 'react';
// import SubprocessOutput from './components/SubprocessOutput.js';
import {TasksConfig} from './lib/types.js';
import {ensureError, loadConfig} from './lib/utils.js';

export default function App(props: {config?: string}) {
	const [config, setConfig] = useState<TasksConfig>();
	const [error, setError] = useState<string | null>(null);

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
		<Box gap={1}>
			<Box
				borderTop={false}
				borderBottom={false}
				borderLeft={false}
				borderStyle="single"
			>
				<Text>{JSON.stringify(config)}</Text>
			</Box>

			{/* <SubprocessOutput command={{ command: 'echo', args: ['Hello, world!']}} /> */}
		</Box>
	);
}
