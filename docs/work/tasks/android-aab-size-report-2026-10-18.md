# Android AAB size report — build procedure

Artifact size is informational. It must not stop or fail an EAS build. Measure the actual `.aab` file rather than an estimated device download or Expo export size.

1. Build without submission:

   ```powershell
   eas build --platform android --profile production
   ```

   Do not add `--auto-submit`.

2. Download the finished `.aab` to an ignored local path.

3. Run the artifact report:

   ```powershell
   npm run android:aab-size-report -- .codex-tmp/size-audit/candidate.aab
   ```

   The command reports exact compressed/raw bytes by category and the 20 largest ZIP entries. It applies no size threshold and is not wired into EAS build hooks.

4. Preserve the supplementary EAS build artifacts. The production profile collects the R8 mapping file and unstripped native libraries outside the AAB for crash diagnostics. Native debug metadata is excluded from the AAB with `android.bundle.includeNativeDebugMetadata=false`. Download the supplementary artifacts with the build's `--all-artifacts` option before release retention expires.

5. Submission is a separate, explicit action after the release has received its required review. The build command above never submits automatically.
