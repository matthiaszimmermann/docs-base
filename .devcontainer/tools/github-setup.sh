#!/bin/sh
# One-time GitHub access for this workspace. Stores a fine-grained token in the
# container's home volume via gh; git uses it through gh's credential helper.
# Run this yourself in a terminal. Never paste the token into an agent chat.
set -eu

if [ -z "$(git config --global user.name || true)" ]; then
  printf 'Git author name: '
  read -r name
  git config --global user.name "$name"
fi
if [ -z "$(git config --global user.email || true)" ]; then
  printf 'Git author email: '
  read -r email
  git config --global user.email "$email"
fi

# The container has no SSH route, so GitHub remotes written as SSH use HTTPS here.
git config --global --unset-all url.https://github.com/.insteadOf || true
git config --global --add url.https://github.com/.insteadOf git@github.com:
git config --global --add url.https://github.com/.insteadOf ssh://git@github.com/

if gh auth status --hostname github.com >/dev/null 2>&1; then
  echo 'GitHub token already configured. To replace it: gh auth logout, then rerun.'
else
  echo 'Create a fine-grained token limited to this repository, with an expiry date:'
  echo '  https://github.com/settings/personal-access-tokens/new'
  echo 'Permissions: Contents read/write. Add Pull requests or Issues only if you use gh for them.'
  printf 'Paste the token (input hidden): '
  trap 'stty echo' EXIT INT TERM
  stty -echo
  read -r token
  stty echo
  echo
  printf '%s\n' "$token" | gh auth login --hostname github.com --git-protocol https --with-token
fi
gh auth setup-git --hostname github.com

if git ls-remote --heads origin >/dev/null 2>&1; then
  echo "OK: origin reachable as GitHub user $(gh api user --jq .login)."
else
  echo 'Token saved, but origin is not reachable. Check the remote URL and the token scope.' >&2
  exit 1
fi
