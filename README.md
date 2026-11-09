# Sim Harness

English | [中文](README.zh.md)

Sim Harness is a modeling and simulation assistant for CAE engineers. It is built on the open-source [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and is being adapted for workflows involving HyperWorks, ANSYS Mechanical, Abaqus, and COMSOL Multiphysics.

The project provides a plugin-based agent foundation and CAE MCP integration entry points. Software installation paths, licenses, model-provider credentials, and MCP server settings are configured on each workstation. Commercial CAE software is not bundled.

## Developer preview

This project is under active development, and setup steps or features may change. Review the [safety notice](SAFETY.md) before running it.

## Run from source

Install Node.js 24.9.0 or newer and pnpm 11.28.5, then run:

```sh
git clone https://github.com/weiwei-WeiAI/sim-agent.git
cd sim-agent
pnpm install
pnpm run build
pnpm dsh web
```

The Web UI starts at `http://127.0.0.1:3080` by default. `pnpm run build` prepares the repository artifacts; `pnpm dsh web` starts the app using those artifacts.

## Development

The source retains the upstream development guides. Start with [the development guide](docs/development.md), [the architecture documentation](docs/architecture.md), and [AGENTS.md](AGENTS.md).

## Upstream and license

Sim Harness is based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), an open-source project developed by DeepSeek AI. This repository is distributed under the [MIT License](LICENSE). Third-party dependencies and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
