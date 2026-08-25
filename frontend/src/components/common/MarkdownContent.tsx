import ReactMarkdown from "react-markdown"
import type { ReactElement } from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const components: Record<string, (props: any) => ReactElement> = {
  h1: (props: any) => <h1 className="mb-1.5 mt-2 text-base font-semibold text-ink-primary first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="mb-1.5 mt-2 text-sm font-semibold text-ink-primary first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="mb-1 mt-1.5 text-sm font-semibold text-ink-primary first:mt-0" {...props} />,
  p: (props: any) => <p className="mb-1.5 last:mb-0" {...props} />,
  ul: (props: any) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5 last:mb-0" {...props} />,
  ol: (props: any) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5 last:mb-0" {...props} />,
  li: (props: any) => <li className="pl-0.5" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-ink-primary" {...props} />,
  a: (props: any) => <a className="text-accent-700 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
  code: (props: any) => <code className="rounded bg-background px-1 py-0.5 text-xs font-mono text-ink-primary" {...props} />,
  pre: (props: any) => <pre className="mb-1.5 overflow-x-auto rounded-md bg-background p-2 text-xs last:mb-0" {...props} />,
  blockquote: (props: any) => <blockquote className="mb-1.5 border-l-2 border-border pl-2 text-ink-secondary last:mb-0" {...props} />,
  hr: () => <hr className="my-2 border-border" />,
}

export function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>
}
