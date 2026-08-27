import logo from "@/assets/abt-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const BRAND_TITLE = "Agent Business Tracker";
export const BRAND_TAGLINE = "by Endless Prospects";

type BrandLockupProps = {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  titleClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
  variant?: "auto" | "light" | "dark";
};

export function BrandLockup({
  className,
  logoClassName,
  textClassName,
  titleClassName,
  taglineClassName,
  showTagline = true,
}: BrandLockupProps) {
  const imgBase = cn(
    "h-12 w-12 shrink-0 rounded-xl object-contain",
    logoClassName,
  );
  const alt = `${BRAND_TITLE} ${BRAND_TAGLINE}`;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <img src={logo.url} alt={alt} className={imgBase} />

      <div className={cn("min-w-0", textClassName)}>
        <div
          className={cn(
            "whitespace-nowrap font-display text-lg font-bold leading-none text-[#0c2340] dark:text-white",
            titleClassName,
          )}
        >
          {BRAND_TITLE}
        </div>
        {showTagline ? (
          <div
            className={cn(
              "mt-1.5 text-xs font-medium tracking-[0.08em] text-amber-600 dark:text-amber-400",
              taglineClassName,
            )}
          >
            {BRAND_TAGLINE}
          </div>
        ) : null}
      </div>
    </div>
  );
}
