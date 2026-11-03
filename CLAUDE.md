# Instructions for Claude Code

## Git workflow: always use `justin`

After every change, follow this workflow without asking which branch to use:

1. **Commit / push**: commit on the `justin` branch and push to `origin/justin`.
2. **Pull request**: open a pull request from `justin` into `main`, or update the existing open one.
3. **Merge**: merge that pull request into `main` with a merge commit.

Never commit or push directly to `main` or to any other branch, including the session's default branch.
Before starting work, bring `justin` up to date with `origin/main`.
