# Instructions for Claude Code

## Git workflow: always ask first

Before running any of the following, ask the user which branch to use and wait for their answer:

- **Commit / push**: which branch should the changes go to?
- **Pull request**: which branch is the source, and which branch is the target?
- **Merge**: which branch is merged into which?

This applies to every change, edit, command, or prompt that ends in a commit, push, PR, or merge.
Never assume the session's default branch or `main`. Never push, open a PR, or merge without explicit confirmation of the branch.

The user's personal working branch is `justin`.
