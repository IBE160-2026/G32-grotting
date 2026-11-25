import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Story 6.9: the page of a reopened Application. FR-19: another Student's id,
// an unknown id and a malformed id all end in the same notFound().

const mocks = vi.hoisted(() => ({
  accounts: true,
  session: { studentId: "student-a" } as { studentId: string } | null,
  getApplicationMeta: vi.fn(),
  requireStudentPage: vi.fn(),
  getDb: vi.fn(),
}));

class NotFound extends Error {}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound();
  },
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/shared/server/config", () => ({
  getConfig: () => ({ features: { accounts: mocks.accounts } }),
}));
vi.mock("@/shared/server/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/modules/application", () => ({
  getApplicationMeta: mocks.getApplicationMeta,
}));
vi.mock("@/modules/application/ui", () => ({
  SavedApplication: () => null,
}));
vi.mock("@/modules/identity", () => ({
  getPageSession: async () => mocks.session,
  requireStudentPage: mocks.requireStudentPage,
}));

import Page, { metadata } from "./page";

const ID = "00000000-0000-4000-8000-000000000001";
const props = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.accounts = true;
  mocks.session = { studentId: "student-a" };
  mocks.getApplicationMeta.mockReset();
  mocks.requireStudentPage.mockReset();
  mocks.getDb.mockReset().mockResolvedValue("db");
});

describe("the page of a saved Application", () => {
  it("has a static title, with no number or employer in it", () => {
    expect(metadata.title).toBe("Lagret søknad – JobAssistant");
  });

  it("renders the saved Application of the session's Student, found by (id, studentId)", async () => {
    mocks.getApplicationMeta.mockResolvedValue({ id: ID });
    const element = (await Page(props(ID))) as ReactElement<{ id: string }>;
    expect(element.props.id).toBe(ID);
    expect(mocks.getApplicationMeta).toHaveBeenCalledWith(
      "student-a",
      "db",
      ID,
    );
  });

  it("ends in notFound for an id that is not the Student's or does not exist", async () => {
    mocks.getApplicationMeta.mockResolvedValue(null);
    await expect(Page(props(ID))).rejects.toBeInstanceOf(NotFound);
  });

  it("ends in notFound for a malformed id before any lookup", async () => {
    for (const id of ["not-a-uuid", "..%2Fx", ""]) {
      await expect(Page(props(id))).rejects.toBeInstanceOf(NotFound);
    }
    expect(mocks.getApplicationMeta).not.toHaveBeenCalled();
  });

  it("is not there with accounts off", async () => {
    mocks.accounts = false;
    await expect(Page(props(ID))).rejects.toBeInstanceOf(NotFound);
    expect(mocks.getApplicationMeta).not.toHaveBeenCalled();
  });
});
