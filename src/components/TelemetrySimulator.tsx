import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, 
  Terminal, Server, Shield, Cpu, RefreshCw, Send, Eye, Network, ExternalLink, Sliders
} from "lucide-react";
import { HardwareAlertLog, DiagnosticsPayload, RegisterMetadata, WarrantySlaContract } from "../types";

// Standard Register Metadata (Simulating internal database in FoundryIqService.cs)
const REGISTER_CATALOG: Record<string, RegisterMetadata> = {
  "0xERR_77B": {
    errorCode: "0xERR_77B",
    registerName: "CPU_L2_CACHE_PARITY_CTRL",
    failingBit: 14,
    description: "L2 Tag RAM parity error detected on index 2198. Possible high cosmic-ray interference or silicon thermal throttling.",
    hardwareLevel: "SRAM Cache Controller",
    diagnosticAction: "Assert register 0x41C to reset L2 sector, scale down memory bus frequency by 50MHz, and re-evaluate ECC counters."
  },
  "0xERR_A4F": {
    errorCode: "0xERR_A4F",
    registerName: "DRAM_MEM_VOLT_SENSE",
    failingBit: 2,
    description: "Memory channel B core voltage (VDDQ) dropped below critical threshold (1.12V vs 1.20V expected). High susceptibility to bit flip errors.",
    hardwareLevel: "Memory Subsystem",
    diagnosticAction: "Request microcode calibration check. Dispatch a power rail feedback event to the BIOS PMIC driver wrapper."
  },
  "0xERR_F8C": {
    errorCode: "0xERR_F8C",
    registerName: "PCIE_BUS_FRAM_COLLISION",
    failingBit: 9,
    description: "PCIe Gen5 physical block lane synchronizer loss-of-signal. Frame misalignment rate exceeded 15% on Link Port 4.",
    hardwareLevel: "PCIe Root Complex",
    diagnosticAction: "Trigger logical retrain sequence in port register 0xDE02. If retries expire, fall back link lanes from x16 to x8 width."
  }
};

const WARRANTY_CONTRACTS: Record<string, WarrantySlaContract> = {
  "INTEL_FOUNDRY_CORP": {
    manufacturerId: "INTEL_FOUNDRY_CORP",
    assetSerialRange: "SN-INTEL-000000",
    expirationDate: "2028-06-15",
    responseTimeThresholdHours: 4
  },
  "AMD_SEMI_GLOBAL": {
    manufacturerId: "AMD_SEMI_GLOBAL",
    assetSerialRange: "SN-AMD-999999",
    expirationDate: "2027-11-20",
    responseTimeThresholdHours: 12
  },
  "TSMC_FAB_NET": {
    manufacturerId: "TSMC_FAB_NET",
    assetSerialRange: "SN-TSMC-500500",
    expirationDate: "2026-08-01",
    responseTimeThresholdHours: 2
  }
};

const DEFAULT_EVENT_STREAM: HardwareAlertLog[] = [
  {
    deviceId: "CPU-INTEL-SK-10",
    nodeTenantId: "TENANT-ALPHA",
    registerErrorCode: "0xERR_77B",
    hexDumpValue: "0x000F411082BF90D3",
    telemetryTimestamp: "2026-06-09T06:27:30Z"
  },
  {
    deviceId: "GPU-AMD-RYZ88",
    nodeTenantId: "TENANT-ALPHA",
    registerErrorCode: "0xERR_A4F",
    hexDumpValue: "0xFFFFFFFFD904B4C0",
    telemetryTimestamp: "2026-06-09T06:27:35Z"
  },
  {
    deviceId: "NODE-ROUTER-P8",
    nodeTenantId: "TENANT-BETA", // Will violate security boundary if userTenant = TENANT-ALPHA!
    registerErrorCode: "0xERR_F8C",
    hexDumpValue: "0xABCD7739FFFF2290",
    telemetryTimestamp: "2026-06-09T06:27:38Z"
  },
  {
    deviceId: "FPGA-XIL-ACC-4",
    nodeTenantId: "TENANT-ALPHA",
    registerErrorCode: "0xERR_F8C",
    hexDumpValue: "0xCCAA00FF2200EEDC",
    telemetryTimestamp: "2026-06-09T06:27:42Z"
  },
  {
    deviceId: "CPU-INTEL-ULT-2",
    nodeTenantId: "TENANT-GAMMA", // Will violate security boundary!
    registerErrorCode: "0xERR_A4F",
    hexDumpValue: "0x00021A4FF440001B",
    telemetryTimestamp: "2026-06-09T06:27:45Z"
  },
  {
    deviceId: "GPU-AMD-FIRE9",
    nodeTenantId: "TENANT-ALPHA",
    registerErrorCode: "0xERR_77B",
    hexDumpValue: "0x5544FFAA1230048F",
    telemetryTimestamp: "2026-06-09T06:27:50Z"
  }
];

export function TelemetrySimulator() {
  const [activeTenant, setActiveTenant] = useState<string>("TENANT-ALPHA");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [speedMs, setSpeedMs] = useState<number>(2000);
  
  const [logs, setLogs] = useState<HardwareAlertLog[]>(DEFAULT_EVENT_STREAM);
  const [processedLogs, setProcessedLogs] = useState<DiagnosticsPayload[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<DiagnosticsPayload | null>(null);
  const [traces, setTraces] = useState<string[]>([]);
  const [partsDispatched, setPartsDispatched] = useState<Record<string, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const traceEndRef = useRef<HTMLDivElement | null>(null);

  // Console Trace Helper
  const addTrace = (message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    setTraces((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Scroll to bottom of traces
  useEffect(() => {
    if (traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [traces]);

  // Handle Play / Process Stream Tick
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        processNextLog();
      }, speedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, streamIndex, activeTenant, speedMs, logs]);

  // Main .NET processing mapping simulator (mimicing McpInterface.cs + Program.cs)
  const processLog = (log: HardwareAlertLog): DiagnosticsPayload => {
    const startMicros = performance.now();
    addTrace(`[INGESTION] Received telemetry from CPU Node '${log.deviceId}' via TCP link.`);
    addTrace(`[GUARDRAIL] Verifying tenant token token... Active Session Context: '${activeTenant}'`);

    // Guardrail boundary check
    if (log.nodeTenantId !== activeTenant) {
      addTrace(`[GUARDRAIL CRITICAL] tenant mismatch: device tenant is '${log.nodeTenantId}' != active session '${activeTenant}'`);
      addTrace(`[EXCEPTION THROWN] VektorOps.Exceptions.SecurityBoundaryViolationException: Tenant separation breach detected! Access denied.`);
      
      const payload: DiagnosticsPayload = {
        alert: log,
        matchedRegister: {
          errorCode: log.registerErrorCode,
          registerName: "UNRESOLVED_DUE_TO_PROTECTION_VIOLATION",
          failingBit: 0,
          description: "ACCESS RESTRICTED. Tenant security tokens did not align.",
          hardwareLevel: "Access Blocked",
          diagnosticAction: "Verify session key alignment parameters."
        },
        slaMatched: {
          manufacturerId: "BLOCKED",
          assetSerialRange: "BLOCKED",
          expirationDate: "N/A",
          responseTimeThresholdHours: 0
        },
        complianceStatus: "SECURITY_VIOLATION_BLOCKED",
        processingTimeMs: (performance.now() - startMicros) * 1000,
        exceptionThrown: `VektorOps.Exceptions.SecurityBoundaryViolationException: Active session context '${activeTenant}' does not align with Telemetry Payload owner Tenant '${log.nodeTenantId}'.`
      };
      
      return payload;
    }

    // Success flow - Semantic Lookup
    addTrace(`[SECURITY] Token matched successfully. Proceeding with database query.`);
    addTrace(`[FOUNDRY IQ] Running register map alignment for Error Code '${log.registerErrorCode}'`);

    // Match Register
    const registerMeta = REGISTER_CATALOG[log.registerErrorCode] || {
      errorCode: log.registerErrorCode,
      registerName: "VENDOR_UNDOC_REGISTER",
      failingBit: 0,
      description: "Undefined custom OEM register payload telemetry slice.",
      hardwareLevel: "Custom ASIC Complex",
      diagnosticAction: "Execute fallback CMOS level logical diagnostic parse."
    };

    addTrace(`[FOUNDRY IQ] Mapped to physical register: '${registerMeta.registerName}' (Bit ${registerMeta.failingBit})`);

    // SLAs match
    const manufacturerId = log.deviceId.includes("INTEL") ? "INTEL_FOUNDRY_CORP" : 
                           log.deviceId.includes("AMD") ? "AMD_SEMI_GLOBAL" : "TSMC_FAB_NET";
    
    addTrace(`[SLA RESOLVER] Aligning Warranty agreement with Manufacturer: '${manufacturerId}'`);
    const contract = WARRANTY_CONTRACTS[manufacturerId];

    // Determine compliance
    const isExpired = new Date(contract.expirationDate) < new Date();
    const compliance = isExpired ? "OUT_OF_WARRANTY_COMPLIANCE" : 
                         contract.responseTimeThresholdHours <= 4 ? "CRITICAL_CLASS_GOLD_SLA" : "STANDARD_OPERATIONAL_SLA";

    addTrace(`[SLA RESOLVER] Match successfully mapped standard contract threshold: ${contract.responseTimeThresholdHours}H. Compl.: ${compliance}`);

    const endMicros = performance.now();
    const elapsedMicros = (endMicros - startMicros) * 1000.0;
    addTrace(`[ENGINE] Parsed successfully. Execution duration: ${elapsedMicros.toFixed(2)} microseconds.`);
    addTrace(`[CARD ENGINE] Compiled record outputs into Copilot Adaptive Card JSON format.`);

    return {
      alert: log,
      matchedRegister: registerMeta,
      slaMatched: contract,
      complianceStatus: compliance,
      processingTimeMs: elapsedMicros
    };
  };

  const processNextLog = () => {
    if (streamIndex >= logs.length) {
      addTrace(`[SYSTEM] Stream terminal reached. Halting auto telemetry.`);
      setIsPlaying(false);
      return;
    }

    const currentLog = logs[streamIndex];
    const payload = processLog(currentLog);
    
    setProcessedLogs((prev) => [payload, ...prev]);
    setSelectedPayload(payload);
    setStreamIndex((prev) => prev + 1);
  };

  const forceInjectCustomLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const custom: HardwareAlertLog = {
      deviceId: fd.get("deviceId") as string || "CPU-INTEL-CUSTOM-" + Math.floor(Math.random() * 1000),
      nodeTenantId: fd.get("tenantId") as string || "TENANT-ALPHA",
      registerErrorCode: fd.get("registerErrorCode") as string || "0xERR_77B",
      hexDumpValue: fd.get("hexDump") as string || "0x00000000000012FF",
      telemetryTimestamp: new Date().toISOString()
    };

    setLogs((prev) => {
      const copy = [...prev];
      copy.splice(streamIndex, 0, custom);
      return copy;
    });

    addTrace(`[MANUAL INGRESS] Form validated. Appended custom diagnostic packet into line position: ${streamIndex + 1}`);
    e.currentTarget.reset();
  };

  const resetSimulator = () => {
    setIsPlaying(false);
    setStreamIndex(0);
    setProcessedLogs([]);
    setSelectedPayload(null);
    setTraces([]);
    setPartsDispatched({});
    addTrace("[SYSTEM] Simulation wiped. Pipeline parameters seeded with standard IDs.");
  };

  // Generate compliant M365 Adaptive Card JSON (Mirroring AdaptiveCardEngine.cs Output Exactly)
  const generateAdaptiveCardJson = (payload: DiagnosticsPayload) => {
    if (payload.complianceStatus === "SECURITY_VIOLATION_BLOCKED") {
      return JSON.stringify({
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "Container",
            style: "attention",
            items: [
              {
                type: "TextBlock",
                text: "CRITICAL SECURITY BOUNDARY BREACH",
                weight: "Bolder",
                color: "Attention",
                size: "Large"
              },
              {
                type: "TextBlock",
                text: payload.exceptionThrown,
                wrap: true,
                color: "Attention"
              }
            ]
          }
        ]
      }, null, 2);
    }

    const headerColor = payload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "Attention" : "Warning";
    const textStatus = payload.complianceStatus.replace(/_/g, " ");

    const structure = {
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "Container",
          style: "emphasis",
          bleed: true,
          items: [
            {
              type: "TextBlock",
              text: `VEKTOROPS TELEMETRY ALERT: ${payload.alert.registerErrorCode}`,
              size: "Medium",
              weight: "Bolder",
              color: headerColor
            },
            {
              type: "TextBlock",
              text: `DEVICE: ${payload.alert.deviceId} | TENANT: ${payload.alert.nodeTenantId}`,
              isSubtle: true,
              size: "Small",
              spacing: "None"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "Foundry IQ Register Diagnosis",
              weight: "Bolder",
              size: "Default"
            },
            {
              type: "FactSet",
              facts: [
                { title: "Mapped Register", value: payload.matchedRegister.registerName },
                { title: "Failing Bit Index", value: `Bit ${payload.matchedRegister.failingBit} of 32` },
                { title: "Description", value: payload.matchedRegister.description },
                { title: "Silicon Domain", value: payload.matchedRegister.hardwareLevel }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          style: "accent",
          items: [
            {
              type: "TextBlock",
              text: "Compliance & Lifecycle Bounds",
              weight: "Bolder"
            },
            {
              type: "TextBlock",
              text: `Log Timestamp: ${payload.alert.telemetryTimestamp}`,
              size: "Small",
              isSubtle: true
            },
            {
              type: "FactSet",
              facts: [
                { title: "SLA Target Limit", value: `${payload.slaMatched.responseTimeThresholdHours} Hours (Max Response)` },
                { title: "Contract Expiration", value: payload.slaMatched.expirationDate },
                { title: "Mitigation Path", value: payload.matchedRegister.diagnosticAction },
                { title: "System Compliance", value: textStatus }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Trigger Parts Dispatch",
          data: {
            action: "dispatch_parts",
            deviceId: payload.alert.deviceId,
            errorCode: payload.alert.registerErrorCode,
            mitigation: payload.matchedRegister.diagnosticAction
          }
        },
        {
          type: "Action.OpenUrl",
          title: "Review Silicon Datasheet",
          url: `https://vektorops.enterprise.internal/specifications/${payload.matchedRegister.registerName}`
        }
      ]
    };

    return JSON.stringify(structure, null, 2);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Simulation Console Controls (Left hand) */}
      <div className="xl:col-span-4 flex flex-col space-y-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <Sliders className="w-5 h-5 text-teal-400" />
              <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">Pipeline Settings</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono bg-teal-950 text-teal-400 border border-teal-800 px-2.5 py-0.5 rounded-full font-bold">
              Simulator Active
            </span>
          </div>

          {/* Active Tenant Context Setting */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Active Tenant Session Context Tokens</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">Locks Mcp credentials</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["TENANT-ALPHA", "TENANT-BETA", "TENANT-GAMMA"].map((tenant) => (
                <button
                  key={tenant}
                  onClick={() => {
                    setActiveTenant(tenant);
                    addTrace(`[SECURITY] Context token swapped. Token: '${tenant}' Active Session.`);
                  }}
                  className={`text-xs px-2 py-2 rounded-lg font-mono border transition-all ${
                    activeTenant === tenant
                      ? "bg-teal-500/20 text-teal-300 border-teal-500"
                      : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200"
                  }`}
                >
                  {tenant.replace("TENANT-", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Stream settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Ticking Interval</label>
              <select
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500 font-mono"
              >
                <option value={1000}>1.0s (Live)</option>
                <option value={2000}>2.0s (Normal)</option>
                <option value={4000}>4.0s (Slow)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Buffered Package Queue</label>
              <div className="text-sm font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <span>{streamIndex} / {logs.length}</span>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Execution Controls */}
          <div className="flex gap-2 pt-2">
            {isPlaying ? (
              <button
                onClick={() => {
                  setIsPlaying(false);
                  addTrace("[SYSTEM] Stream processing paused by master technician.");
                }}
                className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-lg py-2 text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Telemetry</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (streamIndex >= logs.length) setStreamIndex(0);
                  setIsPlaying(true);
                  addTrace("[SYSTEM] Starting async telemetry pipeline stream.");
                }}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg py-2 text-xs font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-teal-500/10"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Telemetry Stream</span>
              </button>
            )}

            <button
              onClick={processNextLog}
              disabled={isPlaying || streamIndex >= logs.length}
              className="px-3.5 bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center transition"
              title="Forward Ingestion Step"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={resetSimulator}
              className="px-3.5 bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center transition"
              title="Reset Database Parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Manual Inject Form */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">Direct Inject Injector</h4>
          </div>

          <form onSubmit={forceInjectCustomLog} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Target Core Node</label>
                <input
                  type="text"
                  name="deviceId"
                  placeholder="CPU-INTEL-SK-10"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Assigned Tenant</label>
                <select
                  name="tenantId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-500 font-mono"
                >
                  <option value="TENANT-ALPHA">ALPHA</option>
                  <option value="TENANT-BETA">BETA</option>
                  <option value="TENANT-GAMMA">GAMMA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Register Code</label>
                <select
                  name="registerErrorCode"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-500 font-mono"
                >
                  <option value="0xERR_77B">0xERR_77B</option>
                  <option value="0xERR_A4F">0xERR_A4F</option>
                  <option value="0xERR_F8C">0xERR_F8C</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Telemetry Hex Dump</label>
                <input
                  type="text"
                  name="hexDump"
                  placeholder="0xCCBB998822FF"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:bg-slate-750 transition rounded-lg py-2 text-xs font-bold font-mono tracking-wider flex items-center justify-center space-x-2"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              <span>INJECT INTO ACTIVE PIPELINE</span>
            </button>
          </form>
        </div>
      </div>

      {/* Center Console: Stream Table & Log list + Real-Time Telemetry Traces (Middle panel) */}
      <div className="xl:col-span-4 flex flex-col space-y-6">
        {/* Streamed Logs Ingress Queue */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col h-[340px] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-4.5 h-4.5 text-teal-400" />
              <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wide">Processed Incidents</h4>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
              {processedLogs.length} total
            </span>
          </div>

          <div className="flex-1 overflow-auto space-y-2.5 pr-1">
            {processedLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8 space-y-2">
                <Server className="w-10 h-10 text-slate-700 animate-pulse" />
                <span>Ingest a hardware telemetry stream to generate incident logs</span>
              </div>
            ) : (
              processedLogs.map((payload, index) => {
                const isViolation = payload.complianceStatus === "SECURITY_VIOLATION_BLOCKED";
                const isSelected = selectedPayload?.alert.deviceId === payload.alert.deviceId && 
                                   selectedPayload?.alert.telemetryTimestamp === payload.alert.telemetryTimestamp;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedPayload(payload)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start space-x-3 ${
                      isSelected 
                        ? isViolation 
                          ? "bg-red-950/25 border-red-500/80 ring-1 ring-red-500/30"
                          : "bg-teal-950/25 border-teal-500/80 ring-1 ring-teal-500/30"
                        : isViolation 
                          ? "bg-slate-900/40 border-red-950 hover:bg-slate-800/40 text-red-100"
                          : "bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/40 text-slate-100"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isViolation ? (
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                      ) : payload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold tracking-tight text-slate-200">
                          {payload.alert.registerErrorCode}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(payload.alert.telemetryTimestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">{payload.alert.deviceId}</p>
                      
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          isViolation 
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        }`}>
                          {payload.alert.nodeTenantId}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {payload.processingTimeMs.toFixed(1)} μs
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Telemetry Tracing Console Terminal (C# logger) */}
        <div className="bg-[#0b0f19] border border-slate-900 rounded-xl p-5 flex flex-col h-[280px] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-2.5">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-widest font-mono">
                System Telemetry Traces
              </h4>
            </div>
            <button
              onClick={() => setTraces([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-900"
            >
              Clear Console
            </button>
          </div>

          <div className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed select-text text-slate-300 bg-black/40 border border-slate-950 p-3 rounded-lg flex flex-col space-y-1 w-full max-w-full">
            {traces.length === 0 ? (
              <span className="text-slate-600 italic">No traces captured yet. Waiting for pipeline execution triggers...</span>
            ) : (
              traces.map((trace, i) => {
                let colorClass = "text-slate-300";
                if (trace.includes("[EXCEPTION")) colorClass = "text-red-400 font-bold bg-red-950/20";
                else if (trace.includes("[GUARDRAIL CRITICAL")) colorClass = "text-red-400 font-bold";
                else if (trace.includes("[GUARDRAIL]")) colorClass = "text-slate-400";
                else if (trace.includes("[FOUNDRY IQ]")) colorClass = "text-teal-300";
                else if (trace.includes("[INGESTION]")) colorClass = "text-cyan-400";
                else if (trace.includes("[SECURITY]")) colorClass = "text-emerald-400";
                else if (trace.includes("[CARD ENGINE]")) colorClass = "text-pink-400";
                
                return (
                  <div key={i} className={`py-0.5 break-all leading-normal px-1 rounded ${colorClass}`}>
                    {trace}
                  </div>
                );
              })
            )}
            <div ref={traceEndRef} />
          </div>
        </div>
      </div>

      {/* Target Render Panel: Copilot Card and Raw JSON Payload (Right hand side) */}
      <div className="xl:col-span-4 flex flex-col space-y-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col min-h-[640px] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <Shield className="w-5 h-5 text-teal-400" />
              <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">C# CEA Engine Outputs</h3>
            </div>
            {selectedPayload && (
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md">
                <span className="text-[10px] font-mono text-slate-400">
                  Time: {selectedPayload.processingTimeMs.toFixed(1)} μs
                </span>
              </div>
            )}
          </div>

          {!selectedPayload ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <Eye className="w-12 h-12 text-slate-700" />
              <span className="text-center font-sans">
                Select or process an incident in the list to inspect generated Adaptive Cards and telemetry JSON strings.
              </span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-5 min-h-0">
              {/* Dynamic M365 Adaptive Card Visual Renderer Preview */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  M365 Copilot Adaptive Card Render
                </div>

                {selectedPayload.complianceStatus === "SECURITY_VIOLATION_BLOCKED" ? (
                  <div className="bg-red-950/15 border border-red-500/40 rounded-xl p-5 text-slate-100 flex flex-col space-y-3">
                    <div className="flex items-center space-x-2 text-red-500">
                      <ShieldAlert className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wide">Boundary Violation Thrown!</span>
                    </div>
                    <p className="text-xs text-red-300/90 font-mono leading-relaxed bg-red-950/40 p-3 rounded-lg border border-red-500/10">
                      {selectedPayload.exceptionThrown}
                    </p>
                    <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      This alert occurred on tenant <span className="font-mono text-red-400 font-semibold">{selectedPayload.alert.nodeTenantId}</span>, but the pipeline was executing under an authorized <span className="font-mono text-teal-400 font-semibold">{activeTenant}</span> key context. The system executed exception boundaries successfully, returning no payload and preventing leakage.
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col">
                    {/* Header (Emphasis block) */}
                    <div className={`p-4 ${
                      selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                        ? "bg-amber-950/20 border-b border-amber-500/20"
                        : "bg-slate-900 border-b border-slate-800"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded ${
                          selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "Attention Required" : "Diagnostic Advisory"}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">v1.5 Adaptive</span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                        VEKTOROPS TELEMETRY ALERT: {selectedPayload.alert.registerErrorCode}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        DEVICE: {selectedPayload.alert.deviceId} | TENANT: {selectedPayload.alert.nodeTenantId}
                      </p>
                    </div>

                    {/* Body contents */}
                    <div className="p-4 space-y-4">
                      {/* Register Diagnosis */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Foundry IQ Register Diagnosis
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/30 text-xs space-y-2">
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">Mapped Register</span>
                            <span className="col-span-8 text-teal-300 font-mono font-bold truncate">
                              {selectedPayload.matchedRegister.registerName}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">Failing Bit Index</span>
                            <span className="col-span-8 text-slate-300 font-mono">
                              Bit {selectedPayload.matchedRegister.failingBit} of 32
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">Silicon Domain</span>
                            <span className="col-span-8 text-slate-300 font-medium">
                              {selectedPayload.matchedRegister.hardwareLevel}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-medium">Description</span>
                            <span className="col-span-8 text-slate-300 leading-relaxed">
                              {selectedPayload.matchedRegister.description}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Compliance & SLA Bounds */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Compliance & Lifecycle Bounds
                        </div>
                        <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-850 text-xs space-y-2">
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">SLA Target Limit</span>
                            <span className="col-span-8 text-white font-mono font-semibold">
                              {selectedPayload.slaMatched.responseTimeThresholdHours} Hours (Max Response)
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">Expiration Contract</span>
                            <span className="col-span-8 text-slate-300 font-mono">
                              {selectedPayload.slaMatched.expirationDate}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-slate-800/40">
                            <span className="col-span-4 text-slate-500 font-medium">System Compliance</span>
                            <span className={`col-span-8 font-semibold uppercase ${
                              selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}>
                              {selectedPayload.complianceStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-medium">Mitigation Path</span>
                            <span className="col-span-8 text-slate-100 font-medium italic">
                              {selectedPayload.matchedRegister.diagnosticAction}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SLA Warning box if out of compliance */}
                      {selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" && (
                        <div className="bg-amber-950/10 border border-amber-550/30 p-2.5 rounded-lg flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-300/90 leading-tight">
                            WARNING: Asset warranty is expired! Replacement operations may be subject to manual invoice processing outside the standard automated lifecycle contracts.
                          </p>
                        </div>
                      )}

                      {/* Action Blocks */}
                      <div className="flex items-center space-x-3 pt-2">
                        {partsDispatched[selectedPayload.alert.deviceId + selectedPayload.alert.telemetryTimestamp] ? (
                          <div className="flex-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Parts Ordered Successfully</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              addTrace(`[ACTION INITIATED] Action.Submit fired: Parts Dispatch request sent to logistics pipeline.`);
                              addTrace(`  Payload details: Device ${selectedPayload.alert.deviceId} -> Error Code ${selectedPayload.alert.registerErrorCode}`);
                              setPartsDispatched((prev) => ({
                                ...prev,
                                [selectedPayload.alert.deviceId + selectedPayload.alert.telemetryTimestamp]: true
                              }));
                            }}
                            className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg py-2 text-xs font-bold text-center transition tracking-wide active:scale-95"
                          >
                            Trigger Parts Dispatch
                          </button>
                        )}
                        
                        <a
                          href={`https://vektorops.enterprise.internal/specifications/${selectedPayload.matchedRegister.registerName}`}
                          onClick={(e) => {
                            e.preventDefault();
                            addTrace(`[ACTION INITIATED] Action.OpenUrl: Review Silicon Datasheet request for register mapping.`);
                          }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center space-x-1 transition"
                        >
                          <span>Review Datasheet</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw JSON Structure Panel */}
              <div className="space-y-2 flex-1 flex flex-col min-h-[160px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  Adaptive Card JSON String Stream
                </div>
                <div className="flex-1 bg-slate-950 rounded-xl border border-slate-900 p-3 overflow-auto font-mono text-[10px] leading-tight text-slate-400 h-44">
                  <pre className="select-all">
                    <code>{generateAdaptiveCardJson(selectedPayload)}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
