import {Box, Text} from 'ink';
import React, {useEffect, useState} from 'react';
// import SubprocessOutput from './components/SubprocessOutput.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {ensureError, getConfigPath} from './lib/utils.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
export default function App(props: {config?: string}) {
	const [config, setConfig] = useState();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const configPath = path.join(
				__dirname,
				'..',
				getConfigPath(props.config),
			);
			const raw = fs.readFileSync(configPath, 'utf-8');
			const parsed = JSON.parse(raw);
			setConfig(parsed);
			setError(null);
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
