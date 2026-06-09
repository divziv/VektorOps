import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, Cpu, Activity, Info
} from "lucide-react";
import { DiagnosticsPayload } from "../types";

interface ComplianceHeatmapProps {
  processedLogs: DiagnosticsPayload[];
  activeTenant: string;
}

interface GridAsset {
  id: string;
  name: string;
  tenant: string;
  subsystem: string;
  baseCode: string;
  status: "HEALTHY" | "FAILED" | "SLA_WARNING" | "SECURITY_BLOCKED" | "CORRUPT_THRESHOLD";
  temperature: number;
  voltage: number;
  errorRate: number;
}

const SUBSYSTEMS = [
  { name: "SRAM Cache Controller", key: "0xERR_77B", label: "L2 Cache Parity" },
  { name: "Memory Subsystem", key: "0xERR_A4F", label: "DRAM Core Volt" },
  { name: "PCIe Root Complex", key: "0xERR_F8C", label: "PCIe Gen5 physical" }
];

const TENANTS = ["TENANT-ALPHA", "TENANT-BETA", "TENANT-GAMMA"];

// Initial assets array to generate the heatmap structure
const INITIAL_ASSETS: GridAsset[] = [
  // Tenant Alpha
  { id: "CPU-INTEL-SK-10", name: "Intel Skylake Server Node 10", tenant: "TENANT-ALPHA", subsystem: "SRAM Cache Controller", baseCode: "0xERR_77B", status: "HEALTHY", temperature: 74, voltage: 1.20, errorRate: 3.5 },
  { id: "GPU-AMD-RYZ88", name: "AMD Radeon Compute Block 88", tenant: "TENANT-ALPHA", subsystem: "Memory Subsystem", baseCode: "0xERR_A4F", status: "HEALTHY", temperature: 68, voltage: 1.18, errorRate: 1.2 },
  { id: "FPGA-XIL-ACC-4", name: "Xilinx FPGA Accelerator Block 4", tenant: "TENANT-ALPHA", subsystem: "PCIe Root Complex", baseCode: "0xERR_F8C", status: "HEALTHY", temperature: 72, voltage: 1.21, errorRate: 4.1 },
  { id: "GPU-AMD-FIRE9", name: "AMD FirePro Node Cluster 9", tenant: "TENANT-ALPHA", subsystem: "SRAM Cache Controller", baseCode: "0xERR_77B", status: "HEALTHY", temperature: 79, voltage: 1.19, errorRate: 6.4 },
  
  // Tenant Beta
  { id: "NODE-ROUTER-P8", name: "High-Throughput Node Router P8", tenant: "TENANT-BETA", subsystem: "PCIe Root Complex", baseCode: "0xERR_F8C", status: "HEALTHY", temperature: 62, voltage: 1.22, errorRate: 2.1 },
  { id: "CPU-AMD-EPYC-3", name: "AMD Epyc Core Slice 3", tenant: "TENANT-BETA", subsystem: "SRAM Cache Controller", baseCode: "0xERR_77B", status: "HEALTHY", temperature: 71, voltage: 1.20, errorRate: 1.8 },
  { id: "MEM-SEC-BETA-2", name: "DRAM Secondary Array B2", tenant: "TENANT-BETA", subsystem: "Memory Subsystem", baseCode: "0xERR_A4F", status: "HEALTHY", temperature: 75, voltage: 1.15, errorRate: 5.2 },

  // Tenant Gamma
  { id: "CPU-INTEL-ULT-2", name: "Intel Xeon Platinum Compute 2", tenant: "TENANT-GAMMA", subsystem: "Memory Subsystem", baseCode: "0xERR_A4F", status: "HEALTHY", temperature: 83, voltage: 1.10, errorRate: 8.9 },
  { id: "FPGA-ALT-G3", name: "Altera Stratix High-Speed Block", tenant: "TENANT-GAMMA", subsystem: "PCIe Root Complex", baseCode: "0xERR_F8C", status: "HEALTHY", temperature: 70, voltage: 1.18, errorRate: 3.1 },
  { id: "CPU-INTEL-SK-11", name: "Intel Skylake Server Node 11", tenant: "TENANT-GAMMA", subsystem: "SRAM Cache Controller", baseCode: "0xERR_77B", status: "HEALTHY", temperature: 76, voltage: 1.21, errorRate: 2.8 }
];

export function ComplianceHeatmap({ processedLogs, activeTenant }: ComplianceHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [assetList, setAssetList] = useState<GridAsset[]>(INITIAL_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<GridAsset | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string; statusText: string } | null>(null);

  // Synchronize Heatmap Node Statuses with Logs processed in parent Simulator
  useEffect(() => {
    setAssetList((prev) => {
      // Deep copy initial state first to ensure fresh recalculation
      const updated = INITIAL_ASSETS.map((asset) => {
        // Find latest processed log corresponding to this device
        const logsForDevice = processedLogs.filter(
          (log) => log.alert.deviceId === asset.id
        );

        if (logsForDevice.length === 0) {
          return { ...asset, status: "HEALTHY" as const };
        }

        const latestLog = logsForDevice[0]; // Processed logs are unshifted (newest first)

        let status: GridAsset["status"] = "HEALTHY";
        let temperature = asset.temperature;
        let voltage = asset.voltage;
        let errorRate = asset.errorRate;

        // Extract values from payload if present (custom readings or simulated)
        if (latestLog.alert) {
          // Parse potential custom metrics
          const logAny = latestLog.alert as any;
          if (typeof logAny.temperature === "number") temperature = logAny.temperature;
          if (typeof logAny.voltage === "number") voltage = logAny.voltage;
          if (typeof logAny.errorRate === "number") errorRate = logAny.errorRate;
        }

        if (latestLog.complianceStatus === "SECURITY_VIOLATION_BLOCKED") {
          status = "SECURITY_BLOCKED";
        } else if (latestLog.complianceStatus === "OUT_OF_WARRANTY_COMPLIANCE") {
          status = "SLA_WARNING";
        } else if (latestLog.complianceStatus === "CRITICAL_SYS_THRESHOLD_EXCEEDED") {
          status = "CORRUPT_THRESHOLD";
        } else if (latestLog.complianceStatus === "LIMIT_EXCEEDED") {
          status = "CORRUPT_THRESHOLD";
        } else {
          status = "FAILED";
        }

        return {
          ...asset,
          status,
          temperature,
          voltage,
          errorRate
        };
      });

      // Keep user-added custom mock assets not defined in high priority log catalog
      // by appending elements that don't match INITIAL_ASSETS
      return updated;
    });
  }, [processedLogs]);

  // Render Heatmap with D3 Core
  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous drawings
    d3.select(svgRef.current).selectAll("*").remove();

    // Size configuration
    const margin = { top: 40, right: 30, bottom: 50, left: 160 };
    const width = 640 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scale helpers
    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(TENANTS)
      .padding(0.08);

    const yScale = d3.scaleBand()
      .range([height, 0])
      .domain(SUBSYSTEMS.map(s => s.name))
      .padding(0.08);

    // Grid matrix generation
    const gridData: { tenant: string; subsystem: string; assets: GridAsset[] }[] = [];

    TENANTS.forEach(tenant => {
      SUBSYSTEMS.forEach(sub => {
        const filtered = assetList.filter(a => a.tenant === tenant && a.subsystem === sub.name);
        gridData.push({
          tenant,
          subsystem: sub.name,
          assets: filtered
        });
      });
    });

    // Color Scales
    // HEALTHY = emerald-500, FAILED = red-600, SLA_WARNING = amber-500, SECURITY_BLOCKED = purple-600, CORRUPT_THRESHOLD = orange-500
    const colorMap = {
      HEALTHY: "#10b981",       // emerald-500
      FAILED: "#ef4444",        // red-500
      SLA_WARNING: "#f59e0b",   // amber-500
      SECURITY_BLOCKED: "#8b5cf6", // purple-500
      CORRUPT_THRESHOLD: "#f97316" // orange-500
    };

    // Draw Axes
    svg.append("g")
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .style("font-weight", "bold")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => d.replace("TENANT-", "")))
      .select(".domain").attr("stroke", "#141414").attr("stroke-width", 2);

    svg.append("g")
      .style("font-size", "9px")
      .style("font-family", "monospace")
      .style("font-weight", "bold")
      .call(d3.axisLeft(yScale).tickFormat(d => {
        const matching = SUBSYSTEMS.find(s => s.name === d);
        return matching ? matching.label : d;
      }))
      .select(".domain").attr("stroke", "#141414").attr("stroke-width", 2);

    svg.selectAll(".tick line").attr("stroke", "#141414").attr("stroke-width", 1);

    // Draw Heatmap Cell Groups
    const cellGroups = svg.selectAll(".cell-group")
      .data(gridData)
      .enter()
      .append("g")
      .attr("class", "cell-group")
      .attr("transform", d => `translate(${xScale(d.tenant)}, ${yScale(d.subsystem)})`);

    // For each cell block, render internal hardware square layouts
    cellGroups.each(function(d) {
      const groupEl = d3.select(this);
      const totalWidth = xScale.bandwidth();
      const totalHeight = yScale.bandwidth();

      // Clear layout
      groupEl.selectAll("*").remove();

      // Simple grid representation: if there are no nodes, draw empty slash block
      if (d.assets.length === 0) {
        groupEl.append("rect")
          .attr("width", totalWidth)
          .attr("height", totalHeight)
          .attr("fill", "#f3f4f6")
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3 3");

        groupEl.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", totalWidth)
          .attr("y2", totalHeight)
          .attr("stroke", "#d1d5db")
          .attr("stroke-width", 1);
        return;
      }

      // Draw active cards elements
      const numAssets = d.assets.length;
      // Define subgrid layouts
      const numCols = numAssets > 2 ? 2 : numAssets;
      const numRows = Math.ceil(numAssets / numCols);

      const cellW = (totalWidth - (numCols - 1) * 3) / numCols;
      const cellH = (totalHeight - (numRows - 1) * 3) / numRows;

      d.assets.forEach((asset, idx) => {
        const r = Math.floor(idx / numCols);
        const c = idx % numCols;

        const rectX = c * (cellW + 3);
        const rectY = r * (cellH + 3);

        const assetFill = colorMap[asset.status] || colorMap.HEALTHY;

        // Custom rect for hardware
        const nodeRect = groupEl.append("rect")
          .attr("x", rectX)
          .attr("y", rectY)
          .attr("width", cellW)
          .attr("height", cellH)
          .attr("fill", assetFill)
          .attr("stroke", "#141414")
          .attr("stroke-width", 2)
          .attr("rx", 1.5)
          .attr("cursor", "pointer")
          .style("transition", "all 0.2s");

        // Hover animations
        nodeRect.on("mouseover", function(event) {
          d3.select(this)
            .attr("stroke", "#dc2626")
            .attr("stroke-width", 3.5);

          setHoveredCell({
            x: asset.tenant.replace("TENANT-", ""),
            y: asset.subsystem,
            statusText: `${asset.id} (${asset.status})`
          });
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("stroke", "#141414")
            .attr("stroke-width", 2);
          setHoveredCell(null);
        })
        .on("click", () => {
          setSelectedAsset(asset);
        });

        // Add a micro texture/symbol over non-healthy elements to boost contrast
        if (asset.status !== "HEALTHY") {
          groupEl.append("circle")
            .attr("cx", rectX + cellW / 2)
            .attr("cy", rectY + cellH / 2)
            .attr("r", Math.min(cellW, cellH) / 6)
            .attr("fill", "white")
            .attr("pointer-events", "none");
        }
      });
    });

  }, [assetList]);

  // Trigger repair operation
  const handleRepairAsset = (assetId: string) => {
    setAssetList((prev) => 
      prev.map((a) => {
        if (a.id === assetId) {
          return {
            ...a,
            status: "HEALTHY",
            temperature: 71,
            voltage: 1.20,
            errorRate: 1.5
          };
        }
        return a;
      })
    );

    // If currently selected, update details too
    setSelectedAsset((prev) => {
      if (prev && prev.id === assetId) {
        return {
          ...prev,
          status: "HEALTHY",
          temperature: 71,
          voltage: 1.20,
          errorRate: 1.5
        };
      }
      return prev;
    });
  };

  // Inject failure operation
  const handleSimulateFailure = (assetId: string, statusType: GridAsset["status"]) => {
    setAssetList((prev) => 
      prev.map((a) => {
        if (a.id === assetId) {
          const highTemp = statusType === "CORRUPT_THRESHOLD" ? 96 : 82;
          const lowVolt = statusType === "CORRUPT_THRESHOLD" ? 1.02 : 1.14;
          return {
            ...a,
            status: statusType,
            temperature: highTemp,
            voltage: lowVolt,
            errorRate: statusType === "FAILED" ? 22.4 : 6.8
          };
        }
        return a;
      })
    );

    setSelectedAsset((prev) => {
      if (prev && prev.id === assetId) {
        const highTemp = statusType === "CORRUPT_THRESHOLD" ? 96 : 82;
        const lowVolt = statusType === "CORRUPT_THRESHOLD" ? 1.02 : 1.14;
        return {
          ...prev,
          status: statusType,
          temperature: highTemp,
          voltage: lowVolt,
          errorRate: statusType === "FAILED" ? 22.4 : 6.8
        };
      }
      return prev;
    });
  };

  return (
    <div className="bg-white border-4 border-[#141414] p-5 shadow-[6px_6px_0px_#141414] space-y-6">
      
      {/* View Header */}
      <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-5 h-5 text-red-650" />
          <h3 className="font-extrabold text-[#141414] text-xs font-mono tracking-wider uppercase">D3 Multi-Tenant Compliance Cluster Heatmap</h3>
        </div>
        <span className="text-[10px] uppercase font-mono bg-emerald-500 text-white border border-black px-2.5 py-0.5 font-bold shadow-[1.5px_1.5px_0px_#141414]">
          D3.js Bound Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: interactive D3 Heatmap SVG Canvas */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div className="bg-[#fcfbf9] border-2 border-[#141414] p-3 shadow-[2.5px_2.5px_0px_#141414] flex-1 flex flex-col justify-center relative min-h-[300px]">
            
            {/* Live Hover Info overlay */}
            <div className="absolute top-2.5 right-2.5 bg-[#141414] text-white px-2.5 py-1 text-[9px] font-mono border border-black rounded shadow-[1.5px_1.5px_0px_#dc2626] h-6 flex items-center">
              {hoveredCell ? (
                <span>Hovering Node: <strong className="text-red-400 font-black">{hoveredCell.statusText}</strong></span>
              ) : (
                <span className="text-slate-400">Hover cell to inspect telemetry coordinates</span>
              )}
            </div>

            <div ref={containerRef} className="w-full">
              <svg ref={svgRef} className="w-full h-auto max-h-[300px]"></svg>
            </div>
            
            {/* Dynamic Status Legend */}
            <div className="border-t border-slate-200 pt-3.5 mt-2 flex flex-wrap gap-x-4 gap-y-2 justify-center font-mono text-[9px] font-black">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#10b981] border border-black inline-block"></span>
                <span>Healthy Asset (Gold)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#ef4444] border border-black inline-block flex items-center justify-center text-white font-extrabold text-[8px]">●</span>
                <span>Incident Failure</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#f59e0b] border border-black inline-block flex items-center justify-center text-white font-extrabold text-[8px]">●</span>
                <span>Expired SLA/Warranty</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#8b5cf6] border border-black inline-block flex items-center justify-center text-white font-extrabold text-[8px]">●</span>
                <span>Tenant Boundary Violation</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#f97316] border border-black inline-block flex items-center justify-center text-white font-extrabold text-[8px]">●</span>
                <span>Sys Limit Exceeded</span>
              </div>
            </div>
          </div>

          <div className="bg-[#141414]/5 border-l-4 border-red-650 p-4 font-mono text-[10px] space-y-1.5">
            <span className="font-extrabold uppercase text-[#141414] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-red-650" /> Heatmap Synchronization Protocol:
            </span>
            <p className="text-slate-700 leading-normal font-sans">
              This grid represents the live silicon substrate layer of the <strong>VektorOps Managed Network</strong>. Whenever the active simulator processes telemetry, the corresponding hardware block reacts and recolors instantly based on diagnostic findings, exceptions thrown, or user-configured severity limits.
            </p>
          </div>
        </div>

        {/* Right Side: Inspector & targeted diagnostic injectors */}
        <div className="lg:col-span-4 bg-slate-50 border-2 border-[#141414] p-4 flex flex-col justify-between shadow-[2.5px_2.5px_0px_#141414] min-h-[340px]">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-205 pb-2 mb-3">
              <Cpu className="w-4 h-4 text-[#141414]" />
              <h4 className="font-extrabold text-[#141414] text-xs font-mono uppercase tracking-wide">Node Inspector</h4>
            </div>

            {!selectedAsset ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-500 font-mono text-[10px] space-y-1 bg-white border border-slate-200">
                <Info className="w-6 h-6 text-slate-300" />
                <span>Click any cell block in the D3 Heatmap grid to inspect physical silicon telemetry</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-mono">
                <div className="bg-[#141414] text-[#E4E3E0] p-2.5 border border-black shadow-[1.5px_1.5px_0px_#141414] space-y-0.5">
                  <p className="text-[10px] font-bold text-red-500 uppercase">Hardware ID Node</p>
                  <p className="font-extrabold text-sm tracking-tight">{selectedAsset.id}</p>
                  <p className="text-[9px] text-slate-400 tracking-wide font-sans mt-1">Location: {selectedAsset.tenant.replace("TENANT-", "")} / {selectedAsset.subsystem}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white border p-2 border-[#141414]">
                    <span className="text-slate-500 block">Temperature:</span>
                    <strong className="text-sm font-extrabold text-[#141414]">{selectedAsset.temperature.toFixed(1)}°C</strong>
                  </div>
                  <div className="bg-white border p-2 border-[#141414]">
                    <span className="text-slate-500 block">Voltage Sense:</span>
                    <strong className="text-sm font-extrabold text-[#141414]">{selectedAsset.voltage.toFixed(2)}V</strong>
                  </div>
                  <div className="bg-white border p-2 border-[#141414] col-span-2">
                    <span className="text-slate-500 block">Signal Loss Error Rate:</span>
                    <strong className="text-sm font-extrabold text-[#141414]">{selectedAsset.errorRate.toFixed(2)}%</strong>
                  </div>
                </div>

                {/* Subsystem spec description */}
                <div className="bg-white p-2.5 border border-slate-200 font-sans text-[11px] leading-relaxed text-slate-600">
                  <span className="font-mono text-[9px] block font-bold text-slate-500 mb-0.5 uppercase">Core Description:</span>
                  {selectedAsset.name}
                </div>

                {/* Grid controls */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Interactive Override Protocols:</div>
                  
                  {selectedAsset.status !== "HEALTHY" ? (
                    <button
                      onClick={() => handleRepairAsset(selectedAsset.id)}
                      className="w-full bg-[#10b981] text-white py-1.5 hover:bg-[#10b981]/90 uppercase font-mono text-[10px] font-black tracking-wider transition border-2 border-black shadow-[1.5px_1.5px_0px_#141414] cursor-pointer"
                    >
                      🔧 Run Silicon Defect Repair
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleSimulateFailure(selectedAsset.id, "FAILED")}
                        className="bg-red-600 text-white py-1.5 hover:bg-red-700 uppercase font-mono text-[9px] font-bold tracking-wider transition border border-black shadow-[1.5px_1.5px_0px_#141414] cursor-pointer"
                      >
                        Sim Failure
                      </button>
                      <button
                        onClick={() => handleSimulateFailure(selectedAsset.id, "CORRUPT_THRESHOLD")}
                        className="bg-orange-500 text-white py-1.5 hover:bg-orange-600 uppercase font-mono text-[9px] font-bold tracking-wider transition border border-black shadow-[1.5px_1.5px_0px_#141414] cursor-pointer"
                      >
                        Sim Thermal Max
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            Clicking override protocols manually bypasses standard .NET microcode validations to test localized telemetry reaction layouts.
          </div>
        </div>

      </div>
    </div>
  );
}
