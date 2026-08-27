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
      <img
        src={logo.url}
        alt={alt}
        className={cn(
          "aspect-square h-12 w-auto shrink-0 object-contain",
          logoClassName,
        )}
      />

      {showTagline ? (
        <div className={cn("min-w-0", textClassName)}>
          <div
            className={cn(
              "whitespace-nowrap text-xs font-medium tracking-[0.08em]",
              isDark || badge
                ? "text-[#D99A26]"
                : "text-amber-600 dark:text-amber-400",
              taglineClassName,
            )}
          >
            {BRAND_TAGLINE}
          </div>
        </div>
      ) : null}
    </div>
  );
}
