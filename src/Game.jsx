import { useRef, useEffect, useState } from "react";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const BASE_DELAY = 300;

export default function Game() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [restartKey, setRestartKey] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let player = { x: 200, y: 200, size: 18 };
    let shadow = { x: -100, y: -100, size: 18 };

    let history = [];
    let shadowTrail = [];
    let keys = {};

    let gameOver = false;
    let shadowActive = false;

    let score = 0;
    let level = 1;
    let speed = 3;
    let delay = BASE_DELAY;

    let obstacles = [];
    let powerUps = [];

    let slowShadowTimer = 0;
    let freezeShadowTimer = 0;

    let highScore = Number(localStorage.getItem("shadowHighScore")) || 0;

    function generateObstacles(lvl) {
      obstacles = [];
      for (let i = 0; i < lvl + 2; i++) {
        obstacles.push({
          x: Math.random() * (WIDTH - 200) + 100,
          y: Math.random() * (HEIGHT - 200) + 100,
          w: 70,
          h: 22,
          dx: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    function spawnPowerUp() {
      const type = Math.random() > 0.5 ? "slow" : "freeze";
      powerUps.push({
        x: Math.random() * (WIDTH - 100) + 50,
        y: Math.random() * (HEIGHT - 100) + 50,
        r: 12,
        type,
      });
    }

    generateObstacles(level);

    const down = (e) => (keys[e.key] = true);
    const up = (e) => (keys[e.key] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    function circleRect(cx, cy, r, rect) {
      return (
        cx + r > rect.x &&
        cx - r < rect.x + rect.w &&
        cy + r > rect.y &&
        cy - r < rect.y + rect.h
      );
    }

    function update() {
      if (gameOver || paused) return;

      score++;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("shadowHighScore", highScore);
      }

      if (score % 1200 === 0) {
        level++;
        speed += 0.6;
        delay = Math.max(120, delay - 20);
        generateObstacles(level);
        if (Math.random() > 0.5) spawnPowerUp();
      }

      if (keys["ArrowUp"]) player.y -= speed;
      if (keys["ArrowDown"]) player.y += speed;
      if (keys["ArrowLeft"]) player.x -= speed;
      if (keys["ArrowRight"]) player.x += speed;

      player.x = Math.max(player.size, Math.min(WIDTH - player.size, player.x));
      player.y = Math.max(player.size, Math.min(HEIGHT - player.size, player.y));

      obstacles.forEach((o) => {
        o.x += o.dx * (1 + level * 0.3);
        if (o.x < 30 || o.x + o.w > WIDTH - 30) o.dx *= -1;
        if (circleRect(player.x, player.y, player.size, o)) gameOver = true;
      });

      powerUps = powerUps.filter((p) => {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < player.size + p.r) {
          if (p.type === "slow") slowShadowTimer = 300;
          if (p.type === "freeze") freezeShadowTimer = 180;
          return false;
        }
        return true;
      });

      history.push({ x: player.x, y: player.y });

      if (history.length > delay) {
        shadowActive = true;

        if (freezeShadowTimer <= 0) {
          const target = history[0];
          shadow.x += (target.x - shadow.x) * 0.35;
          shadow.y += (target.y - shadow.y) * 0.35;
        }

        shadowTrail.push({ x: shadow.x, y: shadow.y });
        if (shadowTrail.length > 20) shadowTrail.shift();

        history.shift();
      }

      if (shadowActive && freezeShadowTimer <= 0) {
        const dx = player.x - shadow.x;
        const dy = player.y - shadow.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size + shadow.size) gameOver = true;
      }

      if (slowShadowTimer > 0) slowShadowTimer--;
      if (freezeShadowTimer > 0) freezeShadowTimer--;
    }

    function draw() {
      const grad = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        100,
        WIDTH / 2,
        HEIGHT / 2,
        WIDTH
      );
      grad.addColorStop(0, "#2b2b2b");
      grad.addColorStop(1, "#0f0f0f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = "#8b0000";
      obstacles.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));

      powerUps.forEach((p) => {
        ctx.fillStyle = p.type === "slow" ? "cyan" : "lime";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      shadowTrail.forEach((p, i) => {
        ctx.fillStyle = `rgba(180,0,255,${i / shadowTrail.length})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, shadow.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (shadowActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(180,0,255,0.9)";
        ctx.fillStyle = "#b400ff";
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, shadow.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "#00bfff";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "18px Arial";
      ctx.fillText(`Score: ${score}`, 30, 30);
      ctx.fillText(`High Score: ${highScore}`, 30, 55);
      ctx.fillText(`Level: ${level}`, 30, 80);

      if (paused) {
        ctx.font = "40px Arial";
        ctx.fillText("PAUSED", WIDTH / 2 - 80, HEIGHT / 2);
      }

      if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "48px Arial";
        ctx.fillText("GAME OVER", WIDTH / 2 - 150, HEIGHT / 2);
      }
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    loop();

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [restartKey]); // ✅ paused REMOVED from dependencies

  const goFullScreen = () => {
    containerRef.current?.requestFullscreen();
  };
  // empty-comment

  return (
    <div ref={containerRef} style={{ height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />

      <div style={{ position: "fixed", bottom: 20, left: 20 }}>
        <button onClick={() => setRestartKey((k) => k + 1)}>Restart</button>
        <button onClick={() => setPaused((p) => !p)} style={{ marginLeft: 10 }}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button onClick={goFullScreen} style={{ marginLeft: 10 }}>
          Full Screen
        </button>
      </div>
    </div>
  );
}