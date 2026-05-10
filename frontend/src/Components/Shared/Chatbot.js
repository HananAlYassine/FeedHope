// ============================================================
//  FeedHope — Public landing-page chatbot widget.
//  Helps unauthenticated visitors learn about FeedHope and
//  decide to register. Should ONLY be mounted on LandingPage.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/Chatbot.css';

import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Custom AI robot logo — flat, clean, with a sparkle accent for the
// "AI assistant" feel. Uses currentColor so it adapts to its container.
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
        {/* Antenna */}
        <line x1="16" y1="3" x2="16" y2="7" />
        <circle cx="16" cy="3" r="1.6" fill="currentColor" stroke="none" />
        {/* Head */}
        <rect x="6" y="7" width="20" height="17" rx="5" />
        {/* Eyes */}
        <circle cx="11.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
        {/* Mouth */}
        <line x1="12" y1="20" x2="20" y2="20" />
        {/* Side ears */}
        <line x1="3" y1="14" x2="3" y2="17" />
        <line x1="29" y1="14" x2="29" y2="17" />
        {/* AI sparkle accent */}
        <path
            d="M26.4 4.2 L26.9 5.5 L28.2 6 L26.9 6.5 L26.4 7.8 L25.9 6.5 L24.6 6 L25.9 5.5 Z"
            fill="currentColor"
            stroke="none"
        />
    </svg>
);

// ── Predefined FAQ. Each question carries the bot's answer.
//    `answer` is JSX so we can include links/icons inline.
const FAQ = [
    {
        id: 'donor',
        q: 'How to register as a Donor?',
        a: (
            <>
                <p>Donors are individuals, restaurants, or stores who share surplus food with the community.</p>
                <ol>
                    <li>Click <strong>Sign In</strong> at the top, then choose <strong>Create Account</strong>.</li>
                    <li>Pick the <strong>Donor</strong> role and fill in your name, email, phone, and pickup address.</li>
                    <li>Verify your email — and you can post your first food offer right away.</li>
                </ol>
                <Link to="/donor-registration" className="cb-cta">Register as a Donor →</Link>
            </>
        ),
    },
    {
        id: 'receiver',
        q: 'How to register as a Receiver?',
        a: (
            <>
                <p>Receivers are NGOs, shelters, or families that browse and accept available food offers.</p>
                <ol>
                    <li>Open <strong>Sign In</strong> and select <strong>Create Account</strong>.</li>
                    <li>Choose the <strong>Receiver</strong> role and enter your organization details.</li>
                    <li>Once verified, you can browse offers, accept them, and arrange delivery.</li>
                </ol>
                <Link to="/receiver-registration" className="cb-cta">Register as a Receiver →</Link>
            </>
        ),
    },
    {
        id: 'volunteer',
        q: 'How to register as a Volunteer?',
        a: (
            <>
                <p>Volunteers handle pickups and deliveries — connecting donors and receivers in person.</p>
                <ol>
                    <li>Click <strong>Sign In</strong> → <strong>Create Account</strong>.</li>
                    <li>Choose the <strong>Volunteer</strong> role and add your contact + availability info.</li>
                    <li>Admins assign delivery requests; you accept or reject each one from your dashboard.</li>
                </ol>
                <Link to="/volunteer-registration" className="cb-cta">Register as a Volunteer →</Link>
            </>
        ),
    },
    {
        id: 'how',
        q: 'How the platform works?',
        a: (
            <>
                <p>FeedHope connects three roles in a simple loop:</p>
                <ul>
                    <li><strong>Donors</strong> post surplus food with quantity, pickup window, and expiry.</li>
                    <li><strong>Receivers</strong> browse available offers and accept the ones they need.</li>
                    <li><strong>Volunteers</strong> are assigned by admins to pick up the food and deliver it.</li>
                </ul>
                <p>Every step is tracked, so nothing goes to waste and everyone stays informed.</p>
                <Link to="/how-it-works" className="cb-cta">See the full flow →</Link>
            </>
        ),
    },
    {
        id: 'free',
        q: 'Is it free?',
        a: (
            <>
                <p><strong>Yes — FeedHope is 100% free</strong> for donors, receivers, and volunteers.</p>
                <p>We don't take a cut from donations. The platform runs on community goodwill and optional money donations from supporters who want to keep it that way.</p>
            </>
        ),
    },
    {
        id: 'food-types',
        q: 'What food can I donate?',
        a: (
            <>
                <p>You can donate any safe, edible surplus food, including:</p>
                <ul>
                    <li>Prepared meals (still fresh, properly stored)</li>
                    <li>Bakery items, dairy, beverages</li>
                    <li>Fruits, vegetables, grains</li>
                    <li>Sealed canned and packaged goods</li>
                </ul>
                <p>Always include the expiry date when posting — receivers rely on it to plan pickup.</p>
            </>
        ),
    },
    {
        id: 'safety',
        q: 'Food safety',
        a: (
            <>
                <p>Donors set the expiry date on every offer, and the platform automatically hides offers once they expire. Volunteers handle direct pickup so food doesn't sit in transit, and our admins monitor offers nearing expiry to assign delivery quickly.</p>
                <p>Donors are expected to follow standard food-handling guidelines (proper storage, clear labeling).</p>
            </>
        ),
    },
    {
        id: 'contact',
        q: 'Contact',
        a: (
            <>
                <p>Need to reach us directly? Here's how:</p>
                <ul className="cb-contact-list">
                    <li><strong>Phone:</strong> +961 71 829 730</li>
                    <li><strong>Email:</strong> admin@feedhope.com</li>
                    <li><strong>Location:</strong> Akkar, Lebanon (LIU Campus)</li>
                </ul>
                <Link to="/contact" className="cb-cta">Open the contact form →</Link>
            </>
        ),
    },
];

const WELCOME = (
    <>
        <p>Hi there 👋 I'm <strong>HopeBot</strong> — here to help you get started with FeedHope.</p>
        <p>Pick a question below, or browse the menu any time:</p>
    </>
);

const Chatbot = () => {
    const [open, setOpen] = useState(false);
    // messages: array of { from: 'bot' | 'user', content: ReactNode, key }
    const [messages, setMessages] = useState([{ from: 'bot', content: WELCOME, key: 'welcome' }]);
    const scrollRef = useRef(null);

    // Auto-scroll to the latest message whenever the list changes.
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const handleAsk = (item) => {
        setMessages(prev => [
            ...prev,
            { from: 'user', content: item.q, key: `u-${item.id}-${prev.length}` },
            { from: 'bot',  content: item.a, key: `b-${item.id}-${prev.length}` },
        ]);
    };

    const handleReset = () => {
        setMessages([{ from: 'bot', content: WELCOME, key: `welcome-${Date.now()}` }]);
    };

    return (
        <>
            {/* Floating launcher button */}
            <button
                type="button"
                className={`cb-launcher ${open ? 'cb-launcher--open' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close chat' : 'Open chat'}
            >
                {open ? <CloseIcon /> : <RobotLogo size={28} />}
            </button>

            {/* Chat panel */}
            {open && (
                <div className="cb-panel" role="dialog" aria-label="FeedHope assistant">
                    <header className="cb-header">
                        {/* Decorative AI sparkle accents in the header */}
                        <AutoAwesomeIcon className="cb-header-sparkle cb-header-sparkle--1" sx={{ fontSize: 14 }} />
                        <AutoAwesomeIcon className="cb-header-sparkle cb-header-sparkle--2" sx={{ fontSize: 10 }} />

                        <div className="cb-header-brand">
                            <div className="cb-header-avatar">
                                <RobotLogo size={26} />
                                <span className="cb-status-dot" aria-hidden="true" />
                            </div>
                            <div className="cb-header-text">
                                <strong>
                                    HopeBot
                                    <AutoAwesomeIcon sx={{ fontSize: 13, marginLeft: '4px', verticalAlign: '-1px' }} />
                                </strong>
                                <span>AI assistant · Online</span>
                            </div>
                        </div>
                        <div className="cb-header-actions">
                            <button
                                type="button"
                                className="cb-icon-btn"
                                onClick={handleReset}
                                aria-label="Reset conversation"
                                title="Reset"
                            >
                                <RestartAltIcon sx={{ fontSize: 18 }} />
                            </button>
                            <button
                                type="button"
                                className="cb-icon-btn"
                                onClick={() => setOpen(false)}
                                aria-label="Close chat"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>
                    </header>

                    <div className="cb-messages" ref={scrollRef}>
                        {messages.map(m => (
                            <div key={m.key} className={`cb-msg cb-msg--${m.from}`}>
                                <div className="cb-bubble">{m.content}</div>
                            </div>
                        ))}
                    </div>

                    <div className="cb-questions">
                        <span className="cb-questions-label">Suggested questions</span>
                        <div className="cb-questions-list">
                            {FAQ.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="cb-question-btn"
                                    onClick={() => handleAsk(item)}
                                >
                                    <span>{item.q}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
