# Compass — future-only branch

Status: **HOLD. NOT FOR RELEASE.**

This branch preserves the unfinished Compass development for the future. Compass
must not be shipped, merged into a release branch, enabled by a flag, exposed in
Dev Lab, or deployed to production until both conditions are met:

1. Learning V2 is production-ready and has replaced the temporary learning flow.
2. The product owner gives a new, direct and explicit command to resume Compass.

The repository-root marker `.compass-future-only` is the machine-readable lock.
While it exists:

- production EAS builds are blocked;
- Firebase/OTA deploy commands that use the deploy guard are blocked;
- pull requests are blocked by the Compass future-only workflow.

Removing or bypassing the marker without the owner's direct command is forbidden.
Development builds and local tests remain possible so the work can be inspected.
