import { describe, expect, it } from "vitest";
import { stripContactDetails } from "./strip-contact";

describe("FR-26 stripContactDetails", () => {
  const removed: [string, string, string][] = [
    ["email", "Skriv til ola.nordmann@example.no i dag", "Skriv til  i dag"],
    ["email with plus and subdomain", "a+b@mail.firma.co.uk.", "."],
    ["email with Norwegian letters", "bjørn.æøå@firma.no", ""],
    ["bare 8 digits", "Tlf 22334455 nå", "Tlf  nå"],
    ["mobile grouped 3-2-3", "Mobil 912 34 567 nå", "Mobil  nå"],
    ["grouped 2-2-2-2", "Tlf: 22 33 44 55.", "Tlf: ."],
    ["+47 solid", "Ring +4722334455 nå", "Ring  nå"],
    ["+47 grouped", "Ring +47 22 33 44 55 nå", "Ring  nå"],
    ["+47 grouped 3-2-3", "Ring +47 912 34 567 nå", "Ring  nå"],
    ["0047", "Ring 0047 22334455, takk", "Ring , takk"],
    ["+47 with hyphens", "Ring +47-22-33-44-55 nå", "Ring  nå"],
    ["international", "Ring +46 70 123 45 67, takk", "Ring , takk"],
    ["international with brackets", "Call +1 (555) 123-4567.", "Call ."],
    ["international UK", "Call +44 20 7946 0958 now", "Call  now"],
    ["+47 with non-breaking spaces", "Ring +47 22 33 44 55 nå", "Ring  nå"],
    ["+47 glued to a word", "Mobil+4722334455", "Mobil"],
    ["+47 with a double separator", "Ring +47  22 33 44 55 nå", "Ring  nå"],
    [
      "international with non-breaking spaces",
      "Call +46 70 123 45 67 now",
      "Call  now",
    ],
    ["international glued to a word", "Tel+46701234567", "Tel"],
    ["bare grouped with non-breaking spaces", "Tlf 22 33 44 55 nå", "Tlf  nå"],
    ["bare grouped with dots", "Tlf 22.33.44.55 nå", "Tlf  nå"],
    ["bare grouped with hyphens 3-2-3", "Tlf 912-34-567 nå", "Tlf  nå"],
    [
      "phone then newline and a year",
      "Tlf +47 22 33 44 55\n2019",
      "Tlf \n2019",
    ],
    [
      "bare phone then newline and a year",
      "Tlf 22 33 44 55\n2019",
      "Tlf \n2019",
    ],
    [
      "email with an apostrophe",
      "Skriv til o'brien@example.no nå",
      "Skriv til  nå",
    ],
    [
      "email with combining marks",
      "Skriv til björn@example.no nå",
      "Skriv til  nå",
    ],
  ];
  it.each(removed)("deletes a %s", (_name, input, expected) => {
    expect(stripContactDetails(input)).toBe(expected);
  });

  const kept = [
    "Jobbet 2019 til 2022",
    "Jobbet 2019–2022",
    "Jobbet 2019-2022",
    "Jobbet 2019 2022",
    "Økte salget med 45 % i 2021",
    "Omsetning 123456789 kroner",
    "Organisasjonsnummer 923 456 789",
    "Version 1.2.3 and 10.5.2",
    "Budsjett 1 250 000 kr",
    "Ni siffer 912345678",
    "Syv siffer 2233445",
  ];
  it.each(kept)("leaves %s alone", (input) => {
    expect(stripContactDetails(input)).toBe(input);
  });

  it("strips several in one text and inserts nothing", () => {
    const out = stripContactDetails(
      "Navn\nola@example.no\n+47 22 33 44 55\nErfaring 2019–2022",
    );
    expect(out).toBe("Navn\n\n\nErfaring 2019–2022");
  });
});
