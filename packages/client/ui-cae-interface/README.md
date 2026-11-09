---
description: "Software launch settings and MCP connection inventory in the simulation platform's sidebar."
kind: "package-reference"
---

# CAE MCP page

## Use this package

The Web profile loads this local plugin. Its **CAE MCP** entry appears after **插件** and before **自动化任务**. Each configured software occupies one full-width row with its version, executable availability, launch command, Agent preference and associated MCP summaries. Both software and MCP counts follow the profile; no fixed-size grid is used. Every row offers Configure and Launch actions. Configure opens a shared Modal with editable software launch settings and MCP details: server id, connection state, compatibility, bridge port, discovered tool count and source link. Launch settings save through the profile's Settings service, with revision checks that refuse concurrent overwrites. An unavailable executable disables the launch button; the form remains editable.

## Implementation

MCP details distinguish vendor-maintained MCP servers from community adapters and link to the underlying official API documentation. Each entry can describe its connection mode; a bridge port is shown only when configured. These API references do not increment MCP counts or claim a running software connection.

`src/client/index.ts` registers the main panel and sidebar entry through Slots. The stable panel id preserves existing navigation preferences across the label change. The controller owns Host snapshots and action feedback; conditionally mounted dialogs own unsaved drafts. Closing a dialog discards edits; a failed save retains them and reports the error inside the dialog. Shared Modal handling owns focus restoration, Escape and outside dismissal. Narrow containers keep one software unit per row, wrapping its contents while preserving both actions. The page uses the generated CAE Remote methods and standard Settings writes. Refresh reads the latest software and MCP state. Copy lives in typed Chinese and English dictionaries. Registration lifetime follows the plugin fiber.

## Model Experience

- Prompt: no changes.
- Tools: none added.
- Tokens and KV cache: no effect; this plugin only renders browser UI.

## Software artwork

The four bundled images in `src/client/assets/` identify software rows by application id. They retain the original brand colors and ship through the package asset route, so page rendering makes no image requests to third-party websites. Unknown application ids retain a text fallback. The images are decorative next to the software name.

| Asset | Source |
| --- | --- |
| `hyperworks.png` | [Altair HyperWorks official help](https://2024.help.altair.com/2024/hwdesktop/altair_help/altair-resources/img/altair-icon.png) |
| `ansys-mechanical.png` | [ANSYS Mechanical official help, application taskbar icon](https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/add_ag/graphics/Mechanical_logo_icon_24.png) |
| `abaqus.png` | [Universidad Carlos III de Madrid software catalog](https://www.uc3m.es/sdic/software/abaqus-student-edition) |
| `comsol.png` | [COMSOL website mark](https://www.comsol.com/images/favicon.ico), PNG supplied by [Google favicon service](https://www.google.com/s2/favicons?domain=comsol.com&sz=128) |

Retrieved on 2026-11-08. Product names and artwork belong to their respective owners; the package's MIT license covers its code, not these third-party brand marks. Artwork does not indicate the installed software edition or version.

## Known Limitations and Deferred Work

The page configures launchers, not application installation or licenses. MCP transport connection does not establish software readiness. Software bridge setup and real simulation validation remain application-specific; the page does not install GUI plugins, edit MCP server commands or automatically detect separately launched applications. Agent launching is provided by [the Host CAE manager](../../host/cae-manager/README.md).
