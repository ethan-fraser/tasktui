import {Box, Text} from 'ink';
import childProcess from 'node:child_process';
import React, {useEffect, useState} from 'react';
import stripAnsi from 'strip-ansi';

export default function SubprocessOutput({command}: {command: string}) {
	const [output, setOutput] = useState('');

	useEffect(() => {
		const subProcess = childProcess.spawn('sh', ['-c', command]);
		subProcess.stdout.on('data', (newOutput: Buffer) => {
			const text = stripAnsi(newOutput.toString('utf8')).trim();
			setOutput(text);
		});
	}, [command]);

	return (
		<Box>
			<Text>{output}</Text>
		</Box>
	);
}
