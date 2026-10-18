# Android AAB size gate — release procedure

The production Android artifact must be **35,000,000 bytes or smaller as an actual `.aab` file**. Estimated device download size and Expo export size do not satisfy this gate.

1. Build without submission:

   ```powershell
   eas build --platform android --profile production
   ```

   Do not add `--auto-submit`.

2. Download the finished `.aab` to an ignored local path.

3. Run the artifact gate:

   ```powershell
   npm run android:aab-size-gate -- .codex-tmp/size-audit/candidate.aab
   ```

   The command reports exact compressed/raw bytes by category and the 20 largest ZIP entries. Exit code `1` means the artifact must not be submitted.

   EAS also runs the same check from `eas-build-on-success` for the Android `production` profile. The hook fails closed when the output contains zero or multiple AABs and fails the build above `35,000,000` bytes. This prevents an over-budget build from completing successfully for normal `--auto-submit` handling; the explicit no-auto-submit command remains the required release procedure.

4. Preserve the supplementary EAS build artifacts. The production profile collects the R8 mapping file and unstripped native libraries outside the AAB for crash diagnostics. Native debug metadata is excluded from the AAB with `android.bundle.includeNativeDebugMetadata=false`. Download the supplementary artifacts with the build's `--all-artifacts` option before release retention expires.

5. Submission is a separate, explicit action after the gate reports `PASSED` and the release has received its required review. The build command above never submits automatically.

The gate threshold is deliberately decimal: `35,000,000` bytes, not `35 MiB` (`36,700,160` bytes).
