import { Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Mail, MessageCircleQuestion, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

const SUPPORT_EMAIL = "livingandlearningwithjackie@gmail.com";
const SUPPORT_PHONE = "+15086824440";
const SUPPORT_SUBJECT = encodeURIComponent("Need help with Agent Business Tracker");
const SUPPORT_BODY = encodeURIComponent(
  "Hi team,\n\nI need help with the tracker.\n\nWhat I was trying to do:\n- \n\nWhat happened instead:\n- \n\nPage or feature:\n- \n\nThanks!",
);

export function SupportFab() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      aria-label="Open support"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-4 py-3 text-sm font-medium text-foreground shadow-[0_12px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-primary/45 hover:bg-card md:bottom-6 md:right-6"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
        <LifeBuoy className="h-4 w-4" />
      </span>
      <span>Support</span>
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="rounded-t-[1.75rem] border-border/80 bg-background/98 backdrop-blur-xl">
          <DrawerHeader className="px-5 pt-5">
            <DrawerTitle className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                <MessageCircleQuestion className="h-4 w-4" />
              </span>
              Need help?
            </DrawerTitle>
            <DrawerDescription>
              Reach our team directly or open the full support hub if something feels confusing.
            </DrawerDescription>
          </DrawerHeader>
          <SupportFabActions onAction={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-[22rem] rounded-[1.5rem] border-border/80 bg-popover/98 p-5 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
            <MessageCircleQuestion className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Need help?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reach our team directly or open the support hub if you get stuck anywhere in the tracker.
            </p>
          </div>
        </div>
        <SupportFabActions onAction={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function SupportFabActions({ onAction }: { onAction: () => void }) {
  return (
    <div className="space-y-3 px-5 pb-5 sm:px-0 sm:pb-0">
      <div className="grid gap-2">
        <Button
          asChild
          className="w-full justify-start rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${SUPPORT_SUBJECT}&body=${SUPPORT_BODY}`}
            onClick={onAction}
          >
            <Mail className="h-4 w-4" />
            Email support
          </a>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full justify-start rounded-xl border-border bg-background/70 hover:bg-muted"
        >
          <a href={`tel:${SUPPORT_PHONE}`} onClick={onAction}>
            <Phone className="h-4 w-4" />
            Call support
          </a>
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          asChild
          variant="ghost"
          className="justify-start rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Link to="/help" onClick={onAction}>
            <BookOpen className="h-4 w-4" />
            Help guides
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="justify-start rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Link to="/support" onClick={onAction}>
            <LifeBuoy className="h-4 w-4" />
            Support hub
          </Link>
        </Button>
      </div>
    </div>
  );
}
