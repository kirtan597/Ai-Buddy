"use client";

import React, { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

// ── Code block with language badge + copy button ──────────────────────────────
function CodeBlock({ language, children }: { language: string; children: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-gray-700/60 shadow-lg">
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e2e] border-b border-gray-700/50">
                <span className="text-[10px] md:text-[11px] font-mono font-semibold text-violet-400 uppercase tracking-widest select-none">
                    {language || "text"}
                </span>
                <button
                    onClick={copy}
                    className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] font-medium text-gray-400 hover:text-white transition-colors px-2 py-0.5 rounded-md hover:bg-white/10 touch-manipulation"
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code — scroll horizontally on mobile, never overflow the bubble */}
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                <SyntaxHighlighter
                    style={oneDark}
                    language={language || "text"}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        padding: "0.875rem 1rem",
                        fontSize: "12px",
                        lineHeight: "1.65",
                        background: "#1a1b2e",
                        minWidth: "100%",
                        width: "max-content",
                    }}
                    codeTagProps={{
                        style: { fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace" },
                    }}
                    showLineNumbers={children.split("\n").length > 5}
                    lineNumberStyle={{
                        color: "#4b5563",
                        minWidth: "2em",
                        paddingRight: "0.75em",
                        userSelect: "none",
                        fontSize: "11px",
                    }}
                >
                    {children}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

// ── Inline code ──────────────────────────────────────────────────────────────
function InlineCode({ children }: { children: React.ReactNode }) {
    return (
        <code className="px-1 py-0.5 md:px-1.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-mono text-[0.82em] border border-violet-200 dark:border-violet-700/50 break-all">
            {children}
        </code>
    );
}

// ── The full renderer ─────────────────────────────────────────────────────────
interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
    content,
    className = "",
}: MarkdownRendererProps) {
    return (
        <div className={`prose-ai w-full min-w-0 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // ── Headings ──
                    h1: ({ children }) => (
                        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1.5">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-1">
                            {children}
                        </h4>
                    ),

                    // ── Paragraph ──
                    p: ({ children }) => (
                        <p className="my-1.5 leading-6 md:leading-7 text-gray-800 dark:text-gray-200 first:mt-0 last:mb-0 break-words">
                            {children}
                        </p>
                    ),

                    // ── Code blocks ──
                    code({ className, children }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const raw = String(children).replace(/\n$/, "");
                        const isBlock = match || raw.includes("\n");

                        if (isBlock) {
                            return <CodeBlock language={match ? match[1] : ""}>{raw}</CodeBlock>;
                        }
                        return <InlineCode>{children}</InlineCode>;
                    },

                    // ── Blockquote ──
                    blockquote: ({ children }) => (
                        <blockquote className="my-2 md:my-3 pl-3 md:pl-4 border-l-4 border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 rounded-r-lg py-1.5 md:py-2 pr-2 md:pr-3 text-gray-700 dark:text-gray-300 italic text-sm">
                            {children}
                        </blockquote>
                    ),

                    // ── Lists ──
                    ul: ({ children }) => (
                        <ul className="my-1.5 md:my-2 ml-0.5 space-y-1 list-none">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-1.5 md:my-2 ml-0.5 space-y-1 list-none">
                            {children}
                        </ol>
                    ),
                    li: ({ children }: React.LiHTMLAttributes<HTMLLIElement>) => {
                        const childArray = Array.isArray(children) ? children : [children];
                        const hasCheckbox = (childArray as React.ReactElement[]).some(
                            (child) => {
                                const el = child as React.ReactElement<{ type?: string }>;
                                return el?.props?.type === "checkbox";
                            }
                        );

                        if (hasCheckbox) {
                            return (
                                <li className="flex items-start gap-2 text-gray-800 dark:text-gray-200 py-0.5 text-sm md:text-base">
                                    {children}
                                </li>
                            );
                        }

                        return (
                            <li className="flex items-start gap-2 text-gray-800 dark:text-gray-200 py-0.5 text-sm md:text-base">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                                <span className="flex-1 min-w-0 break-words">{children}</span>
                            </li>
                        );
                    },

                    // ── Checkbox (task list) ──
                    input: ({ type, checked }: { type?: string; checked?: boolean }) => {
                        if (type === "checkbox") {
                            return (
                                <span
                                    className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 inline-flex items-center justify-center ${checked
                                            ? "bg-violet-500 border-violet-500 text-white"
                                            : "border-gray-400 dark:border-gray-500"
                                        }`}
                                >
                                    {checked && (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
                                            <path
                                                d="M1.5 5l2.5 2.5 4.5-4.5"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </span>
                            );
                        }
                        return null;
                    },

                    // ── Table — horizontally scrollable on mobile ──
                    table: ({ children }) => (
                        <div className="my-3 md:my-4 w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm -webkit-overflow-scrolling-touch">
                            <table className="text-xs md:text-sm border-collapse" style={{ minWidth: "100%" }}>
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-violet-50 dark:bg-violet-900/30">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 md:px-4 py-2 md:py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 md:px-4 py-2 md:py-2.5 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap">
                            {children}
                        </td>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {children}
                        </tr>
                    ),

                    // ── Horizontal rule ──
                    hr: () => <hr className="my-3 md:my-4 border-gray-200 dark:border-gray-700" />,

                    // ── Links ──
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 decoration-violet-300 dark:decoration-violet-600 font-medium transition-colors break-all"
                        >
                            {children}
                        </a>
                    ),

                    // ── Images ──
                    img: ({ src, alt }) => (
                        <span className="block my-2 md:my-3">
                            <img
                                src={src}
                                alt={alt || ""}
                                className="max-w-full w-auto rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
                                style={{ maxHeight: "360px" }}
                                loading="lazy"
                            />
                            {alt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block text-center italic">
                                    {alt}
                                </span>
                            )}
                        </span>
                    ),

                    // ── Strong / Em ──
                    strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
