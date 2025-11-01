#!/usr/bin/env node
import meow from 'meow';
import ui, { loadAndProcessConfig } from './app.js';

const cli = meow(
  `
	Usage
	  $ tasktui [--config <PATH> | --help]

	Options
		--config Path to config file (default: ./tasktui.config.json)
`,
  {
    importMeta: import.meta,
    flags: {
      config: {
        type: 'string',
      },
      help: {},
    },
  },
);

loadAndProcessConfig(cli.flags.config);
ui.screen.render();
