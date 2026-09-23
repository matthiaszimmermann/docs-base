# docs-base

A VS Code template for Markdown documentation with Mermaid previews and offline PDF export. Claude Code runs inside an unprivileged, network-restricted devcontainer. Other agents follow [AGENTS.md](AGENTS.md) and the shared [PDF skill](.agents/skills/export-pdf/SKILL.md).

## Start Here

1. In GitHub Settings, mark this repository as a **Template repository**, then use **Use this template** to create each documentation repository.
2. Install Docker (Linux containers, Compose v2), VS Code, and the **Dev Containers** extension.
3. Complete the [host prerequisites](docs/security.md#host-prerequisites) before starting any agent.
4. Open the repository root in VS Code and run **Dev Containers: Reopen in Container**. Only the image build has open internet access.
5. Check that the status bar shows **Dev Container: Markdown Docs**, then run `docs-check` and the host-side review in [the security guide](docs/security.md#verify-before-auto-mode).
6. Run `claude` and sign in with your **Claude subscription** (no API key needed). Never paste login codes or tokens into an agent conversation.
7. Run `docs-github-setup` to connect Git and `gh` (see [Git and GitHub](#git-and-github)).
8. Optionally select **Auto** permission mode. Bypass-permissions mode is disabled.

Login state and history live in a per-project Docker home volume that survives rebuilds. Don't share it across repositories or users.

## Convert MD files to PDF

By convention, documents live in `docs/`, but any Markdown file in the repository can be previewed and exported.

The exporter writes each PDF to `pdf_output/`, mirroring the source file's path relative to the repository root. Missing folders are created, and an existing PDF at that path is replaced:

```sh
md2pdf README.md            # -> pdf_output/README.pdf
md2pdf docs/example.md      # -> pdf_output/docs/example.pdf
md2pdf src/docs/intro.md    # -> pdf_output/src/docs/intro.pdf
```

You can also ask Claude `/export-pdf docs/example.md`. Run commands from the repository root.

The exporter renders offline to A4 using Markdown-it, Mermaid, and headless Chromium. It escapes raw HTML and rejects remote images, missing assets, and invalid Mermaid. The preview uses a different renderer, so check pagination in the PDF itself.

The output folder `pdf_output/` and all subfolders are Git-ignored.

## Git and GitHub

Run `docs-github-setup` once in the container. It sets your Git identity, rewrites SSH remotes to HTTPS, and stores a **fine-grained token** that you type in yourself. Scope the token to this repository with **Contents: read/write** and an expiry date. The agent can use this token too, so protect your default branch and revoke the token if you suspect misuse.

## Checks

```sh
docs-lint    # Markdown style
docs-test    # PDF rendering, Mermaid, invalid input, path containment
docs-check   # isolation smoke test: capabilities, protected tools, blocked egress/DNS, allowed endpoints
```

CI runs all three. Claude login and the VS Code preview still need to be checked by hand.

## Security

Outbound network access is **denied by default**. Only the Claude hosts, `github.com`, and `api.github.com` are reachable, over HTTPS. WebSearch, WebFetch, connectors, plugin marketplaces, Chrome integration, and Remote Control are disabled by managed policy. The container is practical containment for trusted repositories, **not an escape-proof sandbox**: agents can modify the repository, use container credentials, and reach allowed services. Never rebuild the container or run agent-changed configuration on the host without reviewing it first. For architecture, research-domain approval, and known limits, see [docs/security.md](docs/security.md).

## Maintenance

The tools in [.devcontainer/tools/](.devcontainer/tools/) are baked into the image, so edits to them take effect only after a rebuild. Dependencies are pinned in [package-lock.json](.devcontainer/tools/package-lock.json) and the Claude CLI version in the [Dockerfile](.devcontainer/Dockerfile). Base images and security packages are not pinned, so builds can change over time. Update them through human review and rerun the checks.
