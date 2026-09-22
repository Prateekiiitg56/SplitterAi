import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

/**
 * MarkdownRenderer — renders agent markdown output with proper
 * typography, code blocks, lists, tables, and spacing.
 */

interface MarkdownRendererProps {
  content: string
  className?: string
}

const components: Components = {
  /* ── Headings ──────────────────────────────────────────────────── */
  h1: ({ children }) => (
    <h1 className="md-h1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="md-h2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="md-h3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="md-h4">{children}</h4>
  ),

  /* ── Paragraph ─────────────────────────────────────────────────── */
  p: ({ children }) => (
    <p className="md-p">{children}</p>
  ),

  /* ── Lists ─────────────────────────────────────────────────────── */
  ul: ({ children }) => (
    <ul className="md-ul">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="md-ol">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="md-li">{children}</li>
  ),

  /* ── Code ───────────────────────────────────────────────────────── */
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      const lang = className?.replace('language-', '') || ''
      return (
        <div className="md-code-block">
          {lang && <span className="md-code-lang">{lang}</span>}
          <pre className="md-pre">
            <code className="md-code-content">{children}</code>
          </pre>
        </div>
      )
    }
    return <code className="md-inline-code" {...props}>{children}</code>
  },
  pre: ({ children }) => <>{children}</>,

  /* ── Blockquote ─────────────────────────────────────────────────── */
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),

  /* ── Horizontal rule ───────────────────────────────────────────── */
  hr: () => <hr className="md-hr" />,

  /* ── Table ──────────────────────────────────────────────────────── */
  table: ({ children }) => (
    <div className="md-table-wrap">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="md-thead">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="md-th">{children}</th>
  ),
  td: ({ children }) => (
    <td className="md-td">{children}</td>
  ),

  /* ── Links ──────────────────────────────────────────────────────── */
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
      {children}
    </a>
  ),

  /* ── Strong / Em ────────────────────────────────────────────────── */
  strong: ({ children }) => (
    <strong className="md-strong">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="md-em">{children}</em>
  ),
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`md-body ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
