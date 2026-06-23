"use client";

import { useEffect } from "react";

// 掛載期間「徹底」鎖住整份文件捲動：用於「本來就不需要捲動」的整頁視圖
// （例：地圖站的遊戲地圖分頁，內容已固定為一個視窗高）。
//
// 為什麼需要這個：iPad/Safari 即使頁面沒有可捲內容，仍會接受極小的垂直拖曳 /
// 橡皮筋過捲，而「任何一次頁面捲動」都會把自動隱藏的網址列 / 工具列叫回來，
// 看起來就像「退出全螢幕」。單靠 CSS overflow:hidden 擋不住 Safari 的橡皮筋，
// 必須把 <html> 固定成視窗大小 + 原生 non-passive touchmove preventDefault。
export function ScrollLock() {
  useEffect(() => {
    const docEl = document.documentElement;
    const body = document.body;

    // 保存原樣式，卸載時還原。
    const prev = {
      htmlOverflow: docEl.style.overflow,
      htmlHeight: docEl.style.height,
      htmlPosition: docEl.style.position,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyTouch: body.style.touchAction,
    };

    // 固定成剛好一個視窗高，沒有任何可捲區，也就沒得橡皮筋。
    docEl.style.overflow = "hidden";
    docEl.style.height = "100%";
    docEl.style.position = "fixed";
    docEl.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.position = "fixed";
    body.style.width = "100%";

    // Safari 仍會對 document 做橡皮筋過捲 → 用原生 non-passive 監聽擋掉。
    // 放行「真的需要內部捲動」的元素（標了 data-scrollable，例如側欄隊伍清單），
    // 但只在它「還能往該方向捲」時放行；已到頂 / 底時擋掉，避免捲動外溢到整份文件
    // （iOS Safari 的 overscroll-behavior 對 document 不完整，到邊緣仍會橡皮筋把工具列叫回）。
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const sc = target?.closest<HTMLElement>("[data-scrollable]");
      if (sc) {
        const dy = (e.touches[0]?.clientY ?? 0) - startY; // >0：手指下移＝想往上捲（看更上面）
        const atTop = sc.scrollTop <= 0;
        const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
        const canScroll = sc.scrollHeight > sc.clientHeight;
        // 內容可捲、且不是在邊緣往外拉 → 放行讓元素自己捲。
        if (canScroll && !((atTop && dy > 0) || (atBottom && dy < 0))) return;
      }
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      docEl.style.overflow = prev.htmlOverflow;
      docEl.style.height = prev.htmlHeight;
      docEl.style.position = prev.htmlPosition;
      docEl.style.width = "";
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.touchAction = prev.bodyTouch;
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
