import { describe, expect, it } from "vitest";

import { TEAM_COLORS } from "./team-colors";

describe("team colors", () => {
  it("keeps the black team readable with white text and ring colors", () => {
    const blackTeam = TEAM_COLORS.find((color) => color.name === "黑");

    expect(blackTeam).toMatchObject({
      hex: "#020617",
      text: "#f8fafc",
      ring: "#f8fafc",
    });
  });
});
