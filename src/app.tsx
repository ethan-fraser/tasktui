import {Box, Text} from 'ink';
import React, {useState} from 'react';
// import SubprocessOutput from './components/SubprocessOutput.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {CONFIG_PATH} from './lib/constants.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default function App(props: {config?: string}) {
	const [config, setConfig] = useState();

	let configPath = props.config;
	if (!configPath) configPath = CONFIG_PATH;

	const rawConfig = fs.readFileSync(path.join(__dirname, configPath), {
		encoding: 'utf-8',
	});
	try {
		const parsedConfig = JSON.parse(rawConfig);
		setConfig(parsedConfig);
	} catch (e) {
		throw new Error('Failed to parse config file', {cause: e});
	}

	return (
		<Box gap={1}>
			<Box
				borderTop={false}
				borderBottom={false}
				borderLeft={false}
				borderStyle="single"
			>
				<Text>{config}</Text>
			</Box>

			{/* <SubprocessOutput command={{ command: 'echo', args: ['Hello, world!']}} /> */}
		</Box>
	);
}
