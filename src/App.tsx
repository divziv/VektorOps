/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Terminal, ShieldCheck, Cpu, Database, Play, Code2, BookOpen, 
  Settings, Network, CheckCircle2, AlertTriangle, Layers, Users, Clock
} from "lucide-react";
import { TelemetrySimulator } from "./components/TelemetrySimulator";
import { CsharpExplorer } from "./components/CsharpExplorer";

export default function App() {
  const [activeTab, setActiveTab] = useState<"simulator" | "codebase" | "architecture">("simulator");

  // Telemetry status metrics
  const systemMetrics = [
    { label: "Active Engine", value: ".NET 8.0 LTS", icon: Cpu, color: "text-teal-400 bg-teal-550/10" },
    { label: "Grounding Specs", value: "Foundry IQ v1.5", icon: Database, color: "text-cyan-400 bg-cyan-550/10" },
    { label: "Boundary Guard", value: "Multi-Tenant", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-555/10" },
    { label: "Output Schema", value: "Copilot Adaptive Card", icon: Layers, color: "text-pink-400 bg-pink-550/10" },
  ];

  return (
    <div className="min-h-screen bg-[#070B16] text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Navigation / Status Header */}
      <header className="border-b border-slate-900 bg-[#0A0E1A]/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Technical Branding */}
          <div className="flex items-center space-x-3.5 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#070B16] rounded-[10px] flex items-center justify-center">
                <Network className="w-5 h-5 text-teal-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-white font-mono">VEKTOR<span className="text-teal-400">OPS</span></h1>
                <span className="text-[9px] font-mono tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase border border-slate-700/60">
                  Custom Engine Agent (CEA)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute right-0 top-0 hidden" />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Multi-Tenant Hardware Diagnostics & Compliance Network
              </p>
            </div>
          </div>

          {/* Quick Stats Metrics bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {systemMetrics.map((met, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-2.5 flex items-center space-x-3 hover:border-slate-700/50 transition-all cursor-default"
              >
                <div className={`p-2 rounded-lg ${met.color}`}>
                  <met.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                    {met.label}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-200 mt-0.5 leading-none">
                    {met.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </header>

      {/* Main Container / Content Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        
        {/* Welcome Intro & Tab Selectors */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#0a1022] border border-slate-900/80 rounded-2xl p-5 shadow-xl">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Diagnostic System Blueprint & Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Designed as a compliant .NET 8 Custom Engine Agent, VektorOps processes high-frequency telemetry bytes, enforces tenant boundary safeguards directly, queries Silicon Specifications via <strong>Foundry IQ</strong>, and compiles interactive Microsoft 365 Copilot Adaptive Card JSON scopes.
            </p>
          </div>

          {/* Workspace Tab Switcher */}
          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl self-start lg:self-auto shrink-0">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "simulator"
                  ? "bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Live Ingress Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab("codebase")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "codebase"
                  ? "bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>C# Source Solution</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "architecture"
                  ? "bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Architecture Docs</span>
            </button>
          </div>
        </div>

        {/* Workspace views with animations */}
        <div className="space-y-6">
          {activeTab === "simulator" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="id-viewport-simulator"
            >
              <TelemetrySimulator />
            </motion.div>
          )}

          {activeTab === "codebase" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="id-viewport-codebase"
            >
              <CsharpExplorer />
            </motion.div>
          )}

          {activeTab === "architecture" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="id-viewport-architecture bg-[#0d132a] border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6 font-sans select-text max-w-full leading-relaxed"
            >
              <div className="border-b border-slate-800 pb-5">
                <h3 className="text-lg font-bold font-mono tracking-tight text-white uppercase flex items-center space-x-2.5">
                  <Layers className="w-5 h-5 text-teal-400" />
                  <span>VektorOps Custom Engine Agent Blueprint Overview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reference design specification for the Microsoft Copilot Extensibility & Hardware Compliance Track
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-slate-800/40">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 w-fit">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">1. Isolation Boundary Guardrails</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Custom Engine Agents operating in corporate fabrics must implement deterministic security assertions. VektorOps validates incoming telemetry tenant IDs against session verification context claims. If a mismatch is parsed, a custom domain event exception is immediately triggered to thwart unauthorized leakage of sensitive data pools.
                  </p>
                </div>

                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-slate-800/40">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">2. Architectural Grounding Platform</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Failing register parameters require rich bitwise semantics. By deploying a low-friction local specs indexing pipeline (Foundry IQ), VektorOps references static bit position masks, physical system descriptions, and recommended BIOS-level mitigation algorithms inside sub-millisecond execution envelopes.
                  </p>
                </div>

                <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-slate-800/40">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 w-fit">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">3. Copilot Extensibility Loop</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Rather than traditional plain log notifications, the system serializes incidents into Microsoft 365 Copilot Adaptive Cards (v1.5 standard). These cards organize data blocks into a neat layout logic featuring diagnostic breakdown fact tables and functional Submit buttons containing actionable routing triggers.
                  </p>
                </div>

              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-3">
                <h4 className="text-sm font-bold text-slate-200 font-mono tracking-wide uppercase">C# Memory Pipeline Flowcharts</h4>
                <div className="font-mono text-xs text-slate-400 leading-normal space-y-1 bg-black/30 p-4 rounded-lg border border-slate-900 overflow-x-auto whitespace-pre">
{`   [ Telemetry Node Logs ] ──( Ingestion Pipeline )──> [ McpInterface.cs Gateway ]
                                                                  │
                                                        [ Session Authorization Check ]
                                                                  │
                                                      ├── Tenant Validated?
                                                      │     ├── Yes ──> ( Query Foundry IQ Maps )
                                                      │     │                 │
                                                      │     │           ( Resolve Warranty SLA )
                                                      │     │                 │
                                                      │     │       [ DiagnosticsPayload Record ]
                                                      │     │                 │
                                                      │     │       [ AdaptiveCardEngine.cs ]
                                                      │     │                 │
                                                      │     │       ( Return JSON Card Stream )
                                                      │     │
                                                      │     └── No ───> [ Throws SecurityBoundaryViolationException ]
                                                      │                       │
                                                      │                 ( Pipeline Halts / Reject Packet )`}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <h4 className="font-semibold text-slate-200">Compliance & Regulatory Auditing Requirements</h4>
                <p>
                  By strictly mapping diagnostic offsets directly onto the manufacturing partner SLA registers, VektorOps satisfies strict SOX and corporate hardware compliance paradigms. Operating systems engineers maintain absolute visibility over hardware lifecycles, guaranteeing that failed assets are mitigated within contractual times while respecting strict corporate data separation boundaries.
                </p>
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* Footer System Credits */}
      <footer className="border-t border-slate-900 bg-[#070b16] py-4 px-4 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>VEKTOROPS Core Engine Node Live</span>
          </div>
          <div>
            <span>Local Node Session Context Target ID: </span>
            <span className="text-slate-400 font-bold">TENANT-ALPHA</span>
          </div>
          <div>
            <span>Runtime Domain Target: </span>
            <span className="text-slate-400 hover:text-teal-400 cursor-help border-b border-dotted border-slate-600 transition">
              .NET 8.0 CLR Sandbox Mode
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

