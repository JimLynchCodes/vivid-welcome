import { createFileRoute } from "@tanstack/react-router";

import Cards, { type Store } from "@/components/Cards";

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

const stores: Store[] = [
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

// Home page content: only the store cards. The shared header, nav, hero
// background, headline and footer live in the root layout (__root.tsx).
function Index() {
  return <Cards stores={stores} />;
}
