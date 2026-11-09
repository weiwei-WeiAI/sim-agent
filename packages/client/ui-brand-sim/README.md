---
description: "Sim Harness branding for the local simulation workspace."
kind: "package-reference"
---

# Sim Harness identity

## Use this package

The local Web composition mounts this browser plugin. It occupies `sidebar.brand.mark`, `sidebar.brand.name`, and `conversation.hero.brand.mark` with priority -100. The expanded sidebar places the supplied xFusion logo and **Sim Harness** at the left, with a localized CAE assistant descriptor. The home headline and collapsed rail display the same red symbol. The sidebar retains its existing New Session, collapse and keyboard behavior.

`build-dsh.cmd` supplies `DSH_CLIENT_TITLE=Sim Harness` for the browser title; direct builds should supply the same public build variable. This plugin does not rename package identifiers, stored sessions or MCP services.

## Artwork and layout

The unmodified SVG in `src/client/assets/xfusion.svg` comes from the [user-supplied xFusion URL](https://www.xfusion.com/wp-content/uploads/2022/08/logo.svg). Its SHA-256 is `540e6a9838a7038f5f5a4dfdce3045219d59786a58f0372f8d26321dedafff60`. The asset is served locally through the package asset route. CSS masks adapt the logo lettering to theme ink and retain the original red symbol. The rail crops the same asset through CSS. No external image request or font download occurs at runtime; Montserrat comes from the existing theme assets.

The brand slot permits intrinsic artwork height above its 24px minimum. The two-line identity fits within the existing 60px header and avoids the version badge. Both brand occupants wait for the sidebar declarations and leave with their plugin fiber. The name and descriptor come from locale-owned dictionaries.

## Model Experience

None; the plugin changes browser presentation only and contributes no tools, prompts or model requests.

#### KV Cache effect

None; the plugin neither assembles nor sends model context.

## Known Limitations and Deferred Work

This is the local platform identity. Desktop installation metadata and mobile installation icons retain their existing identities. Browser title text is selected at build time, independently of the slot registrations.
