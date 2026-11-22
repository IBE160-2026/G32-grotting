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

describe("UX-DR5 nav items with accounts on", () => {
  const pairs = (account: "off" | "out" | "in") =>
    navItems("/", account).map((item) => [item.label, item.href]);
  const currentIn = (pathname: string, account: "out" | "in") =>
    navItems(pathname, account)
      .filter((item) => item.current)
      .map((item) => item.label);

  it("keeps the two-item set for off, which is also the default", () => {
    expect(navItems("/soknad", "off")).toEqual(navItems("/soknad"));
    expect(pairs("off")).toEqual([
      ["Hjem", "/"],
      ["Søknad", "/soknad"],
    ]);
  });

  it("lists Hjem, Søknad, Logg inn, Registrer deg when logged out", () => {
    expect(pairs("out")).toEqual([
      ["Hjem", "/"],
      ["Søknad", "/soknad"],
      ["Logg inn", "/logg-inn"],
      ["Registrer deg", "/registrer"],
    ]);
  });

  it("lists Hjem, Søknad, Profil, Historikk, Konto when logged in", () => {
    expect(pairs("in")).toEqual([
      ["Hjem", "/"],
      ["Søknad", "/soknad"],
      ["Profil", "/profil"],
      ["Historikk", "/historikk"],
      ["Konto", "/konto"],
    ]);
  });

  it("marks the current page in each set", () => {
    expect(currentIn("/logg-inn", "out")).toEqual(["Logg inn"]);
    expect(currentIn("/registrer", "out")).toEqual(["Registrer deg"]);
    expect(currentIn("/profil", "in")).toEqual(["Profil"]);
    expect(currentIn("/historikk", "in")).toEqual(["Historikk"]);
    expect(currentIn("/konto", "in")).toEqual(["Konto"]);
    expect(currentIn("/soknad", "in")).toEqual(["Søknad"]);
  });

  it("marks nothing for a page the set does not list", () => {
    expect(currentIn("/profil", "out")).toEqual([]);
    expect(currentIn("/logg-inn", "in")).toEqual([]);
  });
});
