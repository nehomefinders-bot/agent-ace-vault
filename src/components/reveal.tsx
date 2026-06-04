import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type ElementType } from "react";

type Direction = "up" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  as?: ElementType;
  duration?: number;
  once?: boolean;
}

const translateFor = (d: Direction) => {
  switch (d) {
    case "left":
      return "translate3d(-32px,0,0)";
    case "right":
      return "translate3d(32px,0,0)";
    case "up":
      return "translate3d(0,24px,0)";
    default:
      return "translate3d(0,0,0)";
  }
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  as: Tag = "div",
  duration = 700,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, once]);

  const style: CSSProperties = reduced
    ? {}
    : {
        transitionProperty: "opacity, transform",
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : translateFor(direction),
      };

  const Comp = Tag as any;
  return (
    <Comp ref={ref as any} className={className} style={style}>
      {children}
    </Comp>
  );
}
