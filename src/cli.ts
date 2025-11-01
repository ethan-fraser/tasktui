#!/usr/bin/env node
import meow from 'meow';
import ui, { loadAndProcessConfig } from './app.js';

const cli = meow(
	`
	Usage
	  $ task-tui

	Options
		--config, -c  Path to config file

	Examples
	  $ task-tui
	  $ task-tui --config=./my-tasks.json
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

loadAndProcessConfig(cli.flags.config);
ui.screen.render();
