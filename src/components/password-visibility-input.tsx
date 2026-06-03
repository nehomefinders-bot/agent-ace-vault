import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const PASSWORD_REVEAL_MS = 3000;

type PasswordVisibilityInputProps = Omit<ComponentProps<"input">, "type">;

export function PasswordVisibilityInput({
  className,
  disabled,
  ...props
}: PasswordVisibilityInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearRevealTimer() {
    if (!revealTimerRef.current) return;
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }

  function hidePassword() {
    clearRevealTimer();
    setIsVisible(false);
  }

  function togglePasswordVisibility() {
    if (isVisible) {
      hidePassword();
      return;
    }

    clearRevealTimer();
    setIsVisible(true);
    revealTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      revealTimerRef.current = null;
    }, PASSWORD_REVEAL_MS);
  }

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  const Icon = isVisible ? EyeOff : Eye;

  return (
    <>
      <input
        {...props}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        className={cn(className, "pr-11")}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        disabled={disabled}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
}
