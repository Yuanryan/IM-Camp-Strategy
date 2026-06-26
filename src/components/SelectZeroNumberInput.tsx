"use client";

import { useEffect } from "react";

// 所有數字輸入欄預設顯示 0 時，取得焦點便直接選取 0，
// 讓下一次輸入覆蓋它而不是變成 01、0100……。
export function SelectZeroNumberInput() {
  useEffect(() => {
    let animationFrame = 0;

    const selectZero = (event: FocusEvent) => {
      const input = event.target;
      if (
        !(input instanceof HTMLInputElement) ||
        (input.type !== "number" && input.inputMode !== "numeric") ||
        input.value !== "0"
      ) {
        return;
      }

      // 等點擊／觸控的瀏覽器預設行為結束後再選取，桌機與平板都能保留選取狀態。
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (document.activeElement === input && input.value === "0") input.select();
      });
    };

    document.addEventListener("focusin", selectZero);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("focusin", selectZero);
    };
  }, []);

  return null;
}
