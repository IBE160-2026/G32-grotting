import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadExamplePair, log } = vi.hoisted(() => ({
  loadExamplePair: vi.fn(),
  log: vi.fn(),
}));

vi.mock("@/shared/server/data-files", () => ({ loadExamplePair }));
vi.mock("@/shared/server/log", () => ({ log }));

import SoknadPage from "./page";

const pair = {
  cvText: "cv",
  jobAd: "ad",
  jobTitle: "Tittel",
  employer: "Arbeidsgiver",
};

beforeEach(() => {
  loadExamplePair.mockReset();
  log.mockReset();
});

describe("FR-27 the Søknad page hands the Example pair to the form", () => {
  it("passes the pair as the example prop", async () => {
    loadExamplePair.mockResolvedValue(pair);
    const element = (await SoknadPage()) as ReactElement<{ example: unknown }>;
    expect(element.props.example).toEqual(pair);
    expect(log).not.toHaveBeenCalled();
  });

  it("logs and renders the form without the example when the pair cannot be read", async () => {
    loadExamplePair.mockRejectedValue(new TypeError("boom"));
    const element = (await SoknadPage()) as ReactElement<{ example: unknown }>;
    expect(element.props.example).toBeUndefined();
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "UNEXPECTED",
      errorName: "TypeError",
      route: "/soknad",
    });
  });
});
