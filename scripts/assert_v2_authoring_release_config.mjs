if (process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO === "false") {
  console.error(
    "Refusing V2 authoring deployment while ENFORCE_APP_CHECK_CONTENT_STUDIO=false",
  );
  process.exit(1);
}

console.log("V2 authoring release config: App Check fail-closed");
