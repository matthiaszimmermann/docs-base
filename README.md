# docs-base

A reusable, VS Code-first template for Markdown documentation, Mermaid previews, and offline PDF export. Claude Code's extension and CLI run inside an unprivileged devcontainer. Other agents can follow [AGENTS.md](AGENTS.md) and the shared [PDF skill](.agents/skills/export-pdf/SKILL.md).

## Start Here

1. Mark this repository as a **Template repository** in GitHub Settings, then use **Use this template** to create each documentation repository. This GitHub setting is not stored in repository files.
2. Install Docker Desktop on macOS/Windows (Linux containers), or Docker Engine with Compose v2 on Linux. Install current VS Code and its **Dev Containers** extension. Apple Silicon and x86-64 use native multi-architecture images.
3. Complete the **Host Prerequisites** in [the security guide](docs/security.md#host-prerequisites) before starting any agent. Repository settings cannot disable every host integration.
4. Clone only the new repository, open its root in VS Code, and run **Dev Containers: Reopen in Container**. The initial build needs internet access to install packages; agent sessions do not have that build-time access.
5. Confirm the status bar says **Dev Container: Markdown Docs** and the Claude extension is installed in the container, not merely on the host. Run `docs-check` in the integrated terminal, then complete the host-side mount/tool review.
6. Run `claude` and sign in with your **Claude subscription**. Complete authorization in your own browser. If the localhost callback fails, paste the browser's code directly into Claude's terminal prompt, never into an agent conversation. Alternatively, sign in through the container's Claude extension panel.
7. Run `docs-github-setup` (or the task **Docs: Set Up GitHub Access**) to connect Git and `gh` to this repository. See [Git and GitHub](#git-and-github).
8. After verification, select **Auto** in Claude's permission selector, or start the CLI with `claude --permission-mode auto`. Availability depends on your plan/model and organization policy; use the regular approval mode if Auto is unavailable. Bypass-permissions mode is disabled.

Authentication, editor state, and history live in a Compose-project-scoped Docker home volume, not your host home or the repository. `CLAUDE_CONFIG_DIR` keeps Claude's account metadata there too. Do not share this volume across repositories or users. Rebuilding preserves it; removing it requires signing in again. No API key is needed.

On Windows, use Docker Desktop's Linux-container mode; a WSL2 checkout generally performs better. LF line endings are enforced by [.gitattributes](.gitattributes). Linux host UIDs are adjusted by Dev Containers; direct Compose use defaults to UID 1000.

## Write and Preview

Put documents in `docs/`. Open [the example](docs/example.md), then run **Markdown: Open Preview to the Side**. The installed **Markdown Preview Mermaid Support** extension renders fenced `mermaid` blocks in VS Code's normal preview. Markdownlint provides writing diagnostics. Preview and PDF use independent renderers, so check the exported PDF for pagination and diagram sizing.

If automatic extension installation cannot complete under restricted networking, download the three extensions' VSIX files on the host and use **Extensions: Install from VSIX...** in the container window. Do not allowlist the whole Marketplace or temporarily open container egress. See [extension setup](docs/security.md#editor-and-extension-setup).

## Export PDF

In the container, from the repository root:

```sh
docs-pdf docs/example.md
```

Output: `pdf_build/docs/example.pdf`. Subdirectories are preserved, and a successful export replaces the corresponding generated PDF. Generated files are Git-ignored.

You can also use **Tasks: Run Build Task** with a Markdown file active, or ask Claude `/export-pdf docs/example.md`. Other agents use the shared skill referenced by [AGENTS.md](AGENTS.md).

The exporter uses Markdown-it, local Mermaid, and headless Chromium. It supports standard Markdown, tables, local images, and Mermaid without a CDN or external rendering service. PDFs use A4, selectable text, and local fonts. Raw HTML is treated as text; remote images, missing assets, and invalid Mermaid are rejected. Large diagrams may need splitting for legible printing. Academic citations, book assembly, and elaborate publication templates are outside this initial scope.

## Git and GitHub

Git and the GitHub CLI work inside the container: `fetch`, `pull`, `rebase`, `commit`, `push`, and `gh` all use `github.com` and `api.github.com`, the only non-Claude hosts on the allowlist.

One-time setup, in the container terminal:

```sh
docs-github-setup
```

It sets your Git author name and email, makes SSH-style GitHub remotes (`git@github.com:`) use HTTPS inside the container, and asks for a **fine-grained personal access token**. Create the token for this repository only, with **Contents: read/write** and an expiry date. Add Pull requests or Issues permissions only if you use `gh` for them. Type the token into the setup prompt yourself, never into an agent conversation. It is stored in the container's home volume and survives rebuilds.

The agent can use the same token, so it can push to this repository too. Protect your default branch on GitHub (require pull requests, block force-pushes) so a mistaken push cannot overwrite it. Revoke the token on GitHub if you suspect misuse; deleting it locally does not cancel copies. Keep your main GitHub login on the host; it is never needed in the container.

## Check the Repository

```sh
docs-lint
docs-test
docs-check
```

Tests exercise actual Chromium PDF output and Mermaid rendering, plus invalid input, local assets, and path containment. The isolation check verifies capability dropping, protected tooling, denied research/direct egress/DNS, and TLS connectivity to the Claude and GitHub endpoints. It does not prove immunity to escapes or validate your complete VS Code configuration.

The included CI workflow runs these checks without signing into Claude. Actual subscription login and the interactive VS Code preview need human verification.

## Network and Security

Research access is **denied by default**. Only the Claude subscription hosts plus `github.com` and `api.github.com` are admitted, on HTTPS port 443 only. WebSearch, WebFetch, account connectors, plugin marketplaces, Chrome integration, and Remote Control are disabled in the installed Claude policy. Git uses a token scoped to this repository; see [Git and GitHub](#git-and-github).

See [the security guide](docs/security.md) for architecture, approval of research domains, rebuilding, and limitations. This is practical containment for trusted repositories, **not an escape-proof sandbox**. Agents can modify or delete the mounted repository, access container-local credentials, and communicate with permitted services. Never automatically rebuild or run changed repository configuration on the host.

## Maintain the Template

The export and check tools live in [.devcontainer/tools/](.devcontainer/tools/) and are copied into the workspace image, so editing them has no effect until a rebuild. Their dependencies are pinned in [package-lock.json](.devcontainer/tools/package-lock.json), and the CLI version is pinned in [the Dockerfile](.devcontainer/Dockerfile). Base image tags and Debian security packages intentionally track updates; builds are not bit-for-bit reproducible. Update dependencies and container images through human-reviewed maintenance, then rerun the checks. The runtime is read-only outside the repository, project home volume, and temporary storage; installing packages is not part of a writing session.
