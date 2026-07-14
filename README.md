# Forge — Universal Developer CLI

**Forge** is a next-generation developer CLI tool for scaffolding projects, generating code, managing templates, and getting AI-powered assistance — all with a pluggable architecture.

```bash
npm create forge my-app
cd my-app
npm run dev
```

## Features

- **Project Scaffolding** — Instantly spin up Next.js, Express, React libraries, and more from curated templates
- **Code Generation** — Generate components, hooks, API routes, models, and utilities with a single command
- **AI Assistant** — Get coding help from GPT-4o or Claude 3.5, with streaming output
- **Plugin System** — Extend Forge with custom templates, commands, and lifecycle hooks
- **Diagnostics** — Check your environment and project health with `forge doctor`
- **Configurable** — Per-project and global configuration via `forge.json`

## Quick Start

```bash
# Create a new project
forge init my-project

# Or use a specific template
forge init my-app --template next-app

# Generate a component
forge generate component Button

# Run diagnostics
forge doctor

# Ask AI for help
forge ai "explain this git rebase command"
```

## Commands

| Command | Description |
|---------|-------------|
| `forge init [dir]` | Scaffold a new project |
| `forge generate <type> <name>` | Generate code (component, hook, api, model, util) |
| `forge ai [prompt]` | AI-powered coding assistant |
| `forge doctor` | Run environment diagnostics |
| `forge plugin list` | List installed plugins |
| `forge plugin install <name>` | Install a plugin |
| `forge --help` | Show all commands |

## Plugin Development

Forge plugins are npm packages that export a `ForgePlugin` interface:

```typescript
import type { ForgePlugin } from '@forge/cli';

const plugin: ForgePlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    postInit: async (ctx, options) => {
      await ctx.logger.success('Project created!');
    },
  },
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      run: async () => console.log('Hello from plugin!'),
    },
  ],
};

export default plugin;
```

## Configuration

Forge stores configuration in `~/.config/forge/config.json`. You can override settings per-project by adding a `forge.json` file.

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  },
  "plugins": ["@forge/plugin-prettier", "@forge/plugin-eslint"]
}
```

## Architecture

```
forge/
├── src/
│   ├── cli.ts                 # CLI entry & command registration
│   ├── commands/              # Built-in commands
│   │   ├── init.ts            # Project scaffolding
│   │   ├── generate.ts        # Code generation
│   │   ├── ai.ts              # AI assistant
│   │   ├── doctor.ts          # Diagnostics
│   │   └── plugin.ts          # Plugin management
│   ├── core/                  # Core framework
│   │   ├── plugin-manager.ts  # Plugin loading & lifecycle
│   │   ├── template-engine.ts # Handlebars-based rendering
│   │   ├── config.ts          # Persistent configuration
│   │   └── logger.ts          # Structured logging
│   ├── ai/                    # AI providers
│   │   ├── provider.ts        # Abstraction layer
│   ├── templates/             # Built-in project templates
│   └── utils/                 # Shared utilities
└── tests/                     # Test suite (Vitest)
```

## Development

```bash
git clone https://github.com/your-org/forge
cd forge
npm install

# Development mode with hot reload
npm run dev

# Run tests
npm test

# Build
npm run build
```

## License

MIT
