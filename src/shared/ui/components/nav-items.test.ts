import { describe, expect, it } from "vitest";
import { navItems } from "./nav-items";

const currentOf = (pathname: string) =>
  navItems(pathname)
    .filter((item) => item.current)
    .map((item) => item.label);

describe("UX-DR5 nav items", () => {
  it("lists Hjem then Søknad before accounts exist", () => {
    expect(navItems("/").map((item) => [item.label, item.href])).toEqual([
      ["Hjem", "/"],
      ["Søknad", "/soknad"],
    ]);
  });

  it("marks only Hjem as current on the front page", () => {
    expect(currentOf("/")).toEqual(["Hjem"]);
  });

  it("marks Søknad on its own path and below it", () => {
    expect(currentOf("/soknad")).toEqual(["Søknad"]);
    expect(currentOf("/soknad/resultat")).toEqual(["Søknad"]);
  });

  it("marks nothing on an unknown path or a look-alike prefix", () => {
    expect(currentOf("/finnes-ikke")).toEqual([]);
    expect(currentOf("/soknadsbrev")).toEqual([]);
  });
});
