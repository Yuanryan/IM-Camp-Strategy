import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhaseDots, PriceTag } from "./ui";

describe("PhaseDots", () => {
  it("uses the ring color for the active dot glow so black team dots remain visible", () => {
    const markup = renderToStaticMarkup(
      createElement(PhaseDots, {
        phase: 1,
        reachable: 3,
        color: "#020617",
        ringColor: "#f8fafc",
      }),
    );

    expect(markup).toContain("background:#020617");
    expect(markup).toContain("box-shadow:0 0 8px #f8fafc");
    expect(markup).toContain("border-color:#f8fafc");
  });
});

describe("PriceTag", () => {
  it("can hide trend arrows while preserving directional color", () => {
    const markup = renderToStaticMarkup(
      createElement(PriceTag, {
        current: 130,
        base: 100,
        hideTrendIcon: true,
      }),
    );

    expect(markup).toContain("text-emerald-400");
    expect(markup).toContain("130");
    expect(markup).not.toContain("▲");
    expect(markup).not.toContain("▼");
  });

  it("can color by an explicit trend value instead of the displayed value", () => {
    const markup = renderToStaticMarkup(
      createElement(PriceTag, {
        current: 180,
        base: 100,
        trendValue: 130,
        trendBase: 150,
        hideTrendIcon: true,
      }),
    );

    expect(markup).toContain("180");
    expect(markup).toContain("text-rose-400");
    expect(markup).not.toContain("text-emerald-400");
  });
});
