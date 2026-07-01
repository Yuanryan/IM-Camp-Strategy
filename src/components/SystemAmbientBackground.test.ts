import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { SystemAmbientBackground } from "./SystemAmbientBackground";

describe("SystemAmbientBackground", () => {
  it("uses static CSS layers instead of a continuously repainted canvas", () => {
    const markup = renderToStaticMarkup(
      createElement(SystemAmbientBackground),
    );

    expect(markup).not.toContain("<canvas");
    expect(markup).toContain("system-ambient-background");
    expect(markup.match(/class="system-ambient-layer /g)).toHaveLength(3);
  });
});
