import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="chat-md prose prose-invert max-w-none text-[15px] leading-relaxed text-foreground/95">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
          code: ({ children, className }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-gold-soft">
                  {children}
                </code>
              );
            }
            return (
              <code className="block overflow-x-auto rounded-xl bg-black/40 p-3 text-sm">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
