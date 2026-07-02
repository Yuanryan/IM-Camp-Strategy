import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectionArenaDashboard } from "./ProjectionArenaDashboard";
import type { Snapshot } from "@/lib/snapshot";

function makeProjectionSnapshot(): Snapshot {
  return {
    phase: "RUNNING",
    authDisabled: false,
    activeEvents: [],
    event4Penalty: null,
    lottery: {
      period: 1,
      pool: 1200,
      numbers: [],
      lastDraw: null,
    },
    teams: [
      {
        id: 1,
        name: "維積分小蔡一碟",
        color: "#f472b6",
        colorName: "粉",
        colorText: "#1f1020",
        colorRing: "#f472b6",
        coins: 1000,
        cardPoints: 0,
        boardPos: 0,
        passGoShopCredit: 0,
        propertyCount: 1,
        propertyValue: 130,
        netWorth: 1130,
        itemCount: 0,
        items: [],
        cards: [],
        recentAttacks: [],
        objectives: [],
        monopolyRegions: ["AURORA"],
      },
    ],
    properties: [
      {
        id: 1,
        name: "光幣交易所",
        region: "AURORA",
        regionName: "極光金域",
        type: "PROPERTY",
        basePrice: 100,
        level: 1,
        ownerTeamId: 1,
        ownerName: "維積分小蔡一碟",
        ownerColor: "#f472b6",
        ownerColorName: "粉",
        ownerColorText: "#1f1020",
        ownerColorRing: "#f472b6",
        currentValue: 100,
        investedValue: 130,
        leveledValue: 150,
      },
      {
        id: 2,
        name: "Google 台北 101 辦公室",
        region: "AURORA",
        regionName: "極光金域",
        type: "PROPERTY",
        basePrice: 100,
        level: 0,
        ownerTeamId: null,
        ownerName: null,
        ownerColor: null,
        ownerColorName: null,
        ownerColorText: null,
        ownerColorRing: null,
        currentValue: 120,
        investedValue: 100,
        leveledValue: 100,
      },
    ],
    regions: [
      {
        code: "AURORA",
        name: "極光金域",
        monopolyTeamId: 1,
        monopolyTeamName: "維積分小蔡一碟",
        toll: 130,
        monopolyEffect: "COIN_1_5X",
      },
      {
        code: "SPECTRA",
        name: "靈序研究",
        monopolyTeamId: null,
        monopolyTeamName: null,
        toll: 0,
        monopolyEffect: "CARD_POINTS",
      },
      {
        code: "EMBER",
        name: "影焰工域",
        monopolyTeamId: null,
        monopolyTeamName: null,
        toll: 0,
        monopolyEffect: "UPGRADE_BOOST",
      },
      {
        code: "HAVEN",
        name: "晨霧棲城",
        monopolyTeamId: null,
        monopolyTeamName: null,
        toll: 0,
        monopolyEffect: "APPRECIATION",
      },
    ],
    auction: {
      eventId: null,
      announcement: null,
      eventName: null,
      started: false,
      queuedLotCount: 0,
      live: null,
      recentlySold: [],
    },
    settings: {
      auroraMultiplier: 1.5,
      spectraCardPoints: 10,
      havenApprIntervalMs: 60000,
      havenApprRate: 0.01,
      houseIncomeRates: [0.05, 0.1, 0.2],
      cardRegionUpMult: 1.25,
      cardRegionDownMult: 0.75,
      cardBuildingUpMult: 1.5,
      cardBuildingDownMult: 0.5,
    },
  };
}

describe("ProjectionArenaDashboard property table", () => {
  it("places the jackpot text lower in the card instead of vertically centered", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("projection-jackpot-content");
    expect(markup).toContain("items-end");
    expect(markup).toContain("pb-1");
  });

  it("does not render the secondary current-price row for owned properties", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).not.toContain("現價");
    expect(markup).toContain("130");
  });

  it("renders monopoly dominance as a compact one-line badge", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("projection-dominance-badge-compact");
    expect(markup).toContain("維積分小蔡一碟");
    expect(markup).not.toContain("維積分小蔡一碟 獨佔");
    expect(markup).toContain("過路費");
    expect(markup).toContain("光幣 ×1.5");
  });

  it("renders only the larger region name without the region subtitle", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("極光金域");
    expect(markup).toContain("text-[clamp(1.25rem,2.1vw,1.65rem)]");
    expect(markup).not.toContain("金融 / 商業 / 交易");
  });

  it("renders projection assets as aligned 2-column mini cards", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("projection-property-card-grid");
    expect(markup).toContain("grid-cols-2");
    expect(markup).toContain("projection-property-mini-card");
    expect(markup).toContain("projection-property-name-large");
    expect(markup).toContain("projection-property-price-large");
    expect(markup).toContain("projection-owner-tag-compact");
    expect(markup).toContain("projection-level-light-compact");
    expect(markup).toContain("未售出");
  });

  it("keeps long property names from pushing price and owner tags out of mini cards", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("Google 台北 101 辦公室");
    expect(markup).toContain("projection-property-card-main");
    expect(markup).toContain("grid-cols-[minmax(0,1fr)_minmax(4.4rem,max-content)]");
    expect(markup).toContain("projection-property-name-compact");
    expect(markup).toContain("projection-property-card-meta");
    expect(markup).toContain("grid-cols-[3.2rem_minmax(0,1fr)]");
  });

  it("does not apply staggered pulse animation classes to property cards", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("projection-property-row");
    expect(markup).not.toContain("projection-monopoly-property-row");
    expect(markup).not.toContain("--projection-row-index");
  });

  it("uses price color without trend arrow icons on the projection table", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap: makeProjectionSnapshot(),
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("text-emerald-400");
    expect(markup).not.toContain("▲");
    expect(markup).not.toContain("▼");
  });

  it("colors projection prices by current-value movement instead of original price", () => {
    const snap = makeProjectionSnapshot();
    snap.properties[0] = {
      ...snap.properties[0],
      basePrice: 100,
      currentValue: 130,
      investedValue: 180,
    };

    const markup = renderToStaticMarkup(
      createElement(ProjectionArenaDashboard, {
        snap,
        previousPropertyCurrentValues: { 1: 150 },
        lotteryAnimating: false,
      }),
    );

    expect(markup).toContain("180");
    expect(markup).toContain("text-rose-400\">180");
    expect(markup).not.toContain("text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]\">180");
  });
});
