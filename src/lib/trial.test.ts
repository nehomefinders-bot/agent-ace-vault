import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getTrialState, isExtendedVipTrial } from "./trial";

describe("trial access rules", () => {
  const profile = { trial_end_date: "2027-05-10T20:12:00Z" };
  test("stored six-month expiration overrides the 14-day account age", () => {
    const state = getTrialState(profile, "2026-11-10T20:12:00Z", Date.parse("2026-12-10T20:12:00Z"));
    assert.equal(state.active, true);
    assert.equal(state.daysRemaining, 151);
    assert.equal(state.endsAt, Date.parse("2027-05-10T20:12:00Z"));
  });
  test("extended trial expires without granting permanent access", () => {
    assert.equal(getTrialState(profile, "2026-11-10T20:12:00Z", Date.parse("2027-05-11T00:00:00Z")).active, false);
  });
  test("other users retain the 14-day fallback", () => {
    assert.equal(getTrialState(null, "2026-11-10T20:12:00Z", Date.parse("2026-11-25T00:00:00Z")).active, false);
  });
  test("VIP designation is limited to Kayla", () => {
    assert.equal(isExtendedVipTrial("KAYLAALVARADO051@gmail.com"), true);
    assert.equal(isExtendedVipTrial("other@example.com"), false);
  });
});