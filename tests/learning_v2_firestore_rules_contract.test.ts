import fs from "node:fs";
import path from "node:path";

const rules = fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");

describe("Learning V2 delayed Firestore ownership", () => {
  const collections = [
    "learning_v2_assignments",
    "learning_v2_launches",
    "learning_v2_timing_receipts",
    "learning_v2_failure_receipts",
    "learning_v2_receipt_operations",
  ];

  test.each(collections)("%s is server-owned and client-denied", (collection) => {
    const escaped = collection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = rules.match(
      new RegExp(`match /${escaped}/\\{docId\\} \\{([\\s\\S]*?)\\n    \\}`),
    )?.[1];
    expect(block).toBeTruthy();
    expect(block).toContain("allow read, write: if false;");
    expect(block).not.toMatch(/isAdmin\(\)|request\.auth/);
  });

  test("the final catch-all remains deny-only", () => {
    expect(rules).toContain("match /{document=**} {");
    expect(rules).toContain("allow read, write: if false;");
  });
});
