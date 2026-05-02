import React, { useEffect, useRef, useState } from "react";
import { prepareWithSegments, layoutNextLine, materializeLineRange } from "@chenglou/pretext";

const MANIFESTO_TEXT = `В эпоху информационного шума и бесконечных потоков данных, управление образовательным учреждением требует не просто автоматизации, а интеллектуальной адаптивности. Система Mirai создана для того, чтобы мгновенно подстраиваться под любые изменения. Подобно тому, как этот текст плавно и безошибочно огибает препятствия, наша архитектура безупречно интегрирует тысячи расписаний, оценок, финансовых транзакций и коммуникаций. Наш движок гарантирует производительность при любых нагрузках. Никаких задержек, никаких компромиссов. Искусственный интеллект — это ядро, которое анализирует паттерны, предсказывает риски и высвобождает время для самого главного: для людей. Будущее образования начинается здесь, где технология становится невидимой, а результат — очевидным. Скорость. Интеллект. Адаптивность. Mirai. Мы меняем правила игры в индустрии EdTech.`;

export function AiCoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Floating orb state
  const orbRef = useRef({ x: 0, y: 0, radius: 80, time: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000 }); // track mouse for interactive repulsion

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const fontStyle = "18px 'Inter', sans-serif";
    ctx.font = fontStyle;
    ctx.textBaseline = "top";

    // Prepare text once
    const preparedText = prepareWithSegments(MANIFESTO_TEXT, fontStyle);
    const lineHeight = 28;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Update Orb position (float vertically, move towards mouse if close)
      const orb = orbRef.current;
      orb.time += 0.02;
      
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      
      // Default floating path
      let targetX = centerX + Math.sin(orb.time * 0.5) * 50;
      let targetY = centerY + Math.cos(orb.time * 0.7) * 80;

      // Mouse attraction/repulsion logic
      const dxMouse = mouseRef.current.x - targetX;
      const dyMouse = mouseRef.current.y - targetY;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      
      if (distMouse < 200) {
        // Gently pull orb towards mouse
        targetX += dxMouse * 0.1;
        targetY += dyMouse * 0.1;
      }

      // Smooth interpolation for orb movement
      orb.x += (targetX - orb.x) * 0.1;
      orb.y += (targetY - orb.y) * 0.1;

      // Draw Orb glow
      const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 2);
      gradient.addColorStop(0, "rgba(0, 122, 255, 0.4)"); // macOS blue transparent
      gradient.addColorStop(0.5, "rgba(52, 199, 89, 0.1)"); // green tint
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw Orb core
      ctx.fillStyle = "rgba(0, 122, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Text rendering logic with pretext
      ctx.fillStyle = "rgba(29, 29, 31, 0.6)"; // text-tertiary color
      
      let cursor: any = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 20;
      const maxWidth = dimensions.width - 40; // 20px padding

      while (y < dimensions.height - lineHeight) {
        // Calculate available width for this line considering the orb
        const lineCenterY = y + lineHeight / 2;
        const dy = Math.abs(lineCenterY - orb.y);
        
        let lineMaxWidth = maxWidth;
        let xOffset = 20;

        // If line intersects with the orb's repulsion radius
        const repulsionRadius = orb.radius + 20; // 20px padding around orb
        if (dy < repulsionRadius) {
           const dx = Math.sqrt(repulsionRadius * repulsionRadius - dy * dy);
           // Assume orb is roughly in the middle, we split text or push it.
           // For simplicity, we will push the text to the left or right of the orb.
           // Pretext layoutNextLine needs a single max width. 
           // If orb is on the left, we indent the start.
           
           if (orb.x < dimensions.width / 2) {
               // Orb on left, push text right
               const pushRightTo = orb.x + dx;
               if (pushRightTo > xOffset) {
                   const shift = pushRightTo - xOffset;
                   xOffset += shift;
                   lineMaxWidth -= shift;
               }
           } else {
               // Orb on right, shrink max width
               const pushLeftTo = orb.x - dx;
               if (pushLeftTo < xOffset + lineMaxWidth) {
                   lineMaxWidth = pushLeftTo - xOffset;
               }
           }
        }

        // Layout the line using pretext
        const line = layoutNextLine(preparedText, cursor, lineMaxWidth);
        if (!line) break; // Reached end of text
        
        // Draw the materialized text
        ctx.fillText(line.text, xOffset, y);
        
        cursor = line.end;
        y += lineHeight;
        
        // If we finished the text, we could optionally loop it, but we'll just stop
        if (cursor.segmentIndex >= preparedText.segments.length) {
            break; 
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  };

  const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] relative rounded-3xl overflow-hidden border border-[rgba(0,122,255,0.12)] bg-[linear-gradient(135deg,rgba(255,255,255,0.6),rgba(240,244,255,0.4))] shadow-subtle backdrop-blur-[10px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />
    </div>
  );
}
