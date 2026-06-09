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
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col justify-between border-8 border-[#141414] overflow-hidden">
      {/* Top Navigation / Status Header */}
      <header className="border-b-4 border-[#141414] bg-[#141414] text-[#E4E3E0] px-4 lg:px-8 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Technical Branding */}
          <div className="flex items-center space-x-3.5 self-start md:self-auto">
            <div className="w-10 h-10 bg-red-600 shadow-[2px_2px_0px_#fff] flex items-center justify-center">
              <Network className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-white font-mono italic">VEKTOR<span className="text-red-500">OPS</span></h1>
                <span className="text-[9px] font-mono tracking-wider bg-white/10 text-[#E4E3E0] px-1.5 py-0.5 rounded font-bold uppercase border border-white/20">
                  Custom Engine Agent (CEA)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute right-0 top-0 hidden" />
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                Multi-Tenant Hardware Diagnostic & Compliance Network v8.4.12
              </p>
            </div>
          </div>

          {/* Quick Stats Metrics bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            {systemMetrics.map((met, idx) => (
              <div 
                key={idx} 
                className="bg-white/5 border border-white/10 rounded p-2 flex items-center space-x-2.5"
              >
                <div className={`p-1.5 rounded ${met.color}`}>
                  <met.icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    {met.label}
                  </p>
                  <p className="text-xs font-mono font-bold text-white mt-1 leading-none">
                    {met.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </header>

      {/* Main Container / Content Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        
        {/* Welcome Intro & Tab Selectors */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border-4 border-[#141414] p-5 shadow-[6px_6px_0px_#141414]">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-sm font-bold text-[#141414] flex items-center space-x-2 font-mono uppercase tracking-wide">
              <span className="w-2.5 h-2.5 bg-red-600 inline-block" />
              <span>Diagnostic System Blueprint & Pipeline</span>
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              Designed as a compliant .NET 8 Custom Engine Agent, VektorOps processes high-frequency telemetry bytes, enforces tenant boundary safeguards directly, queries Silicon Specifications via <strong>Foundry IQ</strong>, and compiles interactive Microsoft 365 Copilot Adaptive Card JSON scopes.
            </p>
          </div>

          {/* Workspace Tab Switcher */}
          <div className="flex bg-[#E4E3E0] border-2 border-[#141414] p-1 rounded self-start lg:self-auto shrink-0 shadow-[2px_2px_0px_#141414]">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "simulator"
                  ? "bg-[#141414] text-white font-black"
                  : "text-slate-700 hover:text-[#141414]"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Live Ingress Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab("codebase")}
              className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "codebase"
                  ? "bg-[#141414] text-white font-black"
                  : "text-slate-700 hover:text-[#141414]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>C# Source Solution</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all ${
                activeTab === "architecture"
                  ? "bg-[#141414] text-white font-black"
                  : "text-slate-700 hover:text-[#141414]"
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
              className="id-viewport-architecture bg-white border-4 border-[#141414] p-6 lg:p-8 space-y-6 font-sans select-text max-w-full leading-relaxed shadow-[8px_8px_0px_#141414] text-[#141414]"
            >
              <div className="border-b border-[#141414]/20 pb-5">
                <h3 className="text-base font-bold font-mono tracking-tight text-[#141414] uppercase flex items-center space-x-2.5">
                  <Layers className="w-5 h-5 text-red-650" />
                  <span>VektorOps Custom Engine Agent Blueprint Overview</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reference design specification for the Microsoft Copilot Extensibility & Hardware Compliance Track
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="space-y-3 bg-[#E4E3E0]/30 p-5 border-2 border-[#141414] shadow-[4px_4px_0px_#141414]">
                  <div className="p-2 bg-red-650 bg-[#141414] text-white w-fit">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#141414]">1. Isolation Boundary Guardrails</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Custom Engine Agents operating in corporate fabrics must implement deterministic security assertions. VektorOps validates incoming telemetry tenant IDs against session verification context claims. If a mismatch is parsed, a custom domain event exception is immediately triggered to thwart unauthorized leakage of sensitive data pools.
                  </p>
                </div>

                <div className="space-y-3 bg-[#E4E3E0]/30 p-5 border-2 border-[#141414] shadow-[4px_4px_0px_#141414]">
                  <div className="p-2 bg-slate-900 bg-[#141414] text-white w-fit">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#141414]">2. Architectural Grounding Platform</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Failing register parameters require rich bitwise semantics. By deploying a low-friction local specs indexing pipeline (Foundry IQ), VektorOps references static bit position masks, physical system descriptions, and recommended BIOS-level mitigation algorithms inside sub-millisecond execution envelopes.
                  </p>
                </div>

                <div className="space-y-3 bg-[#E4E3E0]/30 p-5 border-2 border-[#141414] shadow-[4px_4px_0px_#141414]">
                  <div className="p-2 bg-amber-600 bg-red-600 text-white w-fit">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#141414]">3. Copilot Extensibility Loop</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Rather than traditional plain log notifications, the system serializes incidents into Microsoft 365 Copilot Adaptive Cards (v1.5 standard). These cards organize data blocks into a neat layout logic featuring diagnostic breakdown fact tables and functional Submit buttons containing actionable routing triggers.
                  </p>
                </div>

              </div>

              <div className="bg-[#141414] p-5 border-2 border-[#141414] space-y-3 shadow-[4px_4px_0px_#E4E3E0]">
                <h4 className="text-sm font-bold text-white font-mono tracking-wide uppercase">C# Memory Pipeline Flowcharts</h4>
                <div className="font-mono text-xs text-green-400 leading-normal space-y-1 bg-black p-4 rounded border border-white/10 overflow-x-auto whitespace-pre">
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

              <div className="space-y-2 text-xs text-slate-755 leading-relaxed bg-[#E4E3E0]/20 p-4 border border-[#141414]">
                <h4 className="font-semibold text-[#141414] uppercase font-mono tracking-wider">Compliance & Regulatory Auditing Requirements</h4>
                <p className="font-sans">
                  By strictly mapping diagnostic offsets directly onto the manufacturing partner SLA registers, VektorOps satisfies strict SOX and corporate hardware compliance paradigms. Operating systems engineers maintain absolute visibility over hardware lifecycles, guaranteeing that failed assets are mitigated within contractual times while respecting strict corporate data separation boundaries.
                </p>
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* Footer System Credits */}
      <footer className="border-t-4 border-[#141414] bg-[#141414] text-[#E4E3E0] font-mono text-[10px] py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span>VEKTOROPS CORE ENGINE MONITORING: ACTIVE</span>
        </div>
        <div className="bg-white/10 px-2 py-0.5 border border-white/20 rounded">
          <span>Active Session Target Context ID: </span>
          <span className="text-white font-bold">TENANT-ALPHA</span>
        </div>
        <div className="opacity-75">
          <span>Runtime Platform: </span>
          <strong className="text-red-500 font-bold uppercase">.NET 8.0 CLR Sandbox</strong>
        </div>
      </footer>
    </div>
  );
}

