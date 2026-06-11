import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, 
  Terminal, Server, Shield, Cpu, RefreshCw, Send, Eye, Network, ExternalLink, Sliders,
  Upload, Check, Trash2, Activity, FileJson
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
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
  },
  "0xERR_OVR": {
    errorCode: "0xERR_OVR",
    registerName: "ALU_REG_INTEG_OVERFLOW",
    failingBit: 31,
    description: "Arithmetic register overflow detected in ALU accumulator register. Accumulation register holding state has run past maximum 64-bit capacity due to high sampling clock iteration.",
    hardwareLevel: "Arithmetic Logic Unit",
    diagnosticAction: "Dispatch auto-clear overflow bit interrupts, scale instruction pipeline back, and clear ALU accumulation cache."
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

interface TelemetrySimulatorProps {
  activeTenant: string;
  setActiveTenant: (tenant: string) => void;
  processedLogs: DiagnosticsPayload[];
  setProcessedLogs: React.Dispatch<React.SetStateAction<DiagnosticsPayload[]>>;
}

export function TelemetrySimulator({ 
  activeTenant, 
  setActiveTenant,
  processedLogs,
  setProcessedLogs
}: TelemetrySimulatorProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [speedMs, setSpeedMs] = useState<number>(2000);
  
  const [logs, setLogs] = useState<HardwareAlertLog[]>(DEFAULT_EVENT_STREAM);
  const [selectedPayload, setSelectedPayload] = useState<DiagnosticsPayload | null>(null);
  const [traces, setTraces] = useState<string[]>([]);
  const [partsDispatched, setPartsDispatched] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Auto-Ingest State
  const [autoIngest, setAutoIngest] = useState<boolean>(false);

  // Custom limit thresholds parameters
  const [tempThreshold, setTempThreshold] = useState<number>(85);
  const [voltageDevThreshold, setVoltageDevThreshold] = useState<number>(0.08); // absolute deviation from standard 1.20v PMIC
  const [errorRateThreshold, setErrorRateThreshold] = useState<number>(15);    // signal frame collisions %

  // Batch Loader state
  const [batchRawJson, setBatchRawJson] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [middleTab, setMiddleTab] = useState<"queue" | "batch">("queue");
  const [batchSummary, setBatchSummary] = useState<{
    total: number;
    success: number;
    violations: number;
    outOfWarranty: number;
    thresholdExceeded: number;
    avgLatencyUs: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const traceEndRef = useRef<HTMLDivElement | null>(null);

  // Modal and Live Chart states
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [chartData, setChartData] = useState<{ time: string; frequency: number; severity: number }[]>([
    { time: "-60s", frequency: 2, severity: 3 },
    { time: "-50s", frequency: 4, severity: 5 },
    { time: "-40s", frequency: 3, severity: 2 },
    { time: "-30s", frequency: 5, severity: 4 },
    { time: "-20s", frequency: 2, severity: 8 },
    { time: "-10s", frequency: 4, severity: 3 },
    { time: "0s (now)", frequency: 0, severity: 0 },
  ]);

  // Handle rolling metrics chart timer (shifts every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => {
        const next = prev.slice(1);
        const times = ["-50s", "-40s", "-30s", "-20s", "-10s", "-5s"];
        const updated = next.map((item, idx) => ({
          ...item,
          time: times[idx] || item.time
        }));
        updated.push({ time: "0s (now)", frequency: 0, severity: 0 });
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Export current session logs stream function
  const exportLogStream = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processedLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `vektorops_compliance_audit_trail_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addTrace(`[COMPLIANCE] Exported compliance audit trail containing ${processedLogs.length} incident records.`);
    } catch (err) {
      addTrace(`[ERROR] Export failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

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

  // Auto-Ingest Interval (Interval Stream)
  useEffect(() => {
    let intervalId: any;
    if (autoIngest) {
      addTrace(`[AUTO-INGEST] Continuous synthetic pipeline activated. Ingesting every 3.0 seconds.`);
      intervalId = setInterval(() => {
        // Generate a synthetic hardware alert
        const deviceTemplates = [
          { id: "CPU-INTEL-SK-10", tenant: "TENANT-ALPHA", code: "0xERR_77B" },
          { id: "GPU-AMD-RYZ88", tenant: "TENANT-ALPHA", code: "0xERR_A4F" },
          { id: "FPGA-XIL-ACC-4", tenant: "TENANT-ALPHA", code: "0xERR_F8C" },
          { id: "NODE-ROUTER-P8", tenant: "TENANT-BETA", code: "0xERR_F8C" },
          { id: "MEM-SEC-BETA-2", tenant: "TENANT-BETA", code: "0xERR_A4F" },
          { id: "CPU-INTEL-ULT-2", tenant: "TENANT-GAMMA", code: "0xERR_A4F" },
          { id: "GPU-AMD-FIRE9", tenant: "TENANT-ALPHA", code: "0xERR_77B" }
        ];
        const randomTemplate = deviceTemplates[Math.floor(Math.random() * deviceTemplates.length)];
        
        // 75% match activeTenant to prevent constant security block spam unless wanted
        const tokenMatch = Math.random() < 0.75;
        const tenantToAssign = tokenMatch 
          ? activeTenant 
          : (randomTemplate.tenant === activeTenant 
              ? (activeTenant === "TENANT-ALPHA" ? "TENANT-BETA" : "TENANT-ALPHA") 
              : randomTemplate.tenant);

        // Generate metrics relative to threshold limits randomly
        const willTempFail = Math.random() < 0.40;
        const tempObj = willTempFail ? (tempThreshold + 2 + Math.random() * 8) : (tempThreshold - 15 + Math.random() * 8);

        const willVoltFail = Math.random() < 0.30;
        const voltObj = willVoltFail ? (1.20 - (voltageDevThreshold + 0.05 + Math.random() * 0.05)) : 1.20;

        const willErrorFail = Math.random() < 0.35;
        const errorObj = willErrorFail ? (errorRateThreshold + 1 + Math.random() * 9) : (errorRateThreshold - 8 + Math.random() * 3);

        const synthetic: HardwareAlertLog = {
          deviceId: randomTemplate.id,
          nodeTenantId: tenantToAssign,
          registerErrorCode: randomTemplate.code,
          hexDumpValue: "0x" + Math.floor(Math.random() * 1000000).toString(16).toUpperCase() + "FFA",
          telemetryTimestamp: new Date().toISOString()
        };

        // Attach numbers
        (synthetic as any).temperature = tempObj;
        (synthetic as any).voltage = voltObj;
        (synthetic as any).errorRate = errorObj;

        addTrace(`[AUTO-INGEST] Tick trigger: Processing real-time hardware telemetry...`);
        const payload = processLog(synthetic);
        setProcessedLogs((prev) => [payload, ...prev]);
        setSelectedPayload(payload);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoIngest, activeTenant, tempThreshold, voltageDevThreshold, errorRateThreshold]);

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
      
      // Update chart metrics for security violation (critical severity 10)
      setChartData((prev) => {
        return prev.map((item, i) => {
          if (i === prev.length - 1) {
            return {
              ...item,
              frequency: item.frequency + 1,
              severity: Math.max(item.severity, 10),
            };
          }
          return item;
        });
      });
      
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
    
    // Evaluate thresholds
    const logAny = log as any;
    const tempValue = typeof logAny.temperature === "number" ? logAny.temperature : (log.registerErrorCode === "0xERR_77B" ? 82 + Math.random() * 8 : 65 + Math.random() * 15);
    const voltageValue = typeof logAny.voltage === "number" ? logAny.voltage : (log.registerErrorCode === "0xERR_A4F" ? 1.20 - (voltageDevThreshold + 0.05) : 1.20);
    const errorRateValue = typeof logAny.errorRate === "number" ? logAny.errorRate : (log.registerErrorCode === "0xERR_F8C" ? errorRateThreshold + 4.2 : 1 + Math.random() * 5);

    const isTempExceeded = tempValue >= tempThreshold;
    const isVoltExceeded = Math.abs(voltageValue - 1.20) >= voltageDevThreshold;
    const isErrorExceeded = errorRateValue >= errorRateThreshold;
    const thresholdExceeded = isTempExceeded || isVoltExceeded || isErrorExceeded;

    if (thresholdExceeded) {
      addTrace(`[SYS PRIORITY: HIGH] 🔥 HARDWARE INGRESS LIMIT EXCEEDED on ${log.deviceId}!`);
      if (isTempExceeded) addTrace(`  [ALERT] Temperature: ${tempValue.toFixed(1)}°C >= Custom limit: ${tempThreshold}°C`);
      if (isVoltExceeded) addTrace(`  [ALERT] Voltage Dev: ${Math.abs(voltageValue - 1.25).toFixed(2)}V >= Dev limit: ${voltageDevThreshold}V`);
      if (isErrorExceeded) addTrace(`  [ALERT] System Frame Loss: ${errorRateValue.toFixed(1)}% >= Loss limit: ${errorRateThreshold}%`);
    }

    const compliance = thresholdExceeded ? "CRITICAL_SYS_THRESHOLD_EXCEEDED" : (isExpired ? "OUT_OF_WARRANTY_COMPLIANCE" : 
                         contract.responseTimeThresholdHours <= 4 ? "CRITICAL_CLASS_GOLD_SLA" : "STANDARD_OPERATIONAL_SLA");

    addTrace(`[SLA RESOLVER] Match successfully mapped standard contract threshold: ${contract.responseTimeThresholdHours}H. Compl.: ${compliance}`);

    const endMicros = performance.now();
    const elapsedMicros = (endMicros - startMicros) * 1000.0;
    addTrace(`[ENGINE] Parsed successfully. Execution duration: ${elapsedMicros.toFixed(2)} microseconds.`);
    addTrace(`[CARD ENGINE] Compiled record outputs into Copilot Adaptive Card JSON format.`);

    // Update chart metrics for success path (Severity scaled to compliance status)
    const logSeverity = compliance === "CRITICAL_SYS_THRESHOLD_EXCEEDED" ? 8 : (compliance === "OUT_OF_WARRANTY_COMPLIANCE" ? 6 : compliance === "CRITICAL_CLASS_GOLD_SLA" ? 4 : 2);
    setChartData((prev) => {
      return prev.map((item, i) => {
        if (i === prev.length - 1) {
          return {
            ...item,
            frequency: item.frequency + 1,
            severity: Math.max(item.severity, logSeverity),
          };
        }
        return item;
      });
    });

    const alertWithMetrics = {
      ...log,
      temperature: tempValue,
      voltage: voltageValue,
      errorRate: errorRateValue
    };

    return {
      alert: alertWithMetrics,
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

  const loadSampleBatch = () => {
    const sample = [
      {
        "deviceId": "CPU-INTEL-SK-10",
        "nodeTenantId": activeTenant,
        "registerErrorCode": "0xERR_77B",
        "hexDumpValue": "0x12FAECAB99D2",
        "telemetryTimestamp": new Date().toISOString()
      },
      {
        "deviceId": "GPU-AMD-RYZ88",
        "nodeTenantId": activeTenant,
        "registerErrorCode": "0xERR_A4F",
        "hexDumpValue": "0xFF88CC22BBA9",
        "telemetryTimestamp": new Date().toISOString()
      },
      {
        "deviceId": "FPGA-XIL-ACC-4",
        "nodeTenantId": (activeTenant === "TENANT-ALPHA") ? "TENANT-BETA" : "TENANT-ALPHA", 
        "registerErrorCode": "0xERR_F8C",
        "hexDumpValue": "0x112233445566",
        "telemetryTimestamp": new Date().toISOString()
      }
    ];
    setBatchRawJson(JSON.stringify(sample, null, 2));
    addTrace("[BATCH SYSTEM] Preloaded sample JSON log payload template.");
  };

  const handleBatchIngestSubmit = (rawJson: string) => {
    if (!rawJson.trim()) {
      addTrace("[BATCH SYSTEM] [ERROR] JSON input buffer is empty.");
      return;
    }
    try {
      const parsedArray = JSON.parse(rawJson);
      if (!Array.isArray(parsedArray)) {
        addTrace("[BATCH SYSTEM] [ERROR] Ingestion payload must be a root-level JSON Array.");
        return;
      }

      addTrace(`[BATCH SYSTEM] Commencing bulk batch processing of ${parsedArray.length} diagnostic frames...`);
      
      let successCount = 0;
      let violationCount = 0;
      let thresholdExceededCount = 0;
      let outOfWarrantyCount = 0;
      let totalProcessingTime = 0;
      const parsedPayloads: DiagnosticsPayload[] = [];

      parsedArray.forEach((item: any, idx: number) => {
        const log: HardwareAlertLog = {
          deviceId: item.deviceId || `NODE-DEVICE-EXT-${idx}`,
          nodeTenantId: item.nodeTenantId || activeTenant,
          registerErrorCode: item.registerErrorCode || "0xERR_77B",
          hexDumpValue: item.hexDumpValue || "0x0000000000CC",
          telemetryTimestamp: item.telemetryTimestamp || new Date().toISOString()
        };

        if (typeof item.temperature === "number") (log as any).temperature = item.temperature;
        if (typeof item.voltage === "number") (log as any).voltage = item.voltage;
        if (typeof item.errorRate === "number") (log as any).errorRate = item.errorRate;

        const payload = processLog(log);
        parsedPayloads.push(payload);
        totalProcessingTime += payload.processingTimeMs;

        if (payload.complianceStatus === "SECURITY_VIOLATION_BLOCKED") {
          violationCount++;
        } else if (payload.complianceStatus === "CRITICAL_SYS_THRESHOLD_EXCEEDED") {
          thresholdExceededCount++;
          successCount++;
        } else if (payload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE") {
          outOfWarrantyCount++;
          successCount++;
        } else {
          successCount++;
        }
      });

      // Update parent processedLogs
      setProcessedLogs((prev) => [...parsedPayloads, ...prev]);
      if (parsedPayloads.length > 0) {
        setSelectedPayload(parsedPayloads[0]);
      }

      const avgUs = totalProcessingTime / parsedArray.length;
      setBatchSummary({
        total: parsedArray.length,
        success: successCount,
        violations: violationCount,
        outOfWarranty: outOfWarrantyCount,
        thresholdExceeded: thresholdExceededCount,
        avgLatencyUs: avgUs
      });

      addTrace(`[BATCH SYSTEM] Batch transaction committed successfully. Processed ${parsedArray.length} items. Violations Enforced: ${violationCount}, Core Limits Exceeded: ${thresholdExceededCount}. Average Latency: ${avgUs.toFixed(1)} microseconds.`);
    } catch (err: any) {
      addTrace(`[BATCH SYSTEM] [ERROR] Failed to compile batch array. JsonException: ${err.message}`);
    }
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
                { title: "System Compliance", value: textStatus },
                { title: "Core Temperature", value: (payload.alert as any).temperature ? `${(payload.alert as any).temperature.toFixed(1)}°C` : "N/A" },
                { title: "Voltage Sensor", value: (payload.alert as any).voltage ? `${(payload.alert as any).voltage.toFixed(2)}V` : "N/A" },
                { title: "Align Error Rate", value: (payload.alert as any).errorRate ? `${(payload.alert as any).errorRate.toFixed(2)}%` : "N/A" }
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

  const filteredProcessedLogs = processedLogs.filter((payload) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const dId = payload.alert.deviceId || "";
    const regCode = payload.alert.registerErrorCode || "";
    return dId.toLowerCase().includes(term) || regCode.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 select-text">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Simulation Console Controls (Left hand) */}
      <div className="xl:col-span-4 flex flex-col space-y-6">
        <div className="bg-white border-4 border-[#141414] p-5 space-y-5 shadow-[4px_4px_0px_#141414]">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
            <div className="flex items-center space-x-2.5">
              <Sliders className="w-5 h-5 text-red-650" />
              <h3 className="font-extrabold text-[#141414] text-xs font-mono tracking-wider uppercase">Pipeline Settings</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono bg-[#141414] text-[#E4E3E0] border-2 border-[#141414] px-2.5 py-0.5 font-bold">
              Simulator Live
            </span>
          </div>

          {/* Active Tenant Context Setting */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#141414] flex items-center justify-between font-mono uppercase">
              <span>Active Tenant Session Context Tokens</span>
              <span className="text-[9px] font-mono text-slate-500 font-normal">Locks credential store</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["TENANT-ALPHA", "TENANT-BETA", "TENANT-GAMMA"].map((tenant) => (
                <button
                  key={tenant}
                  onClick={() => {
                    setActiveTenant(tenant);
                    addTrace(`[SECURITY] Context token swapped. Token: '${tenant}' Active Session.`);
                  }}
                  className={`text-xs px-2 py-2 font-mono border-2 font-bold transition-all ${
                    activeTenant === tenant
                      ? "bg-[#141414] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                      : "bg-white text-slate-700 border-slate-300 hover:border-[#141414] hover:text-[#141414]"
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
              <label className="text-xs text-[#141414] font-bold font-mono uppercase">Ticking Interval</label>
              <select
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-full bg-white border-2 border-[#141414] text-[#141414] text-xs p-2 outline-none font-mono font-bold"
              >
                <option value={1000}>1.0s (Live)</option>
                <option value={2000}>2.0s (Normal)</option>
                <option value={4000}>4.0s (Slow)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#141414] font-bold font-mono uppercase">Queue Buffer</label>
              <div className="text-sm font-mono text-[#141414] bg-[#E4E3E0] border-2 border-[#141414] p-2 flex items-center justify-between font-extrabold">
                <span>{streamIndex} / {logs.length}</span>
                <span className="w-2.5 h-2.5 bg-red-650 inline-block animate-pulse" />
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
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-[#141414] border-2 border-[#141414] py-2 text-xs font-bold font-mono flex items-center justify-center space-x-2 transition shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
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
                className="flex-1 bg-[#141414] hover:bg-slate-800 text-white border-2 border-[#141414] py-2 text-xs font-black font-mono flex items-center justify-center space-x-2 transition shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Stream</span>
              </button>
            )}

            <button
              onClick={processNextLog}
              disabled={isPlaying || streamIndex >= logs.length}
              className="px-3.5 bg-white text-[#141414] border-2 border-[#141414] disabled:opacity-40 text-xs font-bold flex items-center justify-center transition shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Forward Ingestion Step"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={resetSimulator}
              className="px-3.5 bg-white text-[#141414] border-2 border-[#141414] text-xs font-bold flex items-center justify-center transition shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Reset Database Parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Continuous Auto-Ingest stream toggle */}
          <div className="border-t-2 border-dashed border-slate-250 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#141414] uppercase font-mono flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-red-655" /> Live Auto-Ingestion (3s)
            </span>
            <button
              onClick={() => {
                setAutoIngest(!autoIngest);
                if (!autoIngest) {
                  setIsPlaying(false); // disable standard manual stream
                }
                addTrace(`[AUTO-INGEST] Swapped state: ${!autoIngest ? "STREAMING" : "PAUSED"}`);
              }}
              className={`text-[9px] px-2 py-1 font-mono font-bold uppercase transition border flex items-center gap-1.5 ${
                autoIngest
                  ? "bg-red-650 text-white border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-slate-705 border-slate-300 hover:border-black"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoIngest ? "bg-white animate-pulse" : "bg-slate-400"}`}></span>
              {autoIngest ? "Active" : "Disabled"}
            </button>
          </div>

          <div className="border-t-2 border-dashed border-slate-250 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#141414] uppercase font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-600 animate-pulse" /> Force Register Overflow
            </span>
            <button
              onClick={() => {
                const overflowLog: HardwareAlertLog = {
                  deviceId: `CORE-ALU-OVERFLOW-INTEL-99`,
                  nodeTenantId: activeTenant,
                  registerErrorCode: "0xERR_OVR",
                  hexDumpValue: "0xFFFFFFFFFFFFFFFF",
                  telemetryTimestamp: new Date().toISOString()
                };
                
                // Attach custom hardware limits metrics
                (overflowLog as any).temperature = 94.5;
                (overflowLog as any).voltage = 1.38;
                (overflowLog as any).errorRate = 29.2;

                addTrace(`[MANUAL OVERFLOW] Initiating live register buffer overflow injection event on active Node context...`);
                const payload = processLog(overflowLog);
                setProcessedLogs((prev) => [payload, ...prev]);
                setSelectedPayload(payload);
              }}
              className="text-[9px] px-2 py-1 font-mono font-bold uppercase transition border flex items-center gap-1.5 bg-purple-600 text-white border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] hover:bg-purple-700 hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Inject event
            </button>
          </div>
        </div>

        {/* Custom Severity Threshold Panel */}
        <div className="bg-white border-4 border-[#141414] p-5 space-y-4 shadow-[4px_4px_0px_#141414]">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2.5">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-red-650" />
              <h4 className="font-extrabold text-[#141414] text-xs font-mono tracking-wider uppercase">Severity Thresholds</h4>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono bg-orange-500 text-white border border-black px-1.5 py-0.5 font-bold shadow-[1px_1px_0px_#141414]">
              Limit Control
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* Temp */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-[#141414]">
                <span>Silicon Temp Limit:</span>
                <span className="text-red-650 font-extrabold">{tempThreshold}°C</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="1"
                value={tempThreshold}
                onChange={(e) => {
                  setTempThreshold(Number(e.target.value));
                  addTrace(`[SYS PROFILE] Adjusting Core Temperature redline threshold to ${e.target.value}°C.`);
                }}
                className="w-full h-1 bg-[#E4E3E0] rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
              <p className="text-[9px] text-slate-400 font-sans leading-tight">Flags tags above this thermal limit as critical.</p>
            </div>

            {/* Voltage */}
            <div className="space-y-1 pt-2 border-t border-dashed border-slate-202">
              <div className="flex justify-between font-bold text-[#141414]">
                <span>PMIC Rail Dev Peak:</span>
                <span className="text-orange-500 font-extrabold">±{voltageDevThreshold.toFixed(2)}V</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.20"
                step="0.01"
                value={voltageDevThreshold}
                onChange={(e) => {
                  setVoltageDevThreshold(Number(e.target.value));
                  addTrace(`[SYS PROFILE] Adjusting PMIC Voltage Deviation limit margin to ±${Number(e.target.value).toFixed(2)}V.`);
                }}
                className="w-full h-1 bg-[#E4E3E0] rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
              <p className="text-[9px] text-slate-400 font-sans leading-tight">Alert on secondary channel fluctuations from nominal 1.20V limit.</p>
            </div>

            {/* Error rate */}
            <div className="space-y-1 pt-2 border-t border-dashed border-slate-210">
              <div className="flex justify-between font-bold text-[#141414]">
                <span>PCIe Frame Collision:</span>
                <span className="text-red-650 font-extrabold">{errorRateThreshold}% Max</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={errorRateThreshold}
                onChange={(e) => {
                  setErrorRateThreshold(Number(e.target.value));
                  addTrace(`[SYS PROFILE] Adjusting Frame Collision tolerance cap to ${e.target.value}%.`);
                }}
                className="w-full h-1 bg-[#E4E3E0] rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
              <p className="text-[9px] text-slate-400 font-sans leading-tight">Retrain synchronizers when package error limits degrade.</p>
            </div>
          </div>
        </div>

        {/* Manual Inject Form */}
        <div className="bg-white border-4 border-[#141414] p-5 space-y-4 shadow-[4px_4px_0px_#141414]">
          <div className="flex items-center space-x-2 border-b-2 border-[#141414] pb-2.5">
            <Cpu className="w-4 h-4 text-red-650" />
            <h4 className="font-extrabold text-[#141414] text-xs font-mono tracking-widest uppercase">Direct Inject Injector</h4>
          </div>

          <form onSubmit={forceInjectCustomLog} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Target Core Node</label>
                <input
                  type="text"
                  name="deviceId"
                  placeholder="CPU-INTEL-SK-10"
                  className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs text-[#141414] outline-none font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Assigned Tenant</label>
                <select
                  name="tenantId"
                  className="w-full bg-white border-2 border-[#141414] px-2 py-1.5 text-xs text-[#141414] outline-none font-mono font-bold"
                >
                  <option value="TENANT-ALPHA">ALPHA</option>
                  <option value="TENANT-BETA">BETA</option>
                  <option value="TENANT-GAMMA">GAMMA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Register Code</label>
                <select
                  name="registerErrorCode"
                  className="w-full bg-white border-2 border-[#141414] px-2 py-1.5 text-xs text-[#141414] outline-none font-mono font-bold"
                >
                  <option value="0xERR_77B">0xERR_77B</option>
                  <option value="0xERR_A4F">0xERR_A4F</option>
                  <option value="0xERR_F8C">0xERR_F8C</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Telemetry Hex Dump</label>
                <input
                  type="text"
                  name="hexDump"
                  placeholder="0xCCBB998822FF"
                  className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs text-[#141414] outline-none font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#141414] text-white hover:bg-slate-800 transition py-2 text-xs font-black font-mono tracking-wider flex items-center justify-center space-x-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-mono uppercase"
            >
              <Send className="w-3 h-3 text-red-500" />
              <span>INJECT INTO ACTIVE PIPELINE</span>
            </button>
          </form>
        </div>
      </div>
          {/* Center Console: Stream Table & Log list + Real-Time Telemetry Traces (Middle panel) */}
      <div className="xl:col-span-4 flex flex-col space-y-6">
        {/* Streamed Logs Ingress Queue */}
        <div className="bg-white border-4 border-[#141414] p-5 flex-1 flex flex-col h-[340px] shadow-[4px_4px_0px_#141414]">
          {/* Dual Tab switcher header */}
          <div className="flex border-b-2 border-[#141414] pb-2 mb-3 items-center justify-between">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setMiddleTab("queue")}
                className={`text-[10px] font-mono font-black px-2.5 py-1 uppercase tracking-tight transition ${
                  middleTab === "queue"
                    ? "bg-[#141414] text-white"
                    : "text-slate-600 hover:text-black hover:bg-slate-100"
                }`}
              >
                Incidents ({processedLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setMiddleTab("batch")}
                className={`text-[10px] font-mono font-black px-2.5 py-1 uppercase tracking-tight transition ${
                  middleTab === "batch"
                    ? "bg-[#141414] text-white"
                    : "text-slate-600 hover:text-black hover:bg-slate-100"
                }`}
              >
                Batch loader
              </button>
            </div>
            {middleTab === "queue" && processedLogs.length > 0 && (
              <button
                type="button"
                onClick={exportLogStream}
                className="text-[9px] uppercase font-mono font-bold bg-[#141414] hover:bg-neutral-800 text-white px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0px_#141414] cursor-pointer"
                title="Export Current Session Compliance Audit Stream"
              >
                Export Audit JSON
              </button>
            )}
          </div>

          {middleTab === "queue" ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              {/* Search filter input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by hardware ID or error code..."
                  className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs text-[#141414] placeholder-slate-400 outline-none font-mono font-bold shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-black font-black"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto space-y-2.5 pr-1">
                {filteredProcessedLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-550 text-xs py-8 space-y-2">
                    <Server className="w-10 h-10 text-slate-400" />
                    <span>
                      {processedLogs.length === 0 
                        ? "Ingest a hardware telemetry stream to generate incident logs"
                        : "No matching incidents found"}
                    </span>
                  </div>
                ) : (
                  filteredProcessedLogs.map((payload, index) => {
                    const isViolation = payload.complianceStatus === "SECURITY_VIOLATION_BLOCKED";
                    const isOverflow = payload.alert.registerErrorCode === "0xERR_OVR";
                    const isSelected = selectedPayload?.alert.deviceId === payload.alert.deviceId && 
                                       selectedPayload?.alert.telemetryTimestamp === payload.alert.telemetryTimestamp;

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedPayload(payload)}
                        className={`w-full text-left p-3 border-2 transition-all flex items-start space-x-3 rounded-none ${
                          isSelected 
                            ? isViolation 
                              ? "bg-red-55 border-red-600 ring-2 ring-red-650"
                              : isOverflow
                              ? "bg-purple-100/60 border-purple-600 ring-2 ring-purple-600 shadow-[2px_2px_0px_#7c3aed]"
                              : "bg-[#E4E3E0] border-[#141414] ring-2 ring-[#141414]"
                            : isViolation 
                              ? "bg-red-55 border-red-200 hover:bg-red-100/35 text-red-950"
                              : isOverflow
                              ? "bg-purple-50/50 border-purple-200 hover:bg-purple-100/35 text-purple-950"
                              : "bg-white border-slate-300 hover:border-[#141414] text-[#141414]"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isViolation ? (
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                          ) : isOverflow ? (
                            <Cpu className="w-4 h-4 text-purple-600 animate-pulse" />
                          ) : payload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : payload.complianceStatus === "CRITICAL_SYS_THRESHOLD_EXCEEDED" ? (
                            <Sliders className="w-4 h-4 text-orange-555 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-mono text-xs font-extrabold tracking-tight ${isOverflow ? "text-purple-700" : "text-[#141414]"}`}>
                              {payload.alert.registerErrorCode}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(payload.alert.telemetryTimestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-mono truncate">{payload.alert.deviceId}</p>
                          
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isViolation 
                                ? "bg-red-600 text-white border-[#141414]"
                                : isOverflow
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-[#141414] text-white border-[#141414]"
                            }`}>
                              {payload.alert.nodeTenantId}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {payload.processingTimeMs.toFixed(1)} μs
                            </span>
                            {payload.complianceStatus === "CRITICAL_SYS_THRESHOLD_EXCEEDED" && (
                              <span className="text-[8px] bg-orange-100 text-orange-700 font-bold border border-orange-300 px-1 py-0.1 font-mono rounded uppercase animate-pulse">
                                Limit Exceeded
                              </span>
                            )}
                            {isOverflow && (
                              <span className="text-[8px] bg-purple-100 text-purple-750 font-bold border border-purple-300 px-1 py-0.1 font-mono rounded uppercase">
                                Overflow Alert
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-3 overflow-auto pr-1">
              {batchSummary && (
                <div className="bg-[#141414] text-[#E4E3E0] p-2 border-2 border-dashed border-red-500 space-y-2">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-1 flex-wrap">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest font-mono">
                      Pipeline Aggregate Metrics Report
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchSummary(null)}
                      className="text-[8px] text-slate-400 hover:text-white underline font-mono cursor-pointer"
                    >
                      Dismiss Report
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px]">
                    <div className="bg-black/30 p-1 rounded">
                      <span className="text-slate-400 block text-[7px] uppercase">Ingested</span>
                      <strong className="text-white text-[11px]">{batchSummary.total}</strong>
                    </div>
                    <div className="bg-black/30 p-1 rounded">
                      <span className="text-slate-400 block text-[7px] uppercase">Aligned</span>
                      <strong className="text-emerald-400 text-[11px]">{batchSummary.success}</strong>
                    </div>
                    <div className="bg-black/30 p-1 rounded">
                      <span className="text-slate-400 block text-[7px] uppercase">Enforced</span>
                      <strong className="text-purple-400 text-[11px]">{batchSummary.violations}</strong>
                    </div>
                    <div className="bg-black/30 p-1 rounded col-span-2">
                      <span className="text-slate-400 block text-[7px] uppercase font-black">Limit Faults</span>
                      <strong className="text-orange-400 text-[11px]">{batchSummary.thresholdExceeded}</strong>
                    </div>
                  </div>
                  <div className="text-[8.5px] font-mono text-cyan-400 text-right">
                    Average processing stack time: <strong className="text-white">{batchSummary.avgLatencyUs.toFixed(1)} μs</strong>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600 font-mono">Paste logs array or drop a JSON file:</span>
                  <div className="space-x-1.5 font-mono text-[9px] flex items-center">
                    <button
                      type="button"
                      onClick={loadSampleBatch}
                      className="text-slate-705 underline focus:outline-none cursor-pointer font-bold"
                    >
                      Load Sample
                    </button>
                    <span className="text-slate-350">|</span>
                    <label className="text-slate-705 underline focus:outline-none cursor-pointer font-bold">
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target && typeof event.target.result === "string") {
                                setBatchRawJson(event.target.result);
                                addTrace(`[BATCH SYSTEM] Loaded JSON file content via picker: ${file.name} (${file.size} bytes).`);
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-slate-350">|</span>
                    <button
                      type="button"
                      onClick={() => setBatchRawJson("")}
                      className="text-red-650 underline focus:outline-none cursor-pointer font-bold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed p-1 transition rounded-none ${
                    isDragOver ? "border-red-600 bg-red-50/10" : "border-slate-300"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target && typeof event.target.result === "string") {
                          setBatchRawJson(event.target.result);
                          addTrace(`[BATCH SYSTEM] Loaded JSON file content: ${file.name} (${file.size} bytes).`);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                >
                  <textarea
                    value={batchRawJson}
                    onChange={(e) => setBatchRawJson(e.target.value)}
                    placeholder='[{ "deviceId": "CPU-1", "registerErrorCode": "0xERR_77B" }]'
                    className="w-full h-24 bg-[#fcfbf9] text-[#141414] font-mono text-[9px] focus:outline-none p-1.5 resize-none border border-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        handleBatchIngestSubmit(batchRawJson);
                      }
                    }}
                  />
                  <div className="text-[8px] text-slate-400 font-mono text-right flex justify-between px-1 mt-1">
                    <span>💡 Drag & drop .json files directly</span>
                    <span>Ctrl + Enter</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBatchIngestSubmit(batchRawJson)}
                  className="w-full bg-[#141414] hover:bg-slate-800 text-white text-[9px] font-mono font-black py-2 uppercase transition border-2 border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  ⚡ Execute Bulk Pipeline Ingress
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Telemetry Tracing Console Terminal (C# logger) */}
        <div className="bg-[#141414] border-4 border-[#141414] p-5 flex flex-col h-[280px] shadow-[4px_4px_0px_#141414] text-[#E4E3E0]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h4 className="font-black text-xs text-[#E4E3E0] uppercase tracking-widest font-mono">
                System Telemetry Traces
              </h4>
            </div>
            <button
              onClick={() => setTraces([])}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-mono uppercase bg-black px-2 py-0.5 rounded border border-slate-800"
            >
              Clear Console
            </button>
          </div>

          <div className="flex-1 overflow-auto font-mono text-[10px] leading-relaxed select-text text-slate-300 bg-black/40 border border-slate-950 p-3 rounded-lg flex flex-col space-y-1 w-full max-w-full">
            {traces.length === 0 ? (
              <span className="text-slate-600 italic">No traces captured yet. Waiting for pipeline execution triggers...</span>
            ) : (
              traces.map((trace, i) => {
                let colorClass = "text-slate-300";
                if (trace.includes("[EXCEPTION")) colorClass = "text-red-400 font-bold bg-red-950/20";
                else if (trace.includes("[GUARDRAIL CRITICAL")) colorClass = "text-red-400 font-bold";
                else if (trace.includes("[GUARDRAIL]")) colorClass = "text-slate-400";
                else if (trace.includes("[FOUNDRY IQ]")) colorClass = "text-teal-350";
                else if (trace.includes("[INGESTION]")) colorClass = "text-cyan-400";
                else if (trace.includes("[SECURITY]")) colorClass = "text-emerald-405";
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
        <div className="bg-white border-4 border-[#141414] p-5 flex-1 flex flex-col min-h-[640px] shadow-[4px_4px_0px_#141414]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <Shield className="w-5 h-5 text-red-650" />
              <h3 className="font-extrabold text-[#141414] text-sm tracking-wide uppercase font-mono">C# CEA Engine Outputs</h3>
            </div>
            <div className="flex items-center space-x-2">
              {selectedPayload && (
                <button
                  onClick={() => setIsCardModalOpen(true)}
                  className="bg-red-650 hover:bg-[#141414] text-white text-[10px] uppercase font-mono font-black px-2 py-1 border border-[#141414] shadow-[1.5px_1.5px_0px_#141414] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[1px] transition-all cursor-pointer"
                  title="Show full interactive M365 Copilot Adaptive Card preview"
                >
                  Modal Preview
                </button>
              )}
              {selectedPayload && (
                <button
                  onClick={() => {
                    try {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPayload, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `vektorops_audit_${selectedPayload.alert.deviceId}_${selectedPayload.alert.registerErrorCode}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      addTrace(`[AUDIT] Manually exported JSON incident file for ${selectedPayload.alert.deviceId}`);
                    } catch (err) {
                      addTrace(`[ERROR] Export failed: ${err instanceof Error ? err.message : "unknown"}`);
                    }
                  }}
                  className="bg-white hover:bg-neutral-150 text-[#141414] text-[10px] uppercase font-mono font-black px-2 py-1 border border-[#141414] shadow-[1.5px_1.5px_0px_#141414] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1"
                  title="Download selected incident payload as a JSON file"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              )}
              {selectedPayload && (
                <div className="flex items-center space-x-1 bg-[#141414] text-[#E4E3E0] px-2.5 py-1 border border-black font-semibold font-mono text-[9px]">
                  <span>
                    Time: {selectedPayload.processingTimeMs.toFixed(1)} μs
                  </span>
                </div>
              )}
            </div>
          </div>

          {!selectedPayload ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <Eye className="w-12 h-12 text-[#141414]" />
              <span className="text-center font-mono uppercase text-[10px] tracking-wider leading-relaxed text-slate-700">
                Select or process an incident in the list to inspect generated Adaptive Cards and telemetry JSON strings.
              </span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-5 min-h-0">
              {/* Dynamic M365 Adaptive Card Visual Renderer Preview */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-700 font-extrabold uppercase tracking-widest font-mono font-bold uppercase tracking-widest font-mono">
                  M365 Copilot Adaptive Card Render
                </div>

                {selectedPayload.complianceStatus === "SECURITY_VIOLATION_BLOCKED" ? (
                  <div className="bg-red-50 border-4 border-red-650 p-5 text-red-950 flex flex-col space-y-3">
                    <div className="flex items-center space-x-2 text-red-600">
                      <ShieldAlert className="w-5 h-5 font-black" />
                      <span className="font-bold text-xs uppercase tracking-wide font-mono">Boundary Violation Thrown!</span>
                    </div>
                    <p className="text-xs text-red-900 font-mono font-bold leading-relaxed bg-white border border-[#141414] p-3 shadow-[2px_2px_0px_#141414]">
                      {selectedPayload.exceptionThrown}
                    </p>
                    <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      This alert occurred on tenant <span className="font-mono text-red-400 font-semibold">{selectedPayload.alert.nodeTenantId}</span>, but the pipeline was executing under an authorized <span className="font-mono text-teal-400 font-semibold">{activeTenant}</span> key context. The system executed exception boundaries successfully, returning no payload and preventing leakage.
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#E4E3E0] border-4 border-[#141414] flex flex-col shadow-[4px_4px_0px_#141414]">
                    {/* Header (Emphasis block) */}
                    <div className={`p-4 border-b-2 border-[#141414] ${
                      selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                        ? "bg-amber-300/30"
                        : "bg-white"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 border ${
                          selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-[#141414] text-white border-[#141414]"
                        }`}>
                          {selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "Attention Required" : "Diagnostic Advisory"}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">v1.5 Adaptive</span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-100 tracking-tight text-[#141414] font-mono uppercase mt-1">
                        VEKTOROPS TELEMETRY ALERT: {selectedPayload.alert.registerErrorCode}
                      </h4>
                      <p className="text-[11px] text-slate-450 font-mono mt-1 font-bold col-brand-dark">
                        DEVICE: {selectedPayload.alert.deviceId} | TENANT: {selectedPayload.alert.nodeTenantId}
                      </p>
                    </div>

                    {/* Body contents */}
                    <div className="p-4 space-y-4 bg-white border-b-2 border-[#141414]">
                      {/* Register Diagnosis */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-705 font-bold uppercase tracking-wider font-mono">
                          Foundry IQ Register Diagnosis
                        </div>
                        <div className="bg-slate-50 p-3 border border-[#141414] text-xs space-y-2 font-mono shadow-[2px_2px_0px_#141414]">
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">Mapped Register</span>
                            <span className="col-span-8 text-teal-600 font-mono font-bold truncate">
                              {selectedPayload.matchedRegister.registerName}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">Failing Bit Index</span>
                            <span className="col-span-8 text-slate-800 font-bold">
                              Bit {selectedPayload.matchedRegister.failingBit} of 32
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">Silicon Domain</span>
                            <span className="col-span-8 text-slate-700 font-bold">
                              {selectedPayload.matchedRegister.hardwareLevel}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-bold">Description</span>
                            <span className="col-span-8 text-slate-800 leading-normal font-sans text-xs">
                              {selectedPayload.matchedRegister.description}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Compliance & SLA Bounds */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-slate-705 font-bold uppercase tracking-wider font-mono">
                          Compliance & Lifecycle Bounds
                        </div>
                        <div className="bg-slate-55 p-3 border border-[#141414] text-xs space-y-2 font-mono shadow-[2px_2px_0px_#141414]">
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">SLA Target Limit</span>
                            <span className="col-span-8 text-slate-900 font-bold">
                              {selectedPayload.slaMatched.responseTimeThresholdHours} Hours (Max Response)
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">Expiration Contract</span>
                            <span className="col-span-8 text-[#141414] font-bold">
                              {selectedPayload.slaMatched.expirationDate}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1 pb-1 border-b border-[#141414]/10">
                            <span className="col-span-4 text-slate-500 font-bold">System Compliance</span>
                            <span className={`col-span-8 font-black uppercase ${
                              selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE"
                                ? "text-red-650"
                                : "text-emerald-750"
                            }`}>
                              {selectedPayload.complianceStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-550 font-bold">Mitigation Path</span>
                            <span className="col-span-8 text-[#141414] font-bold italic">
                              {selectedPayload.matchedRegister.diagnosticAction}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SLA Warning box if out of compliance */}
                      {selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" && (
                        <div className="bg-amber-100 border-2 border-amber-650 p-2.5 rounded-none flex items-start space-x-2 font-mono">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-950 leading-tight">
                            WARNING: Asset warranty is expired! Replacement operations may be subject to manual invoice processing outside the standard automated lifecycle contracts.
                          </p>
                        </div>
                      )}

                      {/* Action Blocks */}
                      <div className="flex items-center space-x-3 pt-2">
                        {partsDispatched[selectedPayload.alert.deviceId + selectedPayload.alert.telemetryTimestamp] ? (
                          <div className="flex-1 bg-white text-emerald-800 border-2 border-[#141414] py-2 text-xs font-black font-mono text-center flex items-center justify-center space-x-1.5 shadow-[2px_2px_0px_#141414]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
                            className="flex-1 bg-white text-[#141414] border-2 border-[#141414] py-2 text-xs font-extrabold text-center transition tracking-wide shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-mono uppercase"
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
                          className="flex-1 bg-[#141414] hover:bg-zinc-800 text-white py-2 text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-mono uppercase"
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
                <div className="text-[10px] text-slate-700 font-extrabold uppercase tracking-widest font-mono">
                  Adaptive Card JSON Core String Stream
                </div>
                <div className="flex-1 bg-[#141414] p-3 text-[#E4E3E0] overflow-auto font-mono text-[9px] leading-tight border-2 border-[#141414] h-44">
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

      {/* Live operational overview chart */}
      <div className="bg-white border-4 border-[#141414] p-5 shadow-[4px_4px_0px_#141414]">
        <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-red-650" />
            <h3 className="font-extrabold text-[#141414] text-xs font-mono tracking-wider uppercase">Live Telemetry Data Pipeline Metrics (60s Window)</h3>
          </div>
          <div className="text-[10px] bg-red-650 text-white px-2.5 py-0.5 border border-black font-bold animate-pulse font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping"></span>
            Realtime Stream
          </div>
        </div>

        <div className="h-[220px] w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="time" 
                stroke="#141414"
                tick={{ fill: '#141414', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis 
                stroke="#141414" 
                tick={{ fill: '#141414', fontSize: 10, fontWeight: 'bold' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  color: '#fff', 
                  border: '2px solid #141414',
                  fontFamily: 'monospace'
                }} 
              />
              <Legend 
                wrapperStyle={{ fill: '#141414', fontSize: 11, fontWeight: 'bold' }}
              />
              <Line 
                name="Frequency (Packets)" 
                type="monotone" 
                dataKey="frequency" 
                stroke="#dc2626" 
                strokeWidth={3} 
                activeDot={{ r: 8 }} 
              />
              <Line 
                name="Max Severity (Scale 1-10)" 
                type="monotone" 
                dataKey="severity" 
                stroke="#d97706" 
                strokeWidth={3} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* M365 Copilot Card Mock Visualizer Overlay Modal */}
      {isCardModalOpen && selectedPayload && (
        <div className="fixed inset-0 bg-[#141414]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#dc2626] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#141414] text-white p-4 flex items-center justify-between border-b-4 border-[#141414]">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="font-mono text-xs font-black uppercase tracking-wider">
                  M365 Copilot Card Mock Visualizer
                </span>
              </div>
              <button 
                onClick={() => setIsCardModalOpen(false)}
                className="bg-white text-[#141414] border-2 border-white px-2 py-1 font-mono text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-[2px_2px_0px_#dc2626] cursor-pointer"
              >
                [ Close Preview ]
              </button>
            </div>

            {/* Modal Content - Mock Chat Interface */}
            <div className="flex-1 overflow-auto p-6 bg-[#F3F2F1] space-y-6">
              
              {/* Mock Copilot Chat Bubble */}
              <div className="flex items-start space-x-3 max-w-full text-left">
                {/* Copilot Avatar Icon */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
                  C
                </div>
                <div className="space-y-4 flex-1">
                  <div className="bg-white p-4 border-2 border-[#141414] shadow-[3px_3px_0px_#141414] rounded-lg text-xs leading-relaxed text-slate-800 space-y-2">
                    <p className="font-semibold text-slate-900">Microsoft Copilot <span className="text-[10px] font-mono text-slate-400 font-normal">09:54 AM</span></p>
                    <p>I have queried the VektorOps CEA server using Foundry IQ definitions. Here is the verified system-level hardware telemetry digest. Review the registered mappings and contractual SLAs below:</p>
                  </div>

                  {/* Render Visual Card here */}
                  <div className="max-w-md bg-white border-4 border-[#141414] shadow-[6px_6px_0px_#141414] flex flex-col text-[#141414] select-text">
                    {selectedPayload.complianceStatus === "SECURITY_VIOLATION_BLOCKED" ? (
                      <div className="bg-red-50 p-5 text-red-950 flex flex-col space-y-3">
                        <div className="flex items-center space-x-2 text-red-600 border-b border-red-250 pb-2">
                          <ShieldAlert className="w-5 h-5 font-black" />
                          <span className="font-bold text-xs uppercase tracking-wide font-mono">Boundary Violation Thrown!</span>
                        </div>
                        <p className="text-xs text-red-900 font-mono font-bold leading-normal bg-white border border-[#141414] p-3 shadow-[2px_2px_0px_#141414]">
                          {selectedPayload.exceptionThrown}
                        </p>
                        <p className="text-[10px] text-slate-600 leading-normal font-sans">
                          Exception class: <span className="font-mono bg-red-100 text-red-800 px-1 font-bold">SecurityBoundaryViolationException</span>
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Card Main Block Header */}
                        <div className={`p-4 border-b-2 border-[#141414] ${
                          selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "bg-amber-100" : "bg-[#F3F2F1]"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="bg-[#141414] text-white text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 border border-[#141414]">
                              {selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "EXPIRATION_ALERT" : "DIAG_ADVISORY"}
                            </span>
                            <span className="text-[9px] text-[#141414]/70 font-mono font-medium">Adaptive Card v1.5</span>
                          </div>
                          <h4 className="text-xs font-mono font-black uppercase text-[#141414]">
                            {selectedPayload.alert.registerErrorCode} | {selectedPayload.matchedRegister.registerName}
                          </h4>
                        </div>

                        {/* Body Content of Mock Card */}
                        <div className="p-4 space-y-4">
                          {/* Diagnostic Fact Set */}
                          <div className="space-y-1.5 font-mono">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-0.5">Facts & Metrics</div>
                            <div className="text-[11px] grid grid-cols-12 gap-y-1.5 gap-x-2">
                              <span className="col-span-4 text-slate-500 font-bold">Node ID</span>
                              <span className="col-span-8 text-[#141414] font-bold">{selectedPayload.alert.deviceId}</span>

                              <span className="col-span-4 text-slate-500 font-bold">Tenant</span>
                              <span className="col-span-8 text-[#141414] font-bold">{selectedPayload.alert.nodeTenantId}</span>

                              <span className="col-span-4 text-slate-500 font-bold">Intel Domain</span>
                              <span className="col-span-8 text-teal-650 font-bold">{selectedPayload.matchedRegister.hardwareLevel}</span>

                              <span className="col-span-4 text-slate-500 font-bold">Failing Bit</span>
                              <span className="col-span-8 text-slate-800 font-bold">Bit {selectedPayload.matchedRegister.failingBit}</span>
                            </div>
                          </div>

                          {/* Descriptive Section */}
                          <div className="bg-slate-50/50 p-3 border border-slate-200 text-[11px] leading-relaxed">
                            <span className="font-mono font-bold text-slate-500 block uppercase text-[9px]">Description:</span>
                            <p className="font-sans text-slate-700">{selectedPayload.matchedRegister.description}</p>
                          </div>

                          {/* SLA SLA section */}
                          <div className="space-y-1 bg-red-50/30 p-2.5 border border-[#141414]/15">
                            <span className="font-mono font-bold text-red-700 block uppercase text-[9px]">Contract Compliance:</span>
                            <div className="text-[10px] space-y-1 font-mono">
                              <p className="flex justify-between">
                                <span className="text-slate-500">SLA Contract Window:</span>
                                <span className="font-bold text-[#141414]">{selectedPayload.slaMatched.responseTimeThresholdHours} Hours</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">Warranty Expires:</span>
                                <span className="font-bold text-[#141414]">{selectedPayload.slaMatched.expirationDate}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">Compliance State:</span>
                                <span className={`font-black uppercase ${
                                  selectedPayload.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE" ? "text-red-600" : "text-emerald-700"
                                }`}>{selectedPayload.complianceStatus.replace(/_/g, " ")}</span>
                              </p>
                            </div>
                          </div>

                          {/* Action buttons embedded in Card */}
                          <div className="flex items-center space-x-2 pt-1 font-mono text-[10px]">
                            <button 
                              onClick={() => {
                                addTrace(`[COPILOT ACTION] User executed card form submission: Trigger Parts Dispatch`);
                                setIsCardModalOpen(false);
                                setPartsDispatched((prev) => ({
                                  ...prev,
                                  [selectedPayload.alert.deviceId + selectedPayload.alert.telemetryTimestamp]: true
                                }));
                              }}
                              className="flex-1 bg-red-650 text-white font-extrabold uppercase py-2 hover:bg-[#141414] transition-all border-2 border-black shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer text-center font-bold"
                            >
                              Submit Parts Dispatch
                            </button>
                            <button 
                              onClick={() => {
                                addTrace(`[COPILOT ACTION] User launched documentation: Review Datasheet`);
                                window.open(`https://vektorops.enterprise.internal/specifications/${selectedPayload.matchedRegister.registerName}`, '_blank');
                              }}
                              className="bg-white text-[#141414] font-bold border-2 border-black uppercase py-2 px-3 hover:bg-slate-50 transition-all shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer text-center"
                            >
                              Review Datasheet
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#141414]/5 p-4 border-t-4 border-[#141414] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono">
              <div className="text-slate-500 text-[10px]">
                Target Integration Platform: M365 Copilot Studio v1.5 API Schema compliant.
              </div>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="bg-[#141414] hover:bg-[#141414]/90 text-white border-2 border-[#141414] font-black font-mono text-xs px-4 py-1.5 transition shadow-[2px_2px_0px_#dc2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer uppercase"
              >
                Return to Dashboard
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
