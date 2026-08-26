import assert from "node:assert/strict";

// React Refresh probes every exported value as if it might be a component.
// The probe must not load authored content during application bootstrap; real
// array reads remain deliberately lazy.
const sessionModulePath = require.resolve(
  "../modules/learning-v2/content/source/episode_01_session_03_v1",
);
delete require.cache[sessionModulePath];

const { AUTHORED_EPISODE_01_SESSIONS } = require(
  "../modules/learning-v2/content/source/authored_sessions_v1",
) as typeof import("../modules/learning-v2/content/source/authored_sessions_v1");

assert.equal(
  require.cache[sessionModulePath],
  undefined,
  "importing the authored-session registry must stay lazy",
);

const refreshProbe = AUTHORED_EPISODE_01_SESSIONS as unknown as Record<
  string,
  unknown
>;
// react-refresh/runtime calls getProperty(exportValue, '$$typeof') for object
// exports from both register() and isLikelyComponentType().
void refreshProbe.$$typeof;

assert.equal(
  require.cache[sessionModulePath],
  undefined,
  "React Refresh metadata probes must not load authored session modules",
);

console.log("LEARNING V2 REACT REFRESH LAZY GATE: PASS");
