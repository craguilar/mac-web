# Repository agent instructions

## GitHub identity

- Always use the **`craguilar`** GitHub account on **`github.com`** for every GitHub CLI (`gh`) operation involving **`craguilar/mac-web`**, including read-only queries, pull requests, CI checks, and repository administration.
- Do not rely on the currently active `gh` account or the default SSH identity. Never fall back to another account for this repository.
- Prefer command-scoped authentication: obtain the saved credential with `gh auth token --hostname github.com --user craguilar`, capture it directly into the process's `GH_TOKEN` environment variable without displaying it, and restore the previous value afterward. Never print, log, commit, or place credentials in command arguments.
- Before repository operations, verify that `gh api --hostname github.com user --jq .login` returns exactly `craguilar` under the selected authentication. If that login is unavailable or verification fails, stop the GitHub operation and ask the user to authenticate as `craguilar`.
- Git pushes for this repository must also authenticate as `craguilar`. If SSH selects a different identity, use the verified owner's existing authentication through a command-scoped HTTPS credential helper; preserve the configured remote URL, SSH setup, and active account for other work.
