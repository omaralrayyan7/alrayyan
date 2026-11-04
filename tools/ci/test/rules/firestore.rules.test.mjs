// Baseline Firestore rules tests, run in the emulator via `npm run test:rules`.
//
// They pin down today's behaviour: public reads only where the site needs
// them, no unauthenticated writes except the two validated public "create"
// endpoints (booking form, anonymous visitor profile). Gaps found in the
// current rules are written as `todo` tests: they describe the desired
// behaviour, are reported, and do not fail CI. The rules are not changed here.
import { after, before, beforeEach, describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(here, "..", "..", "..", "..", "firestore.rules"), "utf8");

let env;

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-alrayyan-ci", firestore: { rules } });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("bookings/b1").set({ visitor_name: "Existing", phone: "0790000000", status: "pending" });
    await db.doc("visitors/v1").set({ first_seen: "2026-01-01" });
    await db.doc("settings/availability").set({ floor4: true });
    await db.doc("site_content/home").set({ title: "x" });
    await db.doc("admin_state/offices").set({ list: [] });
    await db.doc("admin_state/rentals").set({ tenants: [] });
    await db.doc("rentals/r1").set({ tenant: "x" });
    await db.doc("audit_log/a1").set({ action: "x" });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = () => env.authenticatedContext("u1", { email: "someone@example.com", email_verified: true }).firestore();
const admin = () =>
  env.authenticatedContext("admin", { email: "alrayyantower@gmail.com", email_verified: true }).firestore();

const validBooking = () => ({
  visitor_name: "Test Visitor",
  phone: "0790000000",
  email: "visitor@example.com",
  preferred_date: "2026-12-01",
  status: "pending",
  source: "website",
});

describe("public reads: only what the site needs", () => {
  test("anyone can read settings, site_content and published admin_state", async () => {
    await assertSucceeds(anon().doc("settings/availability").get());
    await assertSucceeds(anon().doc("site_content/home").get());
    await assertSucceeds(anon().doc("admin_state/offices").get());
  });

  test("the public cannot read bookings, visitors, rentals, audit log or admin_state/rentals", async () => {
    await assertFails(anon().doc("bookings/b1").get());
    await assertFails(anon().collection("bookings").get());
    await assertFails(anon().doc("visitors/v1").get());
    await assertFails(anon().doc("rentals/r1").get());
    await assertFails(anon().doc("audit_log/a1").get());
    await assertFails(anon().doc("admin_state/rentals").get());
  });

  test("a signed-in non-admin cannot read private data", async () => {
    await assertFails(user().doc("bookings/b1").get());
    await assertFails(user().doc("admin_state/rentals").get());
  });
});

describe("no unauthenticated writes (except the validated public creates)", () => {
  test("the public cannot write settings, site_content, admin_state, rentals or audit_log", async () => {
    await assertFails(anon().doc("settings/availability").set({ floor4: false }));
    await assertFails(anon().doc("site_content/home").set({ title: "hacked" }));
    await assertFails(anon().doc("admin_state/offices").set({ list: ["x"] }));
    await assertFails(anon().doc("rentals/r2").set({ tenant: "x" }));
    await assertFails(anon().doc("audit_log/a2").set({ action: "x" }));
  });

  test("the public cannot update or delete bookings or visitors", async () => {
    await assertFails(anon().doc("bookings/b1").update({ status: "confirmed" }));
    await assertFails(anon().doc("bookings/b1").delete());
    await assertFails(anon().doc("visitors/v1").update({ first_seen: "x" }));
    await assertFails(anon().doc("visitors/v1").delete());
  });

  test("the booking form can create a valid pending booking (needed by the site)", async () => {
    await assertSucceeds(anon().collection("bookings").add(validBooking()));
  });

  test("invalid public bookings are rejected", async () => {
    await assertFails(anon().collection("bookings").add({ ...validBooking(), status: "confirmed" }));
    await assertFails(anon().collection("bookings").add({ ...validBooking(), visitor_name: "x" }));
    await assertFails(anon().collection("bookings").add({ ...validBooking(), phone: "123" }));
    await assertFails(anon().collection("bookings").add({ ...validBooking(), notes: "x".repeat(1001) }));
    const tooMany = validBooking();
    for (let i = 0; i < 25; i++) tooMany[`extra_${i}`] = "x";
    await assertFails(anon().collection("bookings").add(tooMany));
  });

  test("anonymous visitor profiles can be created (needed by the site), capped at 20 fields", async () => {
    await assertSucceeds(anon().collection("visitors").add({ first_seen: "2026-11-04" }));
    const tooMany = {};
    for (let i = 0; i < 21; i++) tooMany[`f${i}`] = "x";
    await assertFails(anon().collection("visitors").add(tooMany));
  });

  test("a signed-in non-admin cannot write admin data", async () => {
    await assertFails(user().doc("settings/availability").set({ floor4: false }));
    await assertFails(user().doc("bookings/b1").update({ status: "confirmed" }));
  });
});

describe("admin", () => {
  test("the admin can read bookings and write settings", async () => {
    await assertSucceeds(admin().doc("bookings/b1").get());
    await assertSucceeds(admin().doc("bookings/b1").update({ status: "confirmed" }));
    await assertSucceeds(admin().doc("settings/availability").set({ floor4: false }));
    await assertSucceeds(admin().doc("admin_state/rentals").get());
  });
});

describe("known gaps (reported, not fixed)", () => {
  test(
    "an UNVERIFIED account using an admin email must not be admin",
    { todo: "isAdmin() does not check request.auth.token.email_verified" },
    async () => {
      const unverified = env
        .authenticatedContext("attacker", { email: "info@alrayyanjo.com", email_verified: false })
        .firestore();
      await assertFails(unverified.doc("bookings/b1").get());
    },
  );

  test(
    "public visitor profiles should have typed, size-limited fields",
    { todo: "validVisitor() only limits the number of fields, not their types or sizes" },
    async () => {
      await assertFails(anon().collection("visitors").add({ blob: "x".repeat(100000) }));
    },
  );
});
