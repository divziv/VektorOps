import React, { useState } from "react";
import { Copy, Check, FileCode, Folder, ShieldCheck, Database, Layout, Terminal } from "lucide-react";
import { CSHARP_CODE_FILES, CodeFile } from "../codebase";

export function CsharpExplorer() {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(CSHARP_CODE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row bg-white border-4 border-[#141414] overflow-hidden h-[680px] shadow-[6px_6px_0px_#141414]">
      {/* File Tree Sidebar */}
      <div className="w-full lg:w-72 bg-[#D1D0CC] border-r-4 border-[#141414] p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 text-[#141414] mb-4 px-2">
            <Folder className="w-4 h-4 text-red-600" />
            <span className="font-mono text-xs font-black uppercase tracking-wider">Solution Explorer</span>
          </div>
          
          <div className="space-y-1">
            <div className="text-[10px] text-[#141414]/70 uppercase tracking-widest font-black px-2 py-1 font-mono">VektorOps Enterprise Solution</div>
            {CSHARP_CODE_FILES.map((file) => {
              const fileIsSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-none flex items-center space-x-3 transition-all border-2 ${
                    fileIsSelected
                      ? "bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_#141414]"
                      : "bg-white/40 text-slate-800 border-transparent hover:border-[#141414] hover:bg-white"
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 ${fileIsSelected ? "text-white" : "text-slate-700"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className={`text-[9px] truncate font-mono ${fileIsSelected ? "text-slate-300" : "text-slate-500"}`}>{file.path}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Tags showing Architecture attributes */}
        <div className="mt-8 border-t-2 border-[#141414]/30 pt-4 space-y-3 px-2">
          <div className="text-[10px] text-[#141414] font-black uppercase tracking-wider font-mono">C# Architecture Badges</div>
          
          <div className="flex items-center space-x-2 text-xs text-[#141414] bg-white p-2 border-2 border-[#141414] shadow-[1.5px_1.5px_0px_#141414] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-red-650 shrink-0" />
            <span>Multi-Tenant Boundaries</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-[#141414] bg-white p-2 border-2 border-[#141414] shadow-[1.5px_1.5px_0px_#141414] font-semibold">
            <Database className="w-3.5 h-3.5 text-black shrink-0" />
            <span>High-Speed Grounding</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#141414] bg-white p-2 border-2 border-[#141414] shadow-[1.5px_1.5px_0px_#141414] font-semibold">
            <Layout className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Adaptive Card Templating</span>
          </div>
        </div>
      </div>

      {/* Editor Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FCFCFA]">
        {/* Editor Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#E4E3E0] border-b-4 border-[#141414]">
          <div className="flex items-center space-x-3">
            <Terminal className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-mono text-[#141414] font-bold">{selectedFile.path}</span>
            <span className="bg-[#141414] text-[#E4E3E0] text-[9px] font-mono px-1.5 py-0.5 font-bold uppercase border border-black">.NET 8 C#</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1 bg-white text-[#141414] border-2 border-[#141414] text-xs font-bold font-mono transition-all shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-neutral-50"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Documentation Block */}
        <div className="px-4 py-2.5 bg-[#141414] text-[#E4E3E0] text-xs border-b-2 border-[#141414] leading-relaxed font-mono">
          <strong>Arch Spec:</strong> {selectedFile.description}
        </div>

        {/* Code Content Box wrapper */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5 bg-white text-[#141414]">
          <pre className="select-all whitespace-pre">
            <code>
              {selectedFile.content.split("\n").map((line, idx) => (
                <div key={idx} className="hover:bg-neutral-100/50 px-2 rounded -mx-2 flex">
                  <span className="w-8 select-none text-slate-400 text-right pr-3">{idx + 1}</span>
                  <span className="flex-1">{line || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
