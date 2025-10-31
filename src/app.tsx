import React from 'react';
import { Box, Text } from 'ink';
import SubprocessOutput from './components/SubprocessOutput.js';

export default function App() {
	return (
		<Box gap={1}>
			<Box borderTop={false} borderBottom={false} borderLeft={false} borderStyle="single">
				<Text>Hello, world.</Text>
			</Box>

			<SubprocessOutput command={{ command: 'echo', args: ['Hello, world!']}} />
		</Box>
	);
}
