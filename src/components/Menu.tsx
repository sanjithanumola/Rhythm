/**
 * Menu Component
 * 
 * This file renders the main menu of the Lyria Rhythm game.
 * It allows the user to select the duration mode (Quick Test or Full Song)
 * and start the generation process, or open the Song Library.
 * 
 * Use Cases:
 * - Display game instructions and controls.
 * - Select between 30s and 100s track generation.
 * - Navigate to the pre-generated Song Library.
 */

import React from 'react';
import { GenerationOptions } from '../types';
import { Music, Zap, Play } from 'lucide-react';
import { FEATURED_SONGS, LibrarySong } from '../game/songs';

/**
 * Props for the Menu component.
 */
interface MenuProps {
  /** Callback fired when the user clicks "Generate Song & Play" (kept for prop compatibility) */
  onStart: (options: GenerationOptions) => void;
  /** Callback fired when the user selects a pre-generated song */
  onSelectLibrarySong: (song: LibrarySong) => void;
  /** Optional error message to display (kept for prop compatibility) */
  errorMsg?: string | null;
  /** Whether the user has selected an API key (kept for prop compatibility) */
  hasKey: boolean;
  /** Callback to open the API key selection dialog (kept for prop compatibility) */
  onSelectKey: () => void;
}

/**
 * Renders the main menu interface with featured tracks and a modern interactive play guide.
 */
export function Menu({ onStart, onSelectLibrarySong, errorMsg, hasKey, onSelectKey }: MenuProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-7xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-teal-300 to-emerald-500">
          LYRIA RHYTHM
        </h1>
        <p className="text-xl mb-12 text-zinc-400 leading-relaxed max-w-3xl mx-auto">
          Explore a gorgeous, high-fidelity neon rhythm experience. 
          Challenge your reflexes, master the beat, and sync your moves perfectly across a library of immersive tracks.
        </p>

        {/* Playable Tracks Section */}
        {FEATURED_SONGS.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-zinc-200 text-left">Select a Track</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURED_SONGS.map((song) => (
                <div 
                  key={song.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all group cursor-pointer"
                  onClick={() => onSelectLibrarySong(song)}
                >
                  <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                        <Music size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black pl-1">
                        <Play size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 text-left">
                    <h3 className="font-bold text-lg text-white mb-1 truncate">{song.title}</h3>
                    <p className="text-zinc-400 text-sm mb-3 truncate">{song.artist}</p>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{song.duration}</span>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{song.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Play Section */}
        <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left shadow-xl">
          <h2 className="text-xl font-bold text-zinc-200 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-emerald-400" />
            How to Play
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Use the arrow keys on your keyboard to hit the scrolling notes as they perfectly align with the target arrows at the top of the track.
              </p>
              <div className="flex items-center space-x-2 mt-4">
                <kbd className="px-3 py-1.5 bg-zinc-850 rounded-lg border border-zinc-700 font-mono text-sm shadow">←</kbd>
                <kbd className="px-3 py-1.5 bg-zinc-850 rounded-lg border border-zinc-700 font-mono text-sm shadow">↓</kbd>
                <kbd className="px-3 py-1.5 bg-zinc-850 rounded-lg border border-zinc-700 font-mono text-sm shadow">↑</kbd>
                <kbd className="px-3 py-1.5 bg-zinc-850 rounded-lg border border-zinc-700 font-mono text-sm shadow">→</kbd>
              </div>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-zinc-850 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-2">Mobile / Touch Support</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Playing on a mobile-screen? Swipe <span className="font-semibold text-zinc-300">Left</span>, <span className="font-semibold text-zinc-300">Down</span>, <span className="font-semibold text-zinc-300">Up</span>, or <span className="font-semibold text-zinc-300">Right</span> to trigger critical hits!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
