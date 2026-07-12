const mockApplicationDefault = jest.fn();
const mockGetApps = jest.fn();
const mockInitializeApp = jest.fn();
const mockDeleteApp = jest.fn();
const mockGetFirestore = jest.fn();
const mockGetAuth = jest.fn();
const mockDocumentId = jest.fn(() => "__name__");

jest.mock("firebase-admin/app", () => ({
  applicationDefault: mockApplicationDefault,
  getApps: mockGetApps,
  initializeApp: mockInitializeApp,
  deleteApp: mockDeleteApp,
}));
jest.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: mockDocumentId },
  getFirestore: mockGetFirestore,
}));
jest.mock("firebase-admin/auth", () => ({ getAuth: mockGetAuth }));

import { createXpAuditReader } from "../scripts/xp_integrity/firestore_reader";

describe("production XP audit reader factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    { maximumReads: 0 },
    { maximumReads: 10, aliasPageSize: 0 },
    { maximumReads: 10, eventPageSize: 0 },
    { maximumReads: 10, aliasMaxDepth: 0 },
    { maximumReads: 10, aliasMaxDocuments: 0 },
  ])(
    "rejects invalid local options before credentials or IAM: %j",
    async (invalid) => {
      await expect(
        createXpAuditReader({ projectId: "demo", ...invalid }),
      ).rejects.toThrow(/invalid|budget/i);
      expect(mockApplicationDefault).not.toHaveBeenCalled();
      expect(mockInitializeApp).not.toHaveBeenCalled();
    },
  );

  test("binds IAM proof and readers to one credential on a fresh dedicated app", async () => {
    const sequence: string[] = [];
    const checkedCredential = {
      getAccessToken: jest.fn(async () => {
        sequence.push("token");
        return { access_token: "checked-token", expires_in: 3600 };
      }),
    };
    const preexistingCredential = { getAccessToken: jest.fn() };
    const preexistingApp = {
      name: "existing-default",
      options: { projectId: "demo", credential: preexistingCredential },
    };
    const dedicatedApp = {
      name: "xp-integrity-audit-dedicated",
      options: { projectId: "demo", credential: checkedCredential },
    };
    mockApplicationDefault.mockImplementation(() => {
      sequence.push("credential");
      return checkedCredential;
    });
    mockDeleteApp.mockResolvedValue(undefined);
    mockGetApps.mockReturnValue([preexistingApp]);
    mockInitializeApp.mockImplementation(
      (options: { credential: unknown; projectId: string }, name: string) => {
        sequence.push("initialize");
        expect(options.credential).toBe(checkedCredential);
        expect(options.projectId).toBe("demo");
        expect(name).toMatch(/^xp-integrity-audit-/);
        expect(name).not.toBe(preexistingApp.name);
        return dedicatedApp;
      },
    );
    mockGetFirestore.mockImplementation((app: unknown) => {
      sequence.push("firestore");
      expect(app).toBe(dedicatedApp);
      return { collection: jest.fn() };
    });
    mockGetAuth.mockImplementation((app: unknown) => {
      sequence.push("auth");
      expect(app).toBe(dedicatedApp);
      return { getUserByEmail: jest.fn() };
    });
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (_url, init) => {
        sequence.push("iam");
        expect(init?.headers).toMatchObject({
          Authorization: "Bearer checked-token",
        });
        return {
          ok: true,
          json: async () => ({
            permissions: [
              "datastore.entities.get",
              "datastore.entities.list",
              "firebaseauth.users.get",
            ],
          }),
        } as Response;
      });

    try {
      const reader = await createXpAuditReader({
        projectId: "demo",
        maximumReads: 10,
      });
      await reader.close();
      await reader.close();
    } finally {
      fetchSpy.mockRestore();
    }

    expect(mockApplicationDefault).toHaveBeenCalledTimes(1);
    expect(checkedCredential.getAccessToken).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockGetFirestore).toHaveBeenCalledWith(dedicatedApp);
    expect(mockGetAuth).toHaveBeenCalledWith(dedicatedApp);
    expect(mockDeleteApp).toHaveBeenCalledTimes(1);
    expect(mockDeleteApp).toHaveBeenCalledWith(dedicatedApp);
    expect(sequence.indexOf("iam")).toBeLessThan(
      sequence.indexOf("initialize"),
    );
    expect(mockGetFirestore).not.toHaveBeenCalledWith(preexistingApp);
  });

  test("cleans up the dedicated app when reader construction fails", async () => {
    const credential = {
      getAccessToken: jest.fn(async () => ({
        access_token: "checked-token",
        expires_in: 3600,
      })),
    };
    const dedicatedApp = {
      name: "xp-integrity-audit-failed",
      options: { projectId: "demo", credential },
    };
    mockApplicationDefault.mockReturnValue(credential);
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue(dedicatedApp);
    mockGetFirestore.mockImplementation(() => {
      throw new Error("firestore_init_failed");
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        permissions: [
          "datastore.entities.get",
          "datastore.entities.list",
          "firebaseauth.users.get",
        ],
      }),
    } as Response);
    try {
      await expect(
        createXpAuditReader({ projectId: "demo", maximumReads: 10 }),
      ).rejects.toThrow("firestore_init_failed");
    } finally {
      fetchSpy.mockRestore();
    }
    expect(mockDeleteApp).toHaveBeenCalledTimes(1);
    expect(mockDeleteApp).toHaveBeenCalledWith(dedicatedApp);
  });
});
