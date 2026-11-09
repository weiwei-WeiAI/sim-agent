---
description: "Configured local CAE applications, launch acknowledgements and associated MCP connection status."
kind: "package-reference"
---

# CAE application manager

## Use this package

The Web profile mounts this local service as `cae-manager`. Its volatile `applications` map contains software labels, target versions, absolute launcher paths, separate arguments, working directories, the Agent launch preference and associated MCP server ids. Settings persists user overrides in the profile patch. `launchWatchMs` bounds observation of immediate startup failures; its default is 1500 milliseconds.

`snapshot()` returns executable availability, the latest launch acknowledgement and each associated server's live MCP transport state. `launch(softwareId, trigger, signal)` accepts only an existing catalog id. Agent-triggered launches respect `allowAgentLaunch`; manual launches remain available. Missing paths, unsupported Windows file types and shell metacharacters in batch launchers produce a refusal before spawning. Windows `.exe` files use separate argv without a shell; `.bat` and `.cmd` launch through a quoted, restricted `cmd.exe` invocation. Desktop applications receive a credential-scrubbed environment and outlive the Host. Only launcher console windows are suppressed.

Concurrent launch requests for the same software and saved command share an operation. A still-active launcher prevents duplicate starts for that command. Changing the path, arguments or working directory clears the displayed acknowledgement and does not mistake the previous launcher for the newly configured application. Cancellation before process dispatch prevents launch; an accepted desktop application is not terminated when a request or page ends. The service reports an acknowledgement after the observation window, not license availability, CAE initialization or solver success. GUI errors and failures occurring later require inspection in the application. Separate GUI bridge setup remains necessary.

## Model Experience

MCP metadata can include its official/community maintainer category, connection description and the vendor API documentation used by that adapter. `bridgePort` is optional because embedded APIs do not necessarily open a TCP listener. `snapshot()` copies nested API metadata out of the volatile configuration; it never reports documentation links as connected services. MCP transport state remains independent of application/API readiness.

- Prompt: two tool descriptions explain configured application selection and the distinction between launch acceptance and software readiness.
- Tools: `cae_list_software` returns the catalog; `cae_launch_software` accepts a software id and uses the user's saved launcher. The model cannot supply a command or change launch settings through these tools. Standard tool execution records calls and results.
- Tokens and KV cache: the descriptions add two tool definitions; catalog results contain only the configured applications and their MCP metadata. No background model requests are made.

## Known Limitations and Deferred Work

This local implementation does not discover software installations, manage licenses, detect arbitrary external GUI processes or schedule solver jobs. Batch launchers may exit after handing control to another process; their success is an acknowledgement rather than proof that the application remains running. The read and launch Remote methods are owner-only. The [client page](../../client/ui-cae-interface/README.md) renders the same configuration and results.
