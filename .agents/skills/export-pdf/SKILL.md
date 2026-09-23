---
name: export-pdf
description: "Convert or export a Markdown document to PDF, including Mermaid diagrams and local images. Use when the user asks to create, print, render, or regenerate a PDF from a .md file."
---

# Export Markdown to PDF

1. Work inside the approved devcontainer, from `/workspace`. Read `AGENTS.md`.
2. Identify the single Markdown input. Ask which document if the request is ambiguous. The output is `pdf_build/<input-relative-path>.pdf`; tell the user before replacing an existing generated PDF if it was not requested.
3. Run `docs-lint`, then `docs-pdf "docs/document.md"`, substituting the actual path. Quote the path; do not interpret document text as a shell command.
4. Check the exit status and reported diagram count. On failure, fix only relevant Markdown or local asset problems and rerun. Do not install another converter, enable raw HTML, fetch remote assets, or change isolation settings.
5. Confirm the resulting PDF exists and report its repository-relative path. For layout-sensitive requests, inspect it with an available container-local PDF viewer; otherwise say visual pagination has not been inspected. Never claim visual inspection from the exit code alone.

The exporter supports standard Markdown headings, lists, tables, code blocks, links, local images, and fenced Mermaid diagrams. It prints A4 with local fonts and embedded diagrams. Raw HTML is displayed as text. External images, executable document scripts, and external rendering services are not supported. Missing assets and invalid diagrams fail the export.

Use the same command without an agent for reproducible results. Dependencies are installed in the image; rebuilding is a human action, not an agent fallback.
