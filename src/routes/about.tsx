import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [{ title: "About Us — Pineapple Xpress" }],
  }),
  component: AboutPage,
});

// About page content only. It renders in the root layout's <Outlet />, in the
// same spot as the home page's store cards, so header/nav/hero stay put.
function AboutPage() {
  return (
    <div className="animate-drift-up mt-12 w-full max-w-2xl text-foreground">
      <h2 className="font-display text-5xl text-gold">About Pineapple Xpress</h2>
      <p className="mt-4 text-muted-foreground">
        Learn more about our team, delivery service, and storefront location.
      </p>
    </div>
  );
}
