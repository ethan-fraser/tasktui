#!/usr/bin/env node
import meow from 'meow';
import ui, { loadAndProcessConfig } from './app.js';

const cli = meow(
	`
	Usage
	  $ tasktui

	Options
		--config Path to config file

	Examples
	  $ tasktui
	  $ tasktui --config=./my-tasks.json
`,
	{
		importMeta: import.meta,
		flags: {
			config: {
				type: 'string',
			},
		},
	},
);

loadAndProcessConfig(cli.flags.config);
ui.screen.render();
