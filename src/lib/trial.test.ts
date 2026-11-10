import { describe, expect, test } from "bun:test";
import { getTrialState, isExtendedVipTrial } from "./trial";

describe("trial access rules", () => {
  const profile = { trial_end_date: "2027-05-10T20:12:00Z" };
  test("stored six-month expiration overrides the 14-day account age", () => {
    const state = getTrialState(profile, "2026-11-10T20:12:00Z", Date.parse("2026-12-10T20:12:00Z"));
    expect(state.active).toBe(true);
    expect(state.daysRemaining).toBe(151);
    expect(state.endsAt).toBe(Date.parse("2027-05-10T20:12:00Z"));
  });
  test("extended trial expires without granting permanent access", () => {
    expect(getTrialState(profile, "2026-11-10T20:12:00Z", Date.parse("2027-05-11T00:00:00Z")).active).toBe(false);
  });
  test("other users retain the 14-day fallback", () => {
    expect(getTrialState(null, "2026-11-10T20:12:00Z", Date.parse("2026-11-25T00:00:00Z")).active).toBe(false);
  });
  test("VIP designation is limited to Kayla", () => {
    expect(isExtendedVipTrial("KAYLAALVARADO051@gmail.com")).toBe(true);
    expect(isExtendedVipTrial("other@example.com")).toBe(false);
  });
});