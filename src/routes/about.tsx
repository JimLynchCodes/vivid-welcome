import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [{ title: "About Us — Pineapple Xpress" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10">
      <h1 className="font-display text-5xl text-gold">About Pineapple Xpress</h1>
      <p className="mt-4 text-muted-foreground">
        Learn more about our team, delivery service, and storefront location.
      </p>
    </div>
  );
}