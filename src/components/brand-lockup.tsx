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
  badge?: boolean;
};

export function BrandLockup({
  className,
  logoClassName,
  textClassName,
  titleClassName,
  taglineClassName,
  showTagline = true,
  variant = "auto",
  badge = false,
}: BrandLockupProps) {
  const isDark = variant === "dark";
  const alt = `${BRAND_TITLE} ${BRAND_TAGLINE}`;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {badge ? (
        <div
          className={cn(
            "shrink-0 rounded-full bg-white p-1.5 shadow-md flex items-center justify-center",
            logoClassName,
          )}
        >
          <img
            src={logo.url}
            alt={alt}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <img
          src={logo.url}
          alt={alt}
          className={cn(
            "h-12 w-12 shrink-0 rounded-xl object-contain",
            logoClassName,
          )}
        />
      )}

      <div className={cn("min-w-0", textClassName)}>
        <div
          className={cn(
            "whitespace-nowrap font-display text-lg font-bold leading-none",
            isDark || badge ? "text-white" : "text-[#0c2340] dark:text-white",
            titleClassName,
          )}
        >
          {BRAND_TITLE}
        </div>
        {showTagline ? (
          <div
            className={cn(
              "mt-1.5 text-xs font-medium tracking-[0.08em]",
              isDark || badge
                ? "text-[#D99A26]"
                : "text-amber-600 dark:text-amber-400",
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
