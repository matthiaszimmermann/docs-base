# docs-base

A VS Code template for Markdown documentation with Mermaid previews and offline PDF export. Claude Code runs inside an unprivileged, network-restricted devcontainer. Other agents follow [AGENTS.md](AGENTS.md) and the shared [PDF skill](.agents/skills/export-pdf/SKILL.md).

## Convert MD files to PDF

By convention, documents live in `docs/`, but any Markdown file in the repository can be previewed and exported.

The exporter writes each PDF to `pdf_output/`, mirroring the source file's path relative to the repository root. Missing folders are created, and an existing PDF at that path is replaced:

```sh
md2pdf README.md            # -> pdf_output/README.pdf
md2pdf docs/example.md      # -> pdf_output/docs/example.pdf
md2pdf src/docs/intro.md    # -> pdf_output/src/docs/intro.pdf
```

You can also ask Claude `/export-pdf docs/example.md`. Run commands in the container, from the repository root (see [Start Here](#start-here)).

The exporter renders offline to A4 using Markdown-it, Mermaid, and headless Chromium. It escapes raw HTML and rejects remote images, missing assets, and invalid Mermaid. The preview uses a different renderer, so check pagination in the PDF itself.

The output folder `pdf_output/` and all subfolders are Git-ignored.

## Start Here

### Before the First Start

Do these on the host:

1. Install Docker (Linux containers, Compose v2), VS Code, and the **Dev Containers** extension.
1. Complete the [host prerequisites](.devcontainer/SECURITY.md#host-prerequisites) before starting any agent.
1. Create a fine-grained GitHub personal access token for this repository only, with **Contents: read/write** and an expiry date. Save it in a password manager or a similar safe place. The agent can use this token too, so protect your default branch and revoke the token if you suspect misuse.

### First Start in the Container

1. Quit VS Code completely, then start it from a terminal in the repository root without the host SSH agent:

   ```sh
   SSH_AUTH_SOCK= code .
   ```

   Run **Dev Containers: Reopen in Container**. Only the image build has open internet access.
1. Check that the status bar shows **Dev Container: Markdown Docs**, then confirm that `setup-check` passes and complete the host-side review in [the security guide](.devcontainer/SECURITY.md#verify-before-auto-mode). Do this before any credentials enter the container.
1. Run `github-setup` and paste your GitHub access token. It sets your Git identity, rewrites SSH remotes to HTTPS, and stores the token with `gh` inside the container.
1. Optionally run `claude` and sign in with your **Claude subscription** (no API key needed). Never paste login codes or tokens into an agent conversation. You can then select **Auto** permission mode; bypass-permissions mode is disabled.

Login state, history, and the GitHub token live in a per-project Docker home volume that survives rebuilds. Don't share it across repositories or users.

### Every Time You Reopen the Repository

Always start VS Code for this repository with `SSH_AUTH_SOCK= code .`, never with plain `code .` or from the Dock or Start menu. Otherwise VS Code inherits your SSH agent and forwards it into the container. Quit VS Code completely first: if it is still running, `code .` reuses that process and its original environment. On macOS, closing all windows is not enough; use Cmd+Q.

Run `setup-check` each time you reopen the repository in the container, before you start an agent. VS Code can add host integrations again when it attaches, such as SSH agent or Git credential forwarding, so an earlier pass does not cover the current session. The check also runs automatically when VS Code attaches; you can rerun it at any time.

If it fails, do not use Auto mode. Fix the cause on the host as described in [Troubleshooting Forwarding](.devcontainer/SECURITY.md#troubleshooting-forwarding) instead of suppressing the check.

## Checks

```sh
docs-lint    # Markdown style
docs-test    # PDF rendering, Mermaid, invalid input, path containment
setup-check  # isolation smoke test: capabilities, protected tools, blocked egress/DNS, allowed endpoints
```

CI runs all three. Claude login and the VS Code preview still need to be checked by hand.

## Security

Outbound network access is **denied by default**. Only the Claude hosts, `github.com`, and `api.github.com` are reachable, over HTTPS. WebSearch, WebFetch, connectors, plugin marketplaces, Chrome integration, and Remote Control are disabled by managed policy. The container is practical containment for trusted repositories, **not an escape-proof sandbox**: agents can modify the repository, use container credentials, and reach allowed services. Never rebuild the container or run agent-changed configuration on the host without reviewing it first. For architecture, research-domain approval, and known limits, see [.devcontainer/SECURITY.md](.devcontainer/SECURITY.md).

## Maintenance

The tools in [.devcontainer/tools/](.devcontainer/tools/) are baked into the image, so edits to them take effect only after a rebuild. Dependencies are pinned in [package-lock.json](.devcontainer/tools/package-lock.json) and the Claude CLI version in the [Dockerfile](.devcontainer/Dockerfile). Base images and security packages are not pinned, so builds can change over time. Update them through human review and rerun the checks.
