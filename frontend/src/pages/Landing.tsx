import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity,
  BrainCircuit,
  Building2,
  Compass,
  Gauge,
  Mic,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  Info,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { RiskBadge } from "@/components/RiskBadge";
import type { RiskLevel } from "@/lib/types";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "AI Symptom Assessment",
    text: "Describe symptoms by text or voice. MediSense AI asks one relevant question at a time and extracts the details that matter.",
  },
  {
    icon: Gauge,
    title: "Risk & Confidence Analysis",
    text: "Every assessment shows a transparent risk level, a 0-100 risk score and an AI confidence score - with the reasons behind them.",
  },
  {
    icon: Compass,
    title: "Smart Healthcare Guidance",
    text: "Get a recommended next step and the right healthcare department for your symptom pattern - never a diagnosis.",
  },
];

const DEMO_SCENARIOS: { id: string; level: RiskLevel; label: string }[] = [
  { id: "low", level: "LOW", label: "Mild headache" },
  { id: "medium", level: "MEDIUM", label: "Persistent fever" },
  { id: "high", level: "HIGH", label: "Breathing difficulty" },
  { id: "critical", level: "CRITICAL", label: "Chest discomfort" },
];

const STEPS = [
  { n: "01", title: "Describe symptoms", text: "Chat by text or voice - in your own words." },
  { n: "02", title: "AI asks follow-ups", text: "One question at a time to fill the picture." },
  { n: "03", title: "Preliminary assessment", text: "Risk level, score, confidence and category." },
  { n: "04", title: "Guided next step", text: "Department recommendation and safe guidance." },
];

export default function Landing() {
  return (
    <div className="min-h-svh bg-[#F8FAFC] text-slate-900">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl print-hide">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Activity className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="font-heading text-sm font-bold tracking-tight">MediSense AI</p>
              <p className="text-[11px] font-medium text-slate-500">Understand. Assess. Guide.</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link to="/dashboard" className="transition-colors hover:text-teal-700">Dashboard</Link>
            <Link to="/departments" className="transition-colors hover:text-teal-700">Departments</Link>
            <Link to="/human-review" className="transition-colors hover:text-teal-700">Human Review</Link>
          </nav>
          <Link
            to="/assessment"
            className={buttonVariants({ size: "sm" })}
            data-testid="nav-start-assessment"
          >
            Start Assessment
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative grid grid-cols-1 items-center gap-12 py-12 lg:grid-cols-12 lg:py-20">
          <div className="pointer-events-none absolute -top-20 right-0 -z-10 size-96 rounded-full bg-teal-200 opacity-20 blur-3xl" />
          <div className="lg:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-teal-700"
            >
              AI-Powered Medical Assistant
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 font-heading text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl"
            >
              MediSense AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 max-w-xl text-lg leading-relaxed text-slate-700"
            >
              Describe your symptoms, understand your preliminary risk, and get guided toward the
              right next step.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/assessment"
                className={buttonVariants({ size: "lg" })}
                data-testid="hero-start-assessment"
              >
                <Stethoscope className="size-4" />
                Start Assessment
              </Link>
              <Link
                to="/assessment?voice=1"
                className={buttonVariants({ variant: "outline", size: "lg" })}
                data-testid="hero-talk-to-medisense"
              >
                <Mic className="size-4" />
                Talk to MediSense
              </Link>
            </motion.div>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Explainable risk scores", "Human-in-the-loop", "Voice-ready (Vapi placeholder)"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                >
                  <ShieldCheck className="size-3.5 text-teal-600" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive preview card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-15px_rgba(13,148,136,0.25)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-bold">Live triage preview</p>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  Demo data
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {DEMO_SCENARIOS.map((s) => (
                  <Link
                    key={s.id}
                    to={`/assessment?scenario=${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                    data-testid={`landing-scenario-${s.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-2 rounded-full" style={{ background: { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#F43F5E", CRITICAL: "#DC2626" }[s.level] }} />
                      <span className="text-sm font-medium text-slate-700">{s.label}</span>
                    </div>
                    <RiskBadge level={s.level} />
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Try a one-click scenario to see how risk routing, guidance and human escalation
                behave for different severities.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Emergency notice */}
        <section className="pb-4">
          <EmergencyBanner />
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 gap-6 py-12 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </motion.div>
          ))}
        </section>

        {/* How it works */}
        <section className="py-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                How it works
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">
                One polished workflow, end to end
              </h2>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-mono text-sm font-bold text-teal-600">{s.n}</p>
                <p className="mt-2 font-heading text-base font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-8">
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Info className="size-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-bold text-slate-900">Important</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                MediSense AI provides preliminary healthcare guidance and is not a replacement for
                a qualified medical professional. It does not provide a diagnosis, does not
                prescribe medication, and clearly escalates urgent or uncertain cases to human
                clinicians.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-slate-200 bg-white print-hide">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Activity className="size-4" />
            </div>
            <p className="text-sm text-slate-600">
              MediSense AI - hackathon prototype (HC-02). Synthetic demo data only.
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link to="/departments" className="inline-flex items-center gap-1.5 hover:text-teal-700">
              <Building2 className="size-4" /> Departments
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-teal-700">
              <BrainCircuit className="size-4" /> Analytics
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
