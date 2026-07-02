import type { CSSProperties } from "react";
import { Crown, Sparkles } from "lucide-react";

import { REGIONS, REGION_UI, type RegionCode } from "@/lib/game";

type OwnerKey = keyof typeof OWNERS;

type PreviewAsset = {
  id: number;
  name: string;
  region: RegionCode;
  level: number;
  ownerKey: OwnerKey | null;
  price: number;
  trend: "up" | "down" | "flat";
};

type PreviewVariant = {
  key: "balanced" | "ticket" | "dashboard";
  title: string;
  subtitle: string;
  bestFor: string;
};

const VARIANTS: PreviewVariant[] = [
  {
    key: "balanced",
    title: "A 雙欄平衡 mini-card",
    subtitle: "最接近原本 mini-card，但用 2×4 分欄把每張卡高度拉開，資訊排列最穩。",
    bestFor: "推薦主案：保留資產名、價格、等級、小隊 tag，同時降低直向壓迫。",
  },
  {
    key: "ticket",
    title: "B 票券式 mini-card",
    subtitle: "每張卡用左側色條像票券一樣切出識別點，owner tag 與價格更快被掃到。",
    bestFor: "適合：希望小隊歸屬非常明顯，但不想增加動態或大面積光效。",
  },
  {
    key: "dashboard",
    title: "C 儀表板 mini-card",
    subtitle: "價格成為視覺主角，資產名稱與 tag 分層，遠距離投影辨識最強。",
    bestFor: "適合：觀眾最常看價值變化，且能接受比較像資訊看板的排版。",
  },
];

const OWNERS = {
  pink: {
    name: "維積分小蔡一碟",
    color: "#f472b6",
    text: "#1f1020",
    ring: "#f9a8d4",
  },
  cyan: {
    name: "靈序小隊",
    color: "#22d3ee",
    text: "#082f49",
    ring: "#67e8f9",
  },
  rose: {
    name: "影焰工坊",
    color: "#fb7185",
    text: "#3f0713",
    ring: "#fda4af",
  },
  black: {
    name: "蘇per idol就是你今晚的2孟",
    color: "#020617",
    text: "#f8fafc",
    ring: "#f8fafc",
  },
} as const;

const PREVIEW_ASSETS: PreviewAsset[] = [
  { id: 1, region: "AURORA", name: "光幣交易所", level: 2, ownerKey: "pink", price: 1320, trend: "down" },
  { id: 2, region: "AURORA", name: "星展銀行", level: 1, ownerKey: "pink", price: 980, trend: "flat" },
  { id: 3, region: "AURORA", name: "IM百貨", level: 0, ownerKey: null, price: 560, trend: "up" },
  { id: 4, region: "AURORA", name: "財務長辦公室", level: 3, ownerKey: "black", price: 1710, trend: "up" },
  { id: 5, region: "AURORA", name: "投資銀行", level: 2, ownerKey: "cyan", price: 1210, trend: "flat" },
  { id: 6, region: "AURORA", name: "量化交易廳", level: 1, ownerKey: "pink", price: 890, trend: "down" },
  { id: 7, region: "AURORA", name: "金融新創街", level: 0, ownerKey: null, price: 640, trend: "flat" },
  { id: 8, region: "AURORA", name: "藍籌基金會", level: 3, ownerKey: "pink", price: 1860, trend: "up" },

  { id: 9, region: "SPECTRA", name: "Gemini 研發處", level: 3, ownerKey: "cyan", price: 1540, trend: "up" },
  { id: 10, region: "SPECTRA", name: "總圖資料庫中心", level: 1, ownerKey: "pink", price: 840, trend: "down" },
  { id: 11, region: "SPECTRA", name: "科技大樓", level: 0, ownerKey: null, price: 760, trend: "flat" },
  { id: 12, region: "SPECTRA", name: "AI算力中心", level: 2, ownerKey: "black", price: 1430, trend: "up" },
  { id: 13, region: "SPECTRA", name: "資訊安全局", level: 1, ownerKey: "cyan", price: 930, trend: "flat" },
  { id: 14, region: "SPECTRA", name: "雲端節點", level: 2, ownerKey: "rose", price: 1160, trend: "down" },
  { id: 15, region: "SPECTRA", name: "演算法工坊", level: 3, ownerKey: "cyan", price: 1680, trend: "up" },
  { id: 16, region: "SPECTRA", name: "數據湖", level: 0, ownerKey: null, price: 690, trend: "flat" },

  { id: 17, region: "EMBER", name: "NVIDIA 台灣分公司", level: 3, ownerKey: "rose", price: 2200, trend: "up" },
  { id: 18, region: "EMBER", name: "水源貨櫃碼頭", level: 2, ownerKey: "rose", price: 1460, trend: "flat" },
  { id: 19, region: "EMBER", name: "台電大樓", level: 1, ownerKey: "cyan", price: 920, trend: "down" },
  { id: 20, region: "EMBER", name: "供應鏈總部", level: 2, ownerKey: "black", price: 1510, trend: "up" },
  { id: 21, region: "EMBER", name: "熱血物流站", level: 0, ownerKey: null, price: 720, trend: "flat" },
  { id: 22, region: "EMBER", name: "半導體倉庫", level: 3, ownerKey: "rose", price: 1940, trend: "down" },
  { id: 23, region: "EMBER", name: "製造實驗室", level: 1, ownerKey: "pink", price: 1050, trend: "up" },
  { id: 24, region: "EMBER", name: "工程競技場", level: 2, ownerKey: "rose", price: 1380, trend: "flat" },

  { id: 25, region: "HAVEN", name: "博雅療養院", level: 2, ownerKey: "pink", price: 1280, trend: "up" },
  { id: 26, region: "HAVEN", name: "大安森林公園", level: 0, ownerKey: null, price: 740, trend: "flat" },
  { id: 27, region: "HAVEN", name: "太子學舍", level: 1, ownerKey: "cyan", price: 810, trend: "down" },
  { id: 28, region: "HAVEN", name: "城市商店街", level: 2, ownerKey: "black", price: 1190, trend: "up" },
  { id: 29, region: "HAVEN", name: "休閒旅宿", level: 1, ownerKey: "rose", price: 880, trend: "flat" },
  { id: 30, region: "HAVEN", name: "綠能花園", level: 3, ownerKey: "pink", price: 1570, trend: "up" },
  { id: 31, region: "HAVEN", name: "社群廣場", level: 0, ownerKey: null, price: 660, trend: "down" },
  { id: 32, region: "HAVEN", name: "保險服務處", level: 2, ownerKey: "cyan", price: 1110, trend: "flat" },
];

const MONOPOLY_TEAM: Partial<Record<RegionCode, OwnerKey>> = {
  AURORA: "pink",
  EMBER: "rose",
};

export function ProjectionAssetTablePreview() {
  return (
    <main className="min-h-dvh overflow-x-hidden p-4 text-slate-100">
      <div className="mx-auto flex max-w-[1780px] flex-col gap-5">
        <header className="rounded-[1.4rem] border border-white/10 bg-slate-950/70 px-5 py-4 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                PROJECTION PREVIEW
              </div>
              <h1 className="text-[clamp(1.8rem,3vw,3.4rem)] font-black leading-none tracking-tight">
                資產表 2×4 Mini-card 版型比較
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-400">
                這是靜態設計沙盒：每區 8 筆假資料、2 欄 × 4 列、不接 API、不修改正式投影頁。
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-right">
              <div className="text-xs font-black tracking-[0.22em] text-amber-200/80">
                GOAL
              </div>
              <div className="mt-1 text-sm font-black text-amber-100">
                mini-card 質感，2×4 降低直向密度
              </div>
            </div>
          </div>
        </header>

        {VARIANTS.map((variant) => (
          <PreviewVariantPanel key={variant.key} variant={variant} />
        ))}
      </div>
    </main>
  );
}

function PreviewVariantPanel({ variant }: { variant: PreviewVariant }) {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-4 shadow-xl shadow-slate-950/30 backdrop-blur">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black leading-none text-white">{variant.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{variant.subtitle}</p>
        </div>
        <p className="max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
          {variant.bestFor}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {REGIONS.map((region) => (
          <RegionPreview
            key={`${variant.key}-${region.code}`}
            variant={variant.key}
            region={region.code}
          />
        ))}
      </div>
    </section>
  );
}

function RegionPreview({
  variant,
  region,
}: {
  variant: PreviewVariant["key"];
  region: RegionCode;
}) {
  const ui = REGION_UI[region];
  const regionInfo = REGIONS.find((item) => item.code === region)!;
  const assets = PREVIEW_ASSETS.filter((asset) => asset.region === region);
  const monopolyOwner = MONOPOLY_TEAM[region];

  return (
    <article
      data-preview-region={region}
      data-preview-layout="2x4"
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 ${ui.panel}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
            <h3 className={`truncate text-xl font-black leading-none ${ui.text}`}>
              {regionInfo.name}
            </h3>
          </div>
        </div>
        {monopolyOwner ? (
          <span className={`inline-flex max-w-[10rem] items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-black ${ui.text}`}>
            <Crown className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{OWNERS[monopolyOwner].name}</span>
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-slate-400">
            競逐中
          </span>
        )}
      </div>

      {variant === "balanced" ? (
        <BalancedMiniCards assets={assets} />
      ) : variant === "ticket" ? (
        <TicketMiniCards assets={assets} accentClass={ui.text} />
      ) : (
        <DashboardMiniCards assets={assets} />
      )}
    </article>
  );
}

function BalancedMiniCards({ assets }: { assets: PreviewAsset[] }) {
  return (
    <ul className="grid grid-cols-2 grid-rows-4 gap-2">
      {assets.map((asset) => (
        <li
          key={asset.id}
          data-preview-asset-card={asset.id}
          className="min-h-[5.35rem] rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-[0.98rem] font-black leading-tight text-white">
              {asset.name}
            </span>
            <Price asset={asset} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <LevelDots level={asset.level} />
            <OwnerTag asset={asset} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TicketMiniCards({
  assets,
  accentClass,
}: {
  assets: PreviewAsset[];
  accentClass: string;
}) {
  return (
    <ul className="grid grid-cols-2 grid-rows-4 gap-2">
      {assets.map((asset) => (
        <li
          key={asset.id}
          data-preview-asset-card={asset.id}
          className="relative min-h-[5.35rem] overflow-hidden rounded-xl border border-white/10 bg-slate-950/55 py-2 pl-3.5 pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <span
            className={`absolute bottom-2 left-1 top-2 w-1 rounded-full ${accentClass} bg-current opacity-70`}
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-[0.92rem] font-black leading-tight text-slate-100">
              {asset.name}
            </span>
            <LevelBadge level={asset.level} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <OwnerTag asset={asset} compact />
            <Price asset={asset} large />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DashboardMiniCards({ assets }: { assets: PreviewAsset[] }) {
  return (
    <ul className="grid grid-cols-2 grid-rows-4 gap-2">
      {assets.map((asset) => (
        <li
          key={asset.id}
          data-preview-asset-card={asset.id}
          className="min-h-[5.65rem] rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2.5 shadow-[inset_0_0_22px_rgba(15,23,42,0.34)]"
        >
          <div className="flex items-center justify-between gap-2">
            <OwnerTag asset={asset} compact />
            <Price asset={asset} large />
          </div>
          <div className="mt-2 min-w-0 truncate text-[1.02rem] font-black leading-tight text-white">
            {asset.name}
          </div>
          <div className="mt-1.5">
            <LevelDots level={asset.level} muted />
          </div>
        </li>
      ))}
    </ul>
  );
}

function OwnerTag({
  asset,
  compact = false,
}: {
  asset: PreviewAsset;
  compact?: boolean;
}) {
  const owner = asset.ownerKey ? OWNERS[asset.ownerKey] : null;
  const label = owner?.name ?? "未售出";
  const style: CSSProperties = owner
    ? {
        borderColor: `${owner.ring}99`,
        background: asset.ownerKey === "black" ? owner.color : `${owner.color}26`,
        color: asset.ownerKey === "black" ? owner.text : owner.ring,
      }
    : {
        borderColor: "rgba(148, 163, 184, 0.18)",
        background: "rgba(15, 23, 42, 0.72)",
        color: "rgba(203, 213, 225, 0.78)",
      };

  return (
    <span
      data-preview-owner-tag={label}
      className={`min-w-0 max-w-full truncate rounded-full border font-black leading-none ${
        compact ? "px-2 py-1 text-[0.64rem]" : "px-2.5 py-1 text-[0.68rem]"
      }`}
      title={label}
      style={style}
    >
      {label}
    </span>
  );
}

function LevelDots({
  level,
  muted = false,
}: {
  level: number;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1" title={`資產等級 ${level}`}>
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={`h-2 w-2 rounded-full border ${
            step <= level
              ? muted
                ? "border-cyan-200/70 bg-cyan-300/80"
                : "border-amber-200/70 bg-amber-300"
              : "border-slate-600/70 bg-slate-800/80"
          }`}
        />
      ))}
    </span>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[0.64rem] font-black leading-none text-slate-300">
      Lv.{level}
    </span>
  );
}

function Price({ asset, large = false }: { asset: PreviewAsset; large?: boolean }) {
  const tone =
    asset.trend === "up"
      ? "text-emerald-300"
      : asset.trend === "down"
        ? "text-rose-300"
        : "text-slate-100";

  return (
    <span
      className={`num shrink-0 font-black leading-none tabular-nums ${tone} ${
        large ? "text-[1.18rem]" : "text-[1.02rem]"
      }`}
    >
      {asset.price.toLocaleString("en-US")}
    </span>
  );
}
