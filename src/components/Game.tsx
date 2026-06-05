import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult } from '../types';

const TARGET_Y = 100;
const NOTE_SPEED = 480; // pixels per second (reduced by 20% from 600)
const HIT_WINDOW = 0.15; // seconds

const COLUMNS = 4;
const COLUMN_WIDTH = 64;
const COLUMN_SPACING = 16;

const KEY_MAP = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const COLOR_MAP = ['#ec4899', '#06b6d4', '#22c55e', '#eab308']; // Tailwind pink-500, cyan-500, green-500, yellow-500

export function Game({ audioUrl, beatmap, onComplete }: { audioUrl: string, beatmap: Note[], onComplete: (result: GameResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  
  const gameState = useRef({
    notes: JSON.parse(JSON.stringify(beatmap)) as Note[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    greats: 0,
    goods: 0,
    misses: 0,
    multiplier: 1,
    keysPressed: [false, false, false, false],
    lastHitText: '',
    lastHitTime: 0,
    lastHitColor: '#FFF',
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Start playing after a short delay to let user prepare
    const timer = setTimeout(() => {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }, 2000);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        if (!gameState.current.keysPressed[col]) {
          gameState.current.keysPressed[col] = true;
          if (!audio.paused) {
            handleHit(col, audio.currentTime);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        gameState.current.keysPressed[col] = false;
      }
    };
    
    const activeTouches = new Map<number, { startX: number, startY: number, triggered: boolean }>();

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          triggered: false
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!audio || audio.paused) return;

      const SWIPE_THRESHOLD = 30;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData && !touchData.triggered) {
          const deltaX = touch.clientX - touchData.startX;
          const deltaY = touch.clientY - touchData.startY;
          
          if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            touchData.triggered = true;
            let col = -1;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) col = 0; // Left
              else col = 3; // Right
            } else {
              if (deltaY > 0) col = 1; // Down
              else col = 2; // Up
            }
            
            if (col !== -1) {
              gameState.current.keysPressed[col] = true;
              setTimeout(() => {
                gameState.current.keysPressed[col] = false;
              }, 150);
              
              handleHit(col, audio.currentTime);
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    
    let animationFrameId: number;
    
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const currentTime = audio.currentTime;
      const START_X = (canvas.width - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      
      // Clear
      ctx.fillStyle = '#09090b'; // zinc-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw track backgrounds
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        ctx.fillStyle = '#18181b'; // zinc-900
        ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
      }
      
      // Draw targets
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        
        ctx.fillStyle = gameState.current.keysPressed[i] ? COLOR_MAP[i] : '#18181b';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH, 8);
        } else {
          ctx.rect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH);
        }
        ctx.fill();
        
        ctx.strokeStyle = gameState.current.keysPressed[i] ? '#FFF' : '#52525b';
        ctx.lineWidth = gameState.current.keysPressed[i] ? 3 : 2;
        ctx.stroke();
        
        ctx.fillStyle = gameState.current.keysPressed[i] ? '#000' : '#52525b';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hint = ['←', '↓', '↑', '→'][i];
        ctx.fillText(hint, x + COLUMN_WIDTH / 2, TARGET_Y + COLUMN_WIDTH / 2 + 2);
      }
      
      // Draw notes
      for (const note of gameState.current.notes) {
        if (note.hit || note.missed) continue;
        
        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;
        
        // If note passed target by more than hit window, it's a miss
        if (currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          gameState.current.combo = 0;
          gameState.current.multiplier = 1;
          gameState.current.misses++;
          gameState.current.lastHitText = 'MISS';
          gameState.current.lastHitColor = '#ef4444'; // red-500
          gameState.current.lastHitTime = performance.now();
          continue;
        }
        
        // Only draw if on screen
        if (y > -COLUMN_WIDTH && y < canvas.height) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const hint = ['←', '↓', '↑', '→'][note.column];
          
          ctx.fillStyle = COLOR_MAP[note.column];
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, COLUMN_WIDTH, COLUMN_WIDTH, 8);
          } else {
            ctx.rect(x, y, COLUMN_WIDTH, COLUMN_WIDTH);
          }
          ctx.fill();
          
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hint, x + COLUMN_WIDTH / 2, y + COLUMN_WIDTH / 2 + 2);
        }
      }
      
      // Draw UI
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#FFF';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gameState.current.score}`, 20, 40);
      ctx.fillText(`Combo: ${gameState.current.combo}`, 20, 70);
      ctx.fillText(`Multiplier: x${gameState.current.multiplier}`, 20, 100);
      
      // Draw hit text
      if (performance.now() - gameState.current.lastHitTime < 500) {
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gameState.current.lastHitColor;
        
        // Simple scale animation
        const elapsed = performance.now() - gameState.current.lastHitTime;
        const scale = 1 + Math.sin(elapsed / 100) * 0.1;
        
        ctx.save();
        ctx.translate(canvas.width / 2, TARGET_Y + 150);
        ctx.scale(scale, scale);
        ctx.fillText(gameState.current.lastHitText, 0, 0);
        ctx.restore();
      }
      
      // Draw start countdown
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GET READY', canvas.width / 2, canvas.height / 2);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const handleHit = (col: number, currentTime: number) => {
    const state = gameState.current;
    
    let closestNote: Note | null = null;
    let minDiff = HIT_WINDOW;
    
    for (const note of state.notes) {
      if (note.column === col && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }
    
    if (closestNote) {
      closestNote.hit = true;
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      
      if (state.combo >= 50) state.multiplier = 4;
      else if (state.combo >= 20) state.multiplier = 3;
      else if (state.combo >= 10) state.multiplier = 2;
      else state.multiplier = 1;
      
      let points = 0;
      if (minDiff < 0.05) {
        points = 300;
        state.perfects++;
        state.lastHitText = 'PERFECT';
        state.lastHitColor = '#eab308'; // yellow
      } else if (minDiff < 0.1) {
        points = 100;
        state.greats++;
        state.lastHitText = 'GREAT';
        state.lastHitColor = '#22c55e'; // green
      } else {
        points = 50;
        state.goods++;
        state.lastHitText = 'GOOD';
        state.lastHitColor = '#06b6d4'; // cyan
      }
      
      state.score += points * state.multiplier;
      state.lastHitTime = performance.now();
    }
  };

  const handleAudioEnded = () => {
    const state = gameState.current;
    onComplete({
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      perfects: state.perfects,
      greats: state.greats,
      goods: state.goods,
      misses: state.misses,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-950 min-h-screen text-white w-full touch-none overflow-hidden">
      <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} />
      <div className="relative w-full max-w-[800px] flex justify-center">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={800} 
          className="border border-zinc-800 rounded-lg shadow-2xl bg-zinc-950 max-w-full h-auto max-h-[100dvh]" 
        />
        <div className="absolute top-4 right-4 text-zinc-500 text-sm text-right bg-zinc-900/80 p-2 rounded-lg backdrop-blur-sm">
          <p className="hidden md:block">Use Arrow Keys to play</p>
          <p className="md:hidden">Swipe Left, Down, Up, Right to play</p>
        </div>
      </div>
    </div>
  );
}
