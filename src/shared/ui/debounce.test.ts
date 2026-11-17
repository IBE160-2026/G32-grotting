import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UX-DR22 debounce", () => {
  it("runs once, 150 ms after the last call", () => {
    const fn = vi.fn();
    const run = debounce(fn, 150);
    run();
    vi.advanceTimersByTime(100);
    run();
    vi.advanceTimersByTime(149);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes the arguments of the last call", () => {
    const fn = vi.fn();
    const run = debounce(fn, 150);
    run(1);
    run(2);
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("runs again after a quiet period", () => {
    const fn = vi.fn();
    const run = debounce(fn, 150);
    run();
    vi.advanceTimersByTime(150);
    run();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("drops a pending call on cancel", () => {
    const fn = vi.fn();
    const run = debounce(fn, 150);
    run();
    run.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
