/**
 * Jest global setup — runs once after all tests in a suite.
 * Closes any lingering async handles so Jest can exit cleanly
 * without --forceExit or the "open handles" warning.
 */
afterAll(async () => {
  // Give any in-flight async ops (e.g. Upstash Redis HTTP keep-alive) a moment
  // to settle, then allow the event loop to drain naturally.
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
});
