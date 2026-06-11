# VektorOps Portal — Live Telemetry Simulator & M365 Copilot Aggregator

An advanced, edge-to-cloud security mapping and diagnostic pipeline built for real-time hardware telemetry translation and Microsoft 365 Adaptive Card generation. This system simulates high-frequency industrial silicon and server hardware diagnostics while enforcing strict multi-tenant boundary isolation.

---

## ⏳ Hackathon Context
In high-performance cloud scale datacenters, hardware failure telemetry can be highly sensitive and chaotic. VektorOps acts as the unified middleware translator that runs high-speed microcode diagnostic parse loops. It aggregates hardware raw register hex dumps and binds them to Microsoft 365 Copilot-compatible Adaptive Cards, enabling enterprise engineers to preview and triage infrastructure incidents inside Teams, Outlook, and Copilot chats safely and instantaneously.

## 🎯 Core Mission & Inspiration
Our core mission is **Secure Speed**. Intercepting failing silicon bits and converting them into actionable business diagnostics within microseconds demands extreme reliability, but also absolute isolation. If telemetry from **Tenant Alpha** is parsed in a workspace where **Tenant Beta**'s keys are active, the pipeline must immediately trigger strict guardrails, log a trace error, and drop/block the output. 
VektorOps inspires an offline-first, client-and-edge resilient translation interface that empowers hardware technicians with real-time feedback, deep hardware register insight, and interactive visual aids.

---

## 🚀 Key Actions & Agent Capabilities

- **⚡ Live Auto-Ingestion**: Streams synthetic hardware microcode telemetry and silicon health logs every 3 seconds to test continuous edge parsing without requiring constant manual triggers.
- **🛡️ Multi-Tenant Guardrails**: Actively verifies tenant tokens across ingested logs against the active session. If a tenant separation breach is detected, it throws a signature `SecurityBoundaryViolationException` and completely blocks processing.
- **📟 Register Catalog Diagnostics**: Seamlessly maps raw hexadecimal codes (such as L2 Cache parities, PCIe frame loss, and Voltage sags) to a comprehensive physical registry, determining the failing bit and exact diagnostic actions.
- **🎯 Dynamic Severity & Threshold Enforcers**: Allows operators to customize hardware limits (Silicon Temperature, VDDQ voltage deviations, PCIe error rates) to dynamically trigger high-priority alerts.
- **📂 Batch Loader & JSON Auditing**: Supports bulk ingest processing via drag-and-drop or manual JSON uploading. Operators can download processed incident diagnostic logs in both bulk form and individual selected payloads for external auditing.
- **🔍 Diagnostic Smart Search**: Instantaneous client-side filtering lets operators quickly isolates failures by device ID or error codes.
- **👀 M365 Card Previewing**: Mimics native Teams/Copilot layouts directly in an interactive live preview canvas as well as a full modal dialog.
- **📊 Real-time Heatmap Visualizer (D3)**: Renders multi-tenant compliance grids showing healthy vs failed infrastructure assets at a single glance.

---

## 📦 Built With
- **Vite & React 18+** — Single Page Application runtime.
- **TypeScript** — Direct type-safe telemetry structures.
- **Tailwind CSS** — Neo-brutalist tech theme styled with monospace font pairing.
- **Recharts** — Live line metric trend tracking.
- **D3.js** — Multi-tenant compliance heatmap grid.
- **Lucide React** — Streamlined vector icon library.

---

## 🛠️ Unified Installation & Development

To set up, install dependencies, and launch VektorOps locally:

```bash
# 1. Install all required dependencies
npm install

# 2. Start the development server (runs on Port 3000)
npm run dev

# 3. Build for production compilation
npm run build

# 4. Preview the production build locally
npm run start
```

---

## 🧑‍⚖️ Submission
VektorOps meets all critical challenges for enterprise integration:
1. **Developer Experience**: Pure TypeScript pipelines featuring inline, detailed, system console logs simulation.
2. **Security First**: Simulated exception handler boundaries mimic native C# `VektorOps.Exceptions` modules, demonstrating absolute data privacy.
3. **M365 Integration**: Ready-to-ingest Adaptive Card JSON payloads conforms entirely with Copilot framework schemas.
