// ============================================================
//  FeedHope — Dashboard AI Chatbot (Gemini Flash)
//  Role-aware in-app assistant. Mounted inside each dashboard
//  (Donor, Receiver, Volunteer, Admin). Talks to /api/ai/chat
//  which feeds the user's live data snapshot to Gemini.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import '../../Styles/DashboardChatbot.css';

import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const API_BASE = 'http://localhost:5000';

// AI robot SVG — same one used on the public landing chatbot.
const RobotLogo = ({ size = 24 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <line x1="16" y1="3" x2="16" y2="7" />
        <circle cx="16" cy="3" r="1.6" fill="currentColor" stroke="none" />
        <rect x="6" y="7" width="20" height="17" rx="5" />
        <circle cx="11.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <line x1="12" y1="20" x2="20" y2="20" />
        <line x1="3" y1="14" x2="3" y2="17" />
        <line x1="29" y1="14" x2="29" y2="17" />
        <path
            d="M26.4 4.2 L26.9 5.5 L28.2 6 L26.9 6.5 L26.4 7.8 L25.9 6.5 L24.6 6 L25.9 5.5 Z"
            fill="currentColor"
            stroke="none"
        />
    </svg>
);

// Suggested prompts shown as chips on first open. Tailored per role
// to match what the dashboard data exposes.
const ROLE_SUGGESTIONS = {
    Donor: [
        'How many offers have I delivered?',
        'Summarize my recent activity',
        'What are my pending offers?',
        'How do I post a new offer?',
    ],
    Receiver: [
        'How many available offers right now?',
        'What did I accept recently?',
        'How do I browse offers?',
        'How do delivery requests work?',
    ],
    Volunteer: [
        'Do I have pending requests?',
        'How many deliveries have I completed?',
        'How do I accept a delivery?',
        'Where do I see my schedule?',
    ],
    Admin: [
        'Summarize platform activity',
        'How many offers are expiring soon?',
        'How much money has been distributed?',
        'Where can I manage users?',
    ],
};

const ROLE_GREETING = {
    Donor: "Hi! I'm HopeBot — your assistant for managing donations. Ask me about your offers, history, or how to use any page.",
    Receiver: "Hi! I'm HopeBot — your assistant for browsing and accepting offers. Ask me about available food, your accepted offers, or any feature.",
    Volunteer: "Hi! I'm HopeBot — your delivery assistant. Ask me about pending requests, your delivery history, or how to accept jobs.",
    Admin: "Hi! I'm HopeBot — your admin assistant. Ask me about platform stats, alerts, money flows, or any management page.",
};

// Tiny markdown-ish formatter: bullets + bold. Keeps replies readable
// without pulling a real markdown lib.
const formatReply = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const blocks = [];
    let listBuffer = [];

    const flushList = () => {
        if (listBuffer.length) {
            blocks.push(
                <ul key={`ul-${blocks.length}`}>
                    {listBuffer.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
                </ul>
            );
            listBuffer = [];
        }
    };

    const renderInline = (s) => {
        // Replace **bold** with <strong>
        const parts = [];
        let rest = s;
        let key = 0;
        while (rest.length) {
            const m = rest.match(/\*\*([^*]+)\*\*/);
            if (!m) { parts.push(<span key={key++}>{rest}</span>); break; }
            const before = rest.slice(0, m.index);
            if (before) parts.push(<span key={key++}>{before}</span>);
            parts.push(<strong key={key++}>{m[1]}</strong>);
            rest = rest.slice(m.index + m[0].length);
        }
        return parts;
    };

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bullet) {
            listBuffer.push(bullet[1]);
        } else {
            flushList();
            if (trimmed) {
                blocks.push(<p key={`p-${idx}`}>{renderInline(trimmed)}</p>);
            }
        }
    });
    flushList();
    return blocks;
};

const DashboardChatbot = ({ role }) => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    // messages: array of { from: 'bot' | 'user', text, key }
    const [messages, setMessages] = useState([
        { from: 'bot', text: ROLE_GREETING[role] || ROLE_GREETING.Donor, key: 'greet' },
    ]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, busy, open]);

    // Focus input when panel opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [open]);

    const handleReset = () => {
        setMessages([{ from: 'bot', text: ROLE_GREETING[role] || ROLE_GREETING.Donor, key: `greet-${Date.now()}` }]);
        setError(null);
    };

    const sendMessage = async (text) => {
        const msg = (text || '').trim();
        if (!msg || busy) return;
        setError(null);

        // Push user message immediately for snappy UX.
        const userKey = `u-${Date.now()}`;
        setMessages(prev => [...prev, { from: 'user', text: msg, key: userKey }]);
        setInput('');
        setBusy(true);

        try {
            const stored = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
            const userId = stored.user_id;

            // Send last 6 turns as context (excluding the greeting).
            const history = messages
                .filter(m => m.key !== 'greet' && !String(m.key).startsWith('greet-'))
                .slice(-6)
                .map(m => ({
                    role: m.from === 'bot' ? 'model' : 'user',
                    text: m.text,
                }));

            const res = await fetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role, message: msg, history }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'AI request failed.');
                setMessages(prev => [...prev, {
                    from: 'bot',
                    text: data.error || "Sorry, I couldn't reach the AI service.",
                    key: `e-${Date.now()}`,
                }]);
            } else {
                setMessages(prev => [...prev, {
                    from: 'bot',
                    text: data.reply || "I don't have an answer for that.",
                    key: `b-${Date.now()}`,
                }]);
            }
        } catch (err) {
            setError('Network error.');
            setMessages(prev => [...prev, {
                from: 'bot',
                text: 'Network error — please try again in a moment.',
                key: `e-${Date.now()}`,
            }]);
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const suggestions = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.Donor;
    const showSuggestions = messages.length === 1; // only greeting present

    return (
        <>
            {/* Floating launcher */}
            <button
                type="button"
                className={`dcb-launcher dcb-launcher--${(role || '').toLowerCase()} ${open ? 'dcb-launcher--open' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close assistant' : 'Open assistant'}
            >
                {open ? <CloseIcon /> : <RobotLogo size={28} />}
            </button>

            {open && (
                <div className={`dcb-panel dcb-panel--${(role || '').toLowerCase()}`} role="dialog" aria-label="HopeBot assistant">
                    <header className="dcb-header">
                        <AutoAwesomeIcon className="dcb-header-sparkle dcb-header-sparkle--1" sx={{ fontSize: 14 }} />
                        <AutoAwesomeIcon className="dcb-header-sparkle dcb-header-sparkle--2" sx={{ fontSize: 10 }} />

                        <div className="dcb-header-brand">
                            <div className="dcb-header-avatar">
                                <RobotLogo size={26} />
                                <span className="dcb-status-dot" aria-hidden="true" />
                            </div>
                            <div className="dcb-header-text">
                                <strong>
                                    HopeBot
                                    <AutoAwesomeIcon sx={{ fontSize: 13, marginLeft: '4px', verticalAlign: '-1px' }} />
                                </strong>
                                <span>AI assistant · {role}</span>
                            </div>
                        </div>
                        <div className="dcb-header-actions">
                            <button
                                type="button"
                                className="dcb-icon-btn"
                                onClick={handleReset}
                                aria-label="Reset"
                                title="Reset"
                            >
                                <RestartAltIcon sx={{ fontSize: 18 }} />
                            </button>
                            <button
                                type="button"
                                className="dcb-icon-btn"
                                onClick={() => setOpen(false)}
                                aria-label="Close"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>
                    </header>

                    <div className="dcb-messages" ref={scrollRef}>
                        {messages.map(m => (
                            <div key={m.key} className={`dcb-msg dcb-msg--${m.from}`}>
                                <div className="dcb-bubble">
                                    {m.from === 'bot' ? formatReply(m.text) : m.text}
                                </div>
                            </div>
                        ))}
                        {busy && (
                            <div className="dcb-msg dcb-msg--bot">
                                <div className="dcb-bubble dcb-bubble--typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                    </div>

                    {showSuggestions && (
                        <div className="dcb-suggestions">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="dcb-suggestion"
                                    disabled={busy}
                                    onClick={() => sendMessage(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <form className="dcb-input-row" onSubmit={handleSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            className="dcb-input"
                            placeholder="Ask me anything…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={busy}
                            maxLength={500}
                        />
                        <button
                            type="submit"
                            className="dcb-send-btn"
                            disabled={busy || !input.trim()}
                            aria-label="Send"
                        >
                            <SendIcon sx={{ fontSize: 18 }} />
                        </button>
                    </form>
                    {error && <div className="dcb-error">{error}</div>}
                </div>
            )}
        </>
    );
};

export default DashboardChatbot;
