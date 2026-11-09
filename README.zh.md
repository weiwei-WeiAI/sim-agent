# Sim Harness

[English](README.md) | 中文

Sim Harness 是面向建模仿真工程师的 CAE 建模仿真助手，基于开源项目 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 构建，并围绕 HyperWorks、ANSYS Mechanical、Abaqus 和 COMSOL Multiphysics 等软件适配工程工作流。

项目提供插件式智能体基础和 CAE MCP 接入入口。各工作站需要自行配置仿真软件安装路径、软件许可、模型服务凭据和 MCP 服务；本项目不包含商业仿真软件。

## 开发者预览

项目仍在积极开发中，功能和配置方式可能变化。运行前请阅读[安全说明](SAFETY.zh.md)。

## 从源码运行

请安装 Node.js 24.9.0 或更高版本以及 pnpm 11.28.5，然后运行：

```sh
git clone https://github.com/weiwei-WeiAI/sim-agent.git
cd sim-agent
pnpm install
pnpm run build
pnpm dsh web
```

Web UI 默认在 `http://127.0.0.1:3080` 启动。`pnpm run build` 会准备仓库产物；`pnpm dsh web` 使用这些产物启动应用。

## 开发

源码中保留了上游开发文档。请从[开发指南](docs/development.zh.md)、[架构文档](docs/architecture.zh.md)和 [AGENTS.md](AGENTS.md) 开始。

## 上游项目与许可证

Sim Harness 基于 DeepSeek AI 开发的开源项目 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。本仓库依据 [MIT 许可证](LICENSE)发布；第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
