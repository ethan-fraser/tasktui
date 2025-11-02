import blessed from 'blessed';

export interface UIComponents {
  screen: blessed.Widgets.Screen;
  sidebar: blessed.Widgets.BoxElement;
  taskList: blessed.Widgets.BoxElement;
  queueContainer: blessed.Widgets.BoxElement;
  taskNameBox: blessed.Widgets.BoxElement;
  taskOutputBox: blessed.Widgets.Log;
  errorBox: blessed.Widgets.BoxElement;
  keybindsBox: blessed.Widgets.BoxElement;
}

export function createUI(): UIComponents {
  // Create screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Task Runner',
    fullUnicode: true,
  });

  // Create sidebar container
  const sidebar = blessed.box({
    parent: screen,
    left: 0,
    top: 0,
    width: 25,
    height: '100%',
  });

  // Add a vertical line separator
  blessed.line({
    parent: screen,
    orientation: 'vertical',
    left: 24,
    top: 0,
    height: '100%',
    style: {
      fg: 'white',
    },
  });

  // Tasks list
  const taskList = blessed.box({
    parent: sidebar,
    width: '100%',
    height: 'shrink',
    tags: true,
  });

  // Queue section
  const queueContainer = blessed.box({
    parent: sidebar,
    top: 'center',
    width: '100%',
    height: 'shrink',
    tags: true,
  });

  // Help text at bottom
  blessed.box({
    parent: sidebar,
    bottom: 0,
    width: '100%',
    height: 2,
    content: '{gray-fg}↑↓ - Navigate\nm - More binds{/}',
    tags: true,
  });

  // Output pane container
  const outputPane = blessed.box({
    parent: screen,
    left: 25,
    top: 0,
    width: '100%-25',
    height: '100%',
  });

  // Task name header
  const taskNameBox = blessed.box({
    parent: outputPane,
    top: 0,
    width: '100%',
    height: 1,
    content: '',
    tags: true,
    style: {
      fg: 'gray',
    },
  });

  // Task output (scrollable log)
  const taskOutputBox = blessed.log({
    parent: outputPane,
    top: 1,
    width: '100%',
    height: '100%-1',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '█',
      style: {
        fg: 'white',
      },
    },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
  });

  // Error display
  const errorBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: 'shrink',
    border: {
      type: 'line',
    },
    style: {
      fg: 'red',
      border: {
        fg: 'red',
      },
    },
    tags: true,
    hidden: true,
  });

  // Error display
  const keybindsBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: 'shrink',
    border: {
      type: 'line',
    },
    tags: true,
    hidden: true,
  });

  // Focus on output box for scrolling
  taskOutputBox.focus();

  return {
    screen,
    sidebar,
    taskList,
    queueContainer,
    taskNameBox,
    taskOutputBox,
    errorBox,
    keybindsBox,
  };
}
