import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, MapPin, ShoppingBag } from "lucide-react";
import heroPoster from "@/assets/hero-poster.jpg";
import { useState } from "react";
import Cards from "./cards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pineapple Xpress — Pineapple Xpress & NIC Vineland" },
      {
        name: "description",
        content:
          "Order online from Pineapple Xpress or visit NIC Vineland at 1381 West Landis Ave, Vineland, NJ.",
      },
      {
        property: "og:title",
        content: "Pineapple Xpress — Pineapple Xpress & NIC Vineland",
      },
      {
        property: "og:description",
        content:
          "Order online from Pineapple Xpress or visit NIC Vineland at 1381 West Landis Ave, Vineland, NJ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stores = [
  {
    name: "Pineapple Xpress",
    tagline: "Online Exclusive",
    description:
      "Premium nicotine vapes and disposables from the most trusted brands — shipped straight to your door.",
    action: {
      label: "Order Online",
      href: "https://www.quickvee.com/merchant/FAW222628NJ?orderMethod=pickup",
      external: true,
    },
  },
  {
    name: "NIC Vineland",
    tagline: "Visit the Shop",
    description:
      "1381 West Landis Ave, Vineland, NJ 08360 — stop in and browse the full lineup in person.",
    action: {
      label: "Get Directions",
      href: "https://www.google.com/maps/dir/?api=1&destination=1381+West+Landis+Ave,+Vineland,+NJ+08360",
      external: true,
    },
  },
];

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
];

const orderOnlineHref =
  stores[0]?.action.href ??
  "https://www.quickvee.com/merchant/FAW222628NJ?orderMethod=pickup";

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background media layer — swap in a looping <video> here when the clip is ready */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={heroPoster}
          alt=""
          aria-hidden="true"
          className="animate-kenburns h-full w-full object-cover"
        />
      </div>

      {/* Slightly transparent charcoal overlay */}
      <div className="overlay-wash absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <span className="font-display text-2xl tracking-widest text-foreground">
            Pineapple&nbsp;
            <span className="text-gold">Xpress</span>
          </span>

          <>
            {/* Desktop Navigation Links */}
            <div className="hidden items-center gap-4 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="rounded-full border border-gold/40 bg-card px-5 py-2 text-sm font-semibold uppercase tracking-wider text-gold-soft backdrop-blur-md transition-colors hover:bg-gold/15"
                  activeProps={{
                    className: "border-gold bg-gold/20 text-gold",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-card text-gold-soft backdrop-blur-md transition-colors hover:bg-gold/15 sm:hidden"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Mobile Side Drawer Menu & Overlay */}
            <div
              className={`fixed inset-0 z-50 transition-opacity duration-300 sm:hidden ${
                isMenuOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              {/* Dark Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Side Menu Drawer */}
              <aside
                className={`absolute top-0 right-0 bottom-0 w-72 border-l border-gold/30 bg-card/95 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
                  isMenuOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                {/* Header inside drawer */}
                <div className="flex items-center justify-between border-b border-gold/20 pb-6">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gold-soft">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close menu"
                    className="rounded-full p-1 text-gold-soft transition-colors hover:bg-gold/15"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Navigation Links inside side drawer */}
                <nav className="mt-8 flex flex-col gap-3">
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="rounded-xl border border-gold/30 bg-card px-5 py-3 text-center text-sm font-semibold uppercase tracking-wider text-gold-soft transition-colors hover:bg-gold/20 active:scale-95"
                      activeProps={{
                        className: "border-gold bg-gold/20 text-gold",
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          </>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p
            className="animate-drift-up text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground sm:text-sm"
            style={{ animationDelay: "0.1s" }}
          >
            The best delivery service in New Jersey.
          </p>
          <h1
            className="font-display animate-drift-up text-glow-gold mt-4 flex flex-col text-6xl leading-none text-foreground sm:flex-row sm:gap-x-6 sm:text-8xl lg:text-9xl"
            style={{ animationDelay: "0.25s" }}
          >
            <span>Challenge</span>
            <span className="text-gold">Accepted.</span>
          </h1>
          <p
            className="animate-drift-up mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "0.4s" }}
          >
            Premium vapes, disposables, and smoke shop essentials — delivered
            online or waiting for you at the counter.
          </p>

          <Cards stores={stores}/>
        </main>

        <footer className="px-6 pb-8 text-center sm:px-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
            © 2026 Pineapple Xpress · Vineland, NJ
          </p>
        </footer>
      </div>
    </div>
  );
}