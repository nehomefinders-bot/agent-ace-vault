import endlessProspectsLogo from "@/assets/endless-prospects-logo.png";
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
};

export function BrandLockup({
  className,
  logoClassName,
  textClassName,
  titleClassName,
  taglineClassName,
  showTagline = true,
}: BrandLockupProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src={endlessProspectsLogo}
        alt={`${BRAND_TITLE} ${BRAND_TAGLINE}`}
        className={cn(
          "h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-border",
          logoClassName,
        )}
      />
      <div className={cn("min-w-0", textClassName)}>
        <div
          className={cn(
            "whitespace-nowrap font-display text-lg font-bold leading-none text-white dark:text-white",
            titleClassName,
          )}
        >
          {BRAND_TITLE}
        </div>
        {showTagline ? (
          <div
            className={cn(
              "mt-1 text-[10px] tracking-[0.08em] text-amber-400",
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
