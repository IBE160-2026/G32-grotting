// Runs once when the server starts, not during `next build`. A Hosted version
// with missing settings stops here instead of answering half-configured.
export async function register(): Promise<void> {
  const { assertStartupConfig } = await import("@/shared/server/config");
  assertStartupConfig();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startE2eSeed } = await import("./instrumentation-node");
    await startE2eSeed();
  }
}
