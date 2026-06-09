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
    <div className="flex flex-col lg:flex-row bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden h-[680px]">
      {/* File Tree Sidebar */}
      <div className="w-full lg:w-72 bg-[#0d1636] border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 mb-4 px-2">
            <Folder className="w-4 h-4" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Solution Explorer</span>
          </div>
          
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold px-2 py-1">VektorOps Enterprise Solution</div>
            {CSHARP_CODE_FILES.map((file) => {
              const fileIsSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center space-x-3 transition-all ${
                    fileIsSelected
                      ? "bg-teal-500/10 text-teal-300 border border-teal-500/30"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 ${fileIsSelected ? "text-teal-400" : "text-slate-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{file.path}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Tags showing Architecture attributes */}
        <div className="mt-8 border-t border-slate-800/60 pt-4 space-y-3 px-2">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">C# Architecture Badges</div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Multi-Tenant Boundaries</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
            <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>High-Speed Grounding</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
            <Layout className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Adaptive Card Templating</span>
          </div>
        </div>
      </div>

      {/* Editor Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#070D19]">
        {/* Editor Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-mono text-slate-300">{selectedFile.path}</span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded">.NET 8 C#</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 rounded-lg hover:bg-slate-700 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
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
        <div className="px-4 py-2 bg-teal-950/20 text-teal-300/90 text-xs border-b border-slate-800/60 leading-relaxed font-sans">
          <strong>Arch Description:</strong> {selectedFile.description}
        </div>

        {/* Code Content Box wrapper */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
          <pre className="text-slate-300 select-all whitespace-pre">
            <code>
              {selectedFile.content.split("\n").map((line, idx) => (
                <div key={idx} className="hover:bg-slate-900/40 px-2 rounded -mx-2 flex">
                  <span className="w-8 select-none text-slate-600 text-right pr-3 select-none">{idx + 1}</span>
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
