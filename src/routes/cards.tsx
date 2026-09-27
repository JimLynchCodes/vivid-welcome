import { ExternalLink, MapPin, ShoppingBag } from 'lucide-react';
import React from 'react';

interface CardsProps {
  stores: any;
}

export default function Cards({ stores }: CardsProps) {
  return (
    <div>
      <div className="mt-12 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
            {stores.map((store: any, i: number) => (
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
    </div>
  );
}