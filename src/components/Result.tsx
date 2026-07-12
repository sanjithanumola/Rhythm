import React from 'react';
import { GameResult } from '../types';
import { Download } from 'lucide-react';

export function Result({ result, onReplay, onMenu }: { result: GameResult, onReplay: () => void, onMenu: () => void }) {
  const totalNotes = result.perfects + result.greats + result.goods + result.misses;
  const accuracy = totalNotes > 0 
    ? ((result.perfects + result.greats * 0.8 + result.goods * 0.5) / totalNotes * 100).toFixed(2) 
    : "0.00";

  const downloadAudio = () => {
    if (!result.audioBlob) return;
    const url = URL.createObjectURL(result.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyria-track.wav';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBeatmap = () => {
    if (!result.beatmap) return;
    const data = JSON.stringify(result.beatmap, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beatmap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full bg-zinc-950/80 backdrop-blur-md p-12 rounded-2xl border border-emerald-500/20 text-center relative glow-box-emerald">
        {/* HUD Corners */}
        <div className="hud-corner hud-top-left"></div>
        <div className="hud-corner hud-top-right"></div>
        <div className="hud-corner hud-bottom-left"></div>
        <div className="hud-corner hud-bottom-right"></div>

        <h2 className="text-5xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-teal-300 to-emerald-500 glow-text-emerald">
          STAGE CLEARED
        </h2>
        <div className="text-7xl font-bold mb-12 tracking-tight text-white">{result.score.toLocaleString()}</div>
        
        <div className="grid grid-cols-2 gap-8 mb-12 text-left">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 font-medium">Max Combo</span>
              <span className="font-bold text-white">{result.maxCombo}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 font-medium">Accuracy</span>
              <span className="font-bold text-white">{accuracy}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-emerald-400">
              <span className="font-medium">Perfect</span>
              <span className="font-bold">{result.perfects}</span>
            </div>
            <div className="flex justify-between text-lime-400">
              <span className="font-medium">Great</span>
              <span className="font-bold">{result.greats}</span>
            </div>
            <div className="flex justify-between text-cyan-400">
              <span className="font-medium">Good</span>
              <span className="font-bold">{result.goods}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span className="font-medium">Miss</span>
              <span className="font-bold">{result.misses}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4 justify-center">
            <button 
              onClick={downloadAudio}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-white font-bold rounded-xl transition-all cursor-pointer hover:bg-zinc-850"
            >
              <Download size={18} className="text-emerald-400" /> Audio
            </button>
            <button 
              onClick={downloadBeatmap}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-white font-bold rounded-xl transition-all cursor-pointer hover:bg-zinc-850"
            >
              <Download size={18} className="text-emerald-400" /> Beatmap
            </button>
          </div>
          
          <div className="flex gap-4 justify-center mt-4">
            <button 
              onClick={onReplay}
              className="px-8 py-4 bg-emerald-500 text-black font-black rounded-full text-lg hover:scale-105 transition-all cursor-pointer flex-1 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              Play Again
            </button>
            <button 
              onClick={onMenu}
              className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-full text-lg hover:scale-105 transition-all cursor-pointer flex-1 hover:border-zinc-700"
            >
              Select Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
