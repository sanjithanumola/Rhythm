import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult } from '../types';

const TARGET_Y = 100;
const NOTE_SPEED = 480; // pixels per second (reduced by 20% from 600)
const HIT_WINDOW = 0.15; // seconds

const COLUMNS = 4;
const COLUMN_WIDTH = 64;
const COLUMN_SPACING = 16;

const KEY_MAP = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const COLOR_MAP = ['#22d3ee', '#34d399', '#a3e635', '#f59e0b']; // Cyber Cyan, Mint/Emerald, Electric Lime, Warm Gold

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
    columnFlashes: [0, 0, 0, 0] as number[],
    particles: [] as Array<{ x: number, y: number, vx: number, vy: number, color: string, size: number, alpha: number }>,
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
      const state = gameState.current;
      const START_X = (canvas.width - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      
      // Clear
      ctx.fillStyle = '#05070f'; // extremely deep obsidian blue-black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw background cyber grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      
      // Draw vertical column separator lines
      for (let i = 0; i <= COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING) - COLUMN_SPACING / 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Draw scrolling horizontal grid lines (giving sense of motion/tempo)
      const gridSpacing = 60;
      const scrollOffset = (currentTime * NOTE_SPEED) % gridSpacing;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
      for (let y = scrollOffset; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(START_X - COLUMN_SPACING / 2, y);
        ctx.lineTo(START_X + COLUMNS * (COLUMN_WIDTH + COLUMN_SPACING) - COLUMN_SPACING / 2, y);
        ctx.stroke();
      }
      
      // Draw track lanes and flash effects
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        
        // Decay column flashes
        state.columnFlashes[i] = Math.max(0, state.columnFlashes[i] * 0.88);
        
        if (state.columnFlashes[i] > 0.01) {
          // Draw high-end light beam gradient
          const gradient = ctx.createLinearGradient(x, TARGET_Y, x, canvas.height);
          gradient.addColorStop(0, `rgba(16, 185, 129, ${state.columnFlashes[i] * 0.25})`);
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, TARGET_Y, COLUMN_WIDTH, canvas.height - TARGET_Y);
        } else {
          ctx.fillStyle = 'rgba(24, 24, 27, 0.3)'; // subtle dark lane
          ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
        }
      }
      
      // Draw targets (At the top target line)
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const isPressed = state.keysPressed[i];
        
        ctx.save();
        if (isPressed) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = COLOR_MAP[i];
          ctx.fillStyle = COLOR_MAP[i];
        } else {
          ctx.fillStyle = '#111827'; // Dark gray target center
        }
        
        // Draw round rect target
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH, 12);
        } else {
          ctx.rect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH);
        }
        ctx.fill();
        
        // Target border
        ctx.strokeStyle = isPressed ? '#FFF' : 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = isPressed ? 3 : 2;
        ctx.stroke();
        
        // Arrow label
        ctx.fillStyle = isPressed ? '#000' : 'rgba(52, 211, 153, 0.7)';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hint = ['←', '↓', '↑', '→'][i];
        ctx.fillText(hint, x + COLUMN_WIDTH / 2, TARGET_Y + COLUMN_WIDTH / 2 + 2);
        ctx.restore();
      }
      
      // Draw notes (The falling game beats)
      for (const note of state.notes) {
        if (note.hit || note.missed) continue;
        
        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;
        
        // Miss condition
        if (currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          state.combo = 0;
          state.multiplier = 1;
          state.misses++;
          state.lastHitText = 'MISS';
          state.lastHitColor = '#ef4444';
          state.lastHitTime = performance.now();
          continue;
        }
        
        // Render notes if visible
        if (y > -COLUMN_WIDTH && y < canvas.height) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const hint = ['←', '↓', '↑', '→'][note.column];
          const color = COLOR_MAP[note.column];
          
          ctx.save();
          // Apply neon glow based on notes closeness to target
          const cl = Math.abs(note.time - currentTime);
          ctx.shadowBlur = cl < 0.1 ? 20 : 10;
          ctx.shadowColor = color;
          
          // Outer Neon Border Pill Shape
          ctx.fillStyle = color;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, COLUMN_WIDTH, COLUMN_WIDTH, 12);
          } else {
            ctx.rect(x, y, COLUMN_WIDTH, COLUMN_WIDTH);
          }
          ctx.fill();
          
          // White neon core core
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + 4, y + 4, COLUMN_WIDTH - 8, COLUMN_WIDTH - 8, 8);
          } else {
            ctx.rect(x + 4, y + 4, COLUMN_WIDTH - 8, COLUMN_WIDTH - 8);
          }
          ctx.fill();
          
          // Arrow indicator in note
          ctx.fillStyle = color;
          ctx.font = 'bold 34px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hint, x + COLUMN_WIDTH / 2, y + COLUMN_WIDTH / 2 + 1);
          ctx.restore();
        }
      }
      
      // Draw Particles system
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // light gravity
        p.alpha -= 0.024; // fade
        if (p.alpha <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Modern Futuristic HUD Overlays
      // Score Panel
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      
      // Glow score background panel
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(20, 20, 200, 100, 8);
      } else {
        ctx.rect(20, 20, 200, 100);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.stroke();
      
      // Score text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('SCORE', 35, 45);
      
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(state.score.toLocaleString(), 35, 75);
      
      // Combo and Multiplier Display
      if (state.combo > 0) {
        ctx.textAlign = 'center';
        
        // Multiplier Glow Ring
        const ringX = canvas.width - 100;
        const ringY = 70;
        const ringRadius = 40;
        
        ctx.beginPath();
        ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        // Animated partial progress ring for combo multiplier
        const progressPercent = Math.min(1, (state.combo % 10) / 10);
        ctx.beginPath();
        ctx.arc(ringX, ringY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (progressPercent || 1));
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('MULTIPLIER', ringX, ringY - 14);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`x${state.multiplier}`, ringX, ringY + 8);
        
        // Huge dynamic center combo counter
        ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${state.combo} COMBO`, canvas.width / 2, TARGET_Y - 40);
      }
      ctx.restore();
      
      // Draw rating hit text with neon slide & fade animation
      if (performance.now() - state.lastHitTime < 500) {
        ctx.save();
        ctx.font = 'black 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const elapsed = performance.now() - state.lastHitTime;
        const scale = 1.1 - (elapsed / 500) * 0.1;
        const alpha = Math.max(0, 1 - elapsed / 500);
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = state.lastHitColor;
        ctx.globalAlpha = alpha;
        
        ctx.translate(canvas.width / 2, TARGET_Y + 160);
        ctx.scale(scale, scale);
        ctx.fillStyle = state.lastHitColor;
        ctx.fillText(state.lastHitText, 0, 0);
        ctx.restore();
      }
      
      // Draw start countdown overlay
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Spin a futuristic radar ring
        const countTime = performance.now() / 1000;
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#10b981';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 90, countTime * 2, countTime * 2 + Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
    
    // Set column flash to full intensity
    state.columnFlashes[col] = 1.0;
    
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
        state.lastHitColor = '#34d399'; // Emerald Mint
      } else if (minDiff < 0.1) {
        points = 100;
        state.greats++;
        state.lastHitText = 'GREAT';
        state.lastHitColor = '#a3e635'; // Lime Green
      } else {
        points = 50;
        state.goods++;
        state.lastHitText = 'GOOD';
        state.lastHitColor = '#22d3ee'; // Cyber Cyan
      }
      
      state.score += points * state.multiplier;
      state.lastHitTime = performance.now();

      // Spawn reactive visual particles
      const START_X = (800 - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      const targetX = START_X + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
      const pColor = COLOR_MAP[col];
      
      for (let i = 0; i < 15; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * (Math.PI * 0.8); // fan upwards and outwards
        const speed = 2 + Math.random() * 7;
        state.particles.push({
          x: targetX,
          y: TARGET_Y + COLUMN_WIDTH / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: pColor,
          size: 2 + Math.random() * 4,
          alpha: 1.0,
        });
      }
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
