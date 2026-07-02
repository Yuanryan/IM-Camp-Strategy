import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectionAssetTablePreview } from "./ProjectionAssetTablePreview";

describe("ProjectionAssetTablePreview", () => {
  it("renders three 2x4 mini-card preview variants with four regions each", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectionAssetTablePreview),
    );

    expect(markup).toContain("A 雙欄平衡 mini-card");
    expect(markup).toContain("B 票券式 mini-card");
    expect(markup).toContain("C 儀表板 mini-card");
    expect(markup.match(/data-preview-region=/g)).toHaveLength(12);
    expect(markup.match(/data-preview-layout="2x4"/g)).toHaveLength(12);
    expect(markup.match(/data-preview-asset-card=/g)).toHaveLength(96);
    expect(markup.match(/data-preview-owner-tag=/g)).toHaveLength(96);
    expect(markup).toContain("未售出");
  });

  it("stays as a static design sandbox without importing the live snapshot hook", () => {
    const source = readFileSync(
      "src/components/views/projection/ProjectionAssetTablePreview.tsx",
      "utf8",
    );

    expect(source).not.toContain("useSnapshot");
    expect(source).not.toContain("/api/snapshot");
  });
});
