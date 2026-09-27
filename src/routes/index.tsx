import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MapPin, ShoppingBag } from "lucide-react";
import heroPoster from "@/assets/hero-poster.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xpress Smoke Shop — Pineapple Xpress & NIC Vineland" },
      {
        name: "description",
        content:
          "Order online from Pineapple Xpress or visit NIC Vineland at 1381 West Landis Ave, Vineland, NJ.",
      },
      {
        property: "og:title",
        content: "Xpress Smoke Shop — Pineapple Xpress & NIC Vineland",
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

const orderOnlineHref = stores[0]?.action.href ?? "https://www.quickvee.com/merchant/FAW222628NJ?orderMethod=pickup";

function Index() {
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
            XPRESS
            <span className="text-gold"> SMOKE SHOP</span>
          </span>
          <a
            href={stores[0].action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gold/40 bg-card px-5 py-2 text-sm font-semibold uppercase tracking-wider text-gold-soft backdrop-blur-md transition-colors hover:bg-gold/15"
          >
            Order Online
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p
            className="animate-drift-up text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground sm:text-sm"
            style={{ animationDelay: "0.1s" }}
          >
            Vineland, New Jersey
          </p>
          <h1
            className="font-display animate-drift-up text-glow-gold mt-4 text-6xl leading-none text-foreground sm:text-8xl lg:text-9xl"
            style={{ animationDelay: "0.25s" }}
          >
            One shop.
            <br />
            <span className="text-gold">Two ways to stock up.</span>
          </h1>
          <p
            className="animate-drift-up mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "0.4s" }}
          >
            Premium vapes, disposables, and smoke shop essentials — delivered
            online or waiting for you at the counter.
          </p>

          <div className="mt-12 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
            {stores.map((store, i) => (
              <a
                key={store.name}
                href={store.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="animate-drift-up group rounded-3xl border border-border bg-card p-8 text-left shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:bg-accent/40"
                style={{ animationDelay: `${0.55 + i * 0.15}s` }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gold-soft">
                    {store.tagline}
                  </span>
                  {i === 0 ? (
                    <ShoppingBag className="animate-ember-pulse h-5 w-5 text-gold" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gold" />
                  )}
                </div>
                <h2 className="font-display mt-5 text-4xl text-foreground">
                  {store.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {store.description}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold transition-all group-hover:gap-3">
                  {store.action.label}
                  <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </main>

        <footer className="px-6 pb-8 text-center sm:px-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
            © 2026 Xpress Smoke Shop · Vineland, NJ
          </p>
        </footer>
      </div>
    </div>
  );
}
