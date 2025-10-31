#!/usr/bin/env node
import {render} from 'ink';
import meow from 'meow';
import React from 'react';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ task-tui

	Options
		--config path/to/file

	Examples
	  $ task-tui --name=Jane
	  Hello, Jane
`,
	{
		importMeta: import.meta,
		flags: {
			config: {
				type: 'string',
				shortFlag: 'c',
			},
		},
	},
);

render(<App config={cli.flags.config} />);
