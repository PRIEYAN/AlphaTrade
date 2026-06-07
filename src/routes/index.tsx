import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Bot, Zap, Activity, KeyRound, FileCheck2,
  Sparkles, ChevronDown, Send,
} from "lucide-react";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { Marquee } from "@/components/marquee";
import { AnimatedNumber } from "@/components/animated-number";
import { WalletButton } from "@/components/wallet-button";
import { config } from "@/lib/config";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlphaTrade — Autonomous Crypto Trading Agent" },
      { name: "description", content: "Self-custody AI trading agent for BNB Chain. Groq-powered decisions, hard guardrails, Trust Wallet signing. Your keys, your rules." },
      { property: "og:title", content: "AlphaTrade — Autonomous Crypto Trading Agent" },
      { property: "og:description", content: "Self-custody AI trading agent for BNB Chain." },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="border-brutal bg-ink text-paper font-display px-2 py-1 shadow-brutal-sm">A/</span>
          <span className="font-display text-xl tracking-tight">ALPHATRADE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-display text-sm uppercase">
          <a href="#product" className="hover:text-pink">Product</a>
          <a href="#how" className="hover:text-pink">How it works</a>
          <a href="#security" className="hover:text-pink">Security</a>
          <a href="#faq" className="hover:text-pink">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 border-brutal bg-pink px-3 py-2 font-display text-sm uppercase shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Launch App <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative grid-bg border-b-[3px] border-ink overflow-hidden">
      {/* animated soft blobs */}
      <motion.div
        className="absolute -top-32 -left-32 size-96 bg-pink opacity-40 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-0 size-96 bg-lime opacity-40 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Reveal>
            <StickerTag tone="cyan">Season 03 — Live now</StickerTag>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[0.95] uppercase">
              Trade like<br />
              <span className="inline-block bg-pink border-brutal px-3 py-1 mt-2 shadow-brutal-lg -rotate-1">a machine.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-lg text-ink/80">
              An autonomous crypto trading agent that reads markets, thinks with Groq, respects your rules, and signs with Trust Wallet. Self-custody. On-chain. No middlemen.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-2 border-brutal bg-lime px-5 py-3 font-display uppercase shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
                Launch App <ArrowRight className="size-5" />
              </Link>
              <a
                href={`${config.bscScan}/address/${config.competitionContract}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 border-brutal bg-card px-5 py-3 font-display uppercase shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
              >
                View on BSCScan →
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.2}>
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <BrutalCard className="p-5 rotate-1">
      <div className="flex items-center justify-between border-b-[3px] border-ink pb-3">
        <div className="flex items-center gap-2">
          <span className="size-3 bg-pink border-brutal" />
          <span className="size-3 bg-lime border-brutal" />
          <span className="size-3 bg-orange border-brutal" />
        </div>
        <span className="font-mono text-xs">agent.alphatrade</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="border-brutal bg-paper p-3">
          <div className="text-[10px] font-display uppercase">Portfolio</div>
          <div className="font-display text-xl">$12.4k</div>
        </div>
        <div className="border-brutal bg-lime p-3">
          <div className="text-[10px] font-display uppercase">24h PnL</div>
          <div className="font-display text-xl">+4.8%</div>
        </div>
        <div className="border-brutal bg-pink p-3">
          <div className="text-[10px] font-display uppercase">Status</div>
          <div className="font-display text-xl">LIVE</div>
        </div>
      </div>
      <div className="mt-4 border-brutal bg-paper p-3">
        <div className="flex justify-between items-center text-xs font-display uppercase">
          <span>Last decision</span>
          <span className="bg-lime border-brutal px-2 py-0.5 shadow-brutal-sm">APPROVED</span>
        </div>
        <div className="mt-2 font-mono text-xs leading-relaxed">
{`{ "action": "buy",
  "tokenIn": "USDT",
  "tokenOut": "BNB",
  "sizePercent": 4.0,
  "confidence": 0.78 }`}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-mono">
        <span className="inline-block size-2 bg-lime border border-ink rounded-full animate-pulse" />
        Guardrails passed · TWAK signed · tx 0x4a…d2c
      </div>
    </BrutalCard>
  );
}

function StatsBand() {
  const stats = [
    { v: 100, suffix: "%", label: "Self-custody" },
    { v: 30, suffix: "+", label: "Chains" },
    { v: 402, suffix: "", label: "x402 native" },
    { v: 1.2, suffix: "s", label: "Groq decisions" },
  ];
  return (
    <section className="border-b-[3px] border-ink bg-card">
      <div className="mx-auto grid grid-cols-2 md:grid-cols-4 max-w-7xl">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <div className="p-8 border-r-[3px] border-ink last:border-r-0 border-b-[3px] md:border-b-0">
              <div className="font-display text-4xl md:text-5xl">
                <AnimatedNumber value={s.v} suffix={s.suffix} />
              </div>
              <div className="mt-1 font-display text-xs uppercase tracking-wider">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Read", d: "Pulls Fear & Greed, funding, sentiment, momentum from CoinMarketCap Agent Hub via x402.", tone: "cyan" as const },
    { n: "02", t: "Decide", d: "Groq runs your strategy + signals through a disciplined system prompt. JSON in, JSON out.", tone: "pink" as const },
    { n: "03", t: "Approve", d: "A deterministic guardrail validator rejects anything off-allowlist, oversized, or low-confidence.", tone: "lime" as const },
    { n: "04", t: "Sign", d: "Trust Wallet Agent Kit signs and submits. Your keys never leave your wallet.", tone: "orange" as const },
  ];
  return (
    <section id="how" className="border-b-[3px] border-ink py-20">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <div className="text-sm font-mono mb-2">// HOW IT WORKS</div>
          <h2 className="font-display text-4xl md:text-6xl uppercase max-w-3xl">Four steps. <span className="bg-lime border-brutal px-2 -rotate-1 inline-block">Zero trust required.</span></h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <BrutalCard tone={s.tone} className="p-5 h-full">
                <div className="font-mono text-sm">{s.n}</div>
                <div className="font-display text-2xl uppercase mt-2">{s.t}</div>
                <p className="mt-3 text-sm">{s.d}</p>
              </BrutalCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { i: KeyRound, t: "Self-Custody Signing", d: "Keys stay in your Trust Wallet. The agent proposes; you (or your wallet policy) sign." },
    { i: Bot, t: "Autonomous Mode", d: "Let the agent run 24/7 inside your guardrails. Pause or kill anytime." },
    { i: Shield, t: "Hard Guardrails", d: "Per-trade cap, daily cap, drawdown, slippage, allowlist, confidence floor. Enforced in code." },
    { i: Sparkles, t: "Groq AI Decisions", d: "Sub-second JSON decisions from a Llama-3.3 70B class model with a disciplined system prompt." },
    { i: Zap, t: "x402 Pay-per-call", d: "Pay only for the data you use. Every CMC call settles in fractions of a cent." },
    { i: FileCheck2, t: "On-chain Proof", d: "Every trade leaves a tx hash. Every decision is logged and visible in the Activity tab." },
  ];
  return (
    <section id="product" className="border-b-[3px] border-ink bg-paper py-20 grid-bg">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <div className="text-sm font-mono mb-2">// PRODUCT</div>
          <h2 className="font-display text-4xl md:text-6xl uppercase max-w-3xl">Built for traders who <span className="bg-pink border-brutal px-2 inline-block">don't blink.</span></h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ i: Icon, t, d }, idx) => (
            <Reveal key={t} delay={idx * 0.05}>
              <BrutalCard className="p-5 h-full hover:-translate-y-1 transition-transform">
                <div className="size-12 border-brutal bg-lime grid place-items-center shadow-brutal-sm">
                  <Icon className="size-6" />
                </div>
                <div className="font-display text-xl uppercase mt-4">{t}</div>
                <p className="mt-2 text-sm text-ink/75">{d}</p>
              </BrutalCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section id="security" className="border-b-[3px] border-ink py-20">
      <div className="mx-auto max-w-7xl px-4 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <Reveal>
            <div className="text-sm font-mono mb-2">// SECURITY</div>
            <h2 className="font-display text-4xl md:text-6xl uppercase">Your keys.<br /><span className="bg-cyan border-brutal px-2 inline-block">Your rules.</span></h2>
            <p className="mt-6 text-ink/80 max-w-md">
              AlphaTrade is non-custodial by design. Private keys never leave your device. The AI's output is only ever advisory — it has to pass a deterministic guardrail validator before reaching the signing layer.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex gap-2"><span className="bg-lime border-brutal px-1.5">✓</span> LLM output validated with zod schema</li>
              <li className="flex gap-2"><span className="bg-lime border-brutal px-1.5">✓</span> Guardrails enforced as pure code</li>
              <li className="flex gap-2"><span className="bg-lime border-brutal px-1.5">✓</span> Server-side rate limiting + Kill Switch</li>
              <li className="flex gap-2"><span className="bg-lime border-brutal px-1.5">✓</span> Prompt-injection sanitization on user input</li>
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <BrutalCard tone="ink" className="p-6 font-mono text-sm">
            <div className="text-lime mb-3"># execution pipeline</div>
            <pre className="leading-relaxed text-paper whitespace-pre-wrap">
{`signals  → cmcService()
proposal → groq.decide()      // advisory
verdict  → validateDecision() // hard rules
action   → twak.signAndSend() // self-custody
proof    → tx on bscscan`}
            </pre>
          </BrutalCard>
        </Reveal>
      </div>
    </section>
  );
}

function PoweredBy() {
  const partners = [
    { n: "CoinMarketCap Agent Hub", url: "https://coinmarketcap.com/api/agent" },
    { n: "Trust Wallet Agent Kit", url: "https://portal.trustwallet.com" },
    { n: "BNB AI Agent SDK", url: "https://github.com/bnb-chain/bnbagent-sdk" },
    { n: "Groq", url: "https://groq.com" },
    { n: "x402", url: "https://www.x402.org" },
  ];
  return (
    <section className="border-b-[3px] border-ink bg-card py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="font-display text-xs uppercase tracking-wider text-ink/60 mb-4">Powered by</div>
        <div className="flex flex-wrap gap-3">
          {partners.map((p) => (
            <a key={p.n} href={p.url} target="_blank" rel="noreferrer"
              className="border-brutal bg-paper px-3 py-2 font-display text-sm uppercase shadow-brutal-sm hover:bg-lime transition-colors">
              {p.n}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Is AlphaTrade custodial?", a: "No. Signing happens through Trust Wallet Agent Kit. Your private keys never touch our servers and never reach the browser." },
    { q: "Can the AI move funds without my rules?", a: "No. Every Groq decision is validated against your guardrails (allowlist, size caps, drawdown, confidence floor) before any swap is signed. Raw LLM output cannot trigger a transaction." },
    { q: "What chains are supported?", a: "BNB Chain (id 56) at launch. Trust Wallet Agent Kit's coverage extends to 30+ chains; more come online as the agent stack matures." },
    { q: "What if Groq returns garbage?", a: "Output is zod-validated. On malformed responses the agent falls back to a safe 'hold' decision and logs the rejection." },
    { q: "What's the Kill Switch?", a: "A one-click global stop. When engaged, /api/agent/decide refuses to produce executable decisions and no swap is ever sent." },
  ];
  return (
    <section id="faq" className="border-b-[3px] border-ink py-20">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal>
          <div className="text-sm font-mono mb-2">// FAQ</div>
          <h2 className="font-display text-4xl md:text-6xl uppercase">Questions, <span className="bg-orange border-brutal px-2 inline-block">answered.</span></h2>
        </Reveal>
        <div className="mt-10">
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((it, i) => (
              <Reveal key={it.q} delay={i * 0.04}>
                <AccordionItem value={`i${i}`} className="border-brutal bg-card shadow-brutal-sm">
                  <AccordionTrigger className="px-4 font-display uppercase text-left hover:no-underline">
                    {it.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-ink/80">{it.a}</AccordionContent>
                </AccordionItem>
              </Reveal>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-b-[3px] border-ink bg-pink py-20">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <h2 className="font-display text-4xl md:text-6xl uppercase">Stop watching charts. <br /> Start shipping trades.</h2>
        <Link to="/dashboard" className="inline-flex items-center gap-2 border-brutal bg-ink text-paper px-6 py-4 font-display text-xl uppercase shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
          Launch App <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-4 gap-8">
        <div>
          <div className="font-display text-2xl">A/ ALPHATRADE</div>
          <p className="mt-3 text-sm text-paper/70">Autonomous crypto trading. Self-custody by default.</p>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-wider text-paper/60">Product</div>
          <ul className="mt-3 space-y-1 text-sm">
            <li><a href="#product" className="hover:text-pink">Features</a></li>
            <li><a href="#how" className="hover:text-pink">How it works</a></li>
            <li><a href="#security" className="hover:text-pink">Security</a></li>
          </ul>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-wider text-paper/60">Resources</div>
          <ul className="mt-3 space-y-1 text-sm">
            <li><a href={`${config.bscScan}/address/${config.competitionContract}`} target="_blank" rel="noreferrer" className="hover:text-pink">BSCScan</a></li>
            <li><a href="https://coinmarketcap.com/api/agent" target="_blank" rel="noreferrer" className="hover:text-pink">CMC Agent Hub</a></li>
            <li><a href="https://portal.trustwallet.com" target="_blank" rel="noreferrer" className="hover:text-pink">Trust Wallet TWAK</a></li>
          </ul>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-wider text-paper/60">Community</div>
          <a href={config.telegram} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 border-2 border-paper bg-pink text-ink px-3 py-2 font-display text-sm uppercase">
            <Send className="size-4" /> Telegram
          </a>
        </div>
      </div>
      <div className="border-t-2 border-paper/20 py-4 text-center text-xs text-paper/50 font-mono">
        © {new Date().getFullYear()} AlphaTrade. Not financial advice.
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Marquee items={["AGENT LIVE", "BSC CHAIN 56", "GROQ POWERED", "x402 NATIVE", "SELF-CUSTODY", "12K USERS", "ZERO RUG PULLS"]} />
      <Hero />
      <StatsBand />
      <HowItWorks />
      <Features />
      <Security />
      <PoweredBy />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
