import React, { useEffect, useState } from "react";
import childProcess from 'node:child_process';
import stripAnsi from 'strip-ansi';
import { Box, Text } from "ink";

interface CommandWithArgs {
  command: string;
  args: string[];
}

export default function SubprocessOutput({ command }: { command: CommandWithArgs}) {
	const [output, setOutput] = useState('');

	useEffect(() => {
		const subProcess = childProcess.spawn(command.command, command.args);
		subProcess.stdout.on('data', (newOutput: Buffer) => {
			const lines = stripAnsi(newOutput.toString('utf8')).split('\n');
			setOutput(lines.join('\n'));
		});
	}, [setOutput]);

	return (
		<Box>
			<Text>{output}</Text>
		</Box>
	);
}