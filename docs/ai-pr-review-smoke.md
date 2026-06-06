# AI PR review smoke test

This temporary PR verifies that the AI PR reviewer workflow creates the required i-pr-review/pass status check.

Expected gate behavior:
- no critical finding for this docs-only change;
- warnings, if any, remain informational;
- i-pr-review/pass becomes success.