import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function NavBar({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="flex h-14 items-center px-4 gap-3">
        {backTo ? (
          <Link
            to={backTo}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <div className="h-9 w-9" />
        )}
        <h1 className="font-display text-base font-semibold tracking-tight flex-1 text-center pr-9">
          {title}
        </h1>
      </div>
    </header>
  );
}
