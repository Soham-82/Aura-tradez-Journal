// 1. Import Firebase Modules via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJZo227pWs4uZ6VfRrb1CLeptAeMWQ294",
  authDomain: "aura-tradez.firebaseapp.com",
  projectId: "aura-tradez",
  storageBucket: "aura-tradez.firebasestorage.app",
  messagingSenderId: "561727559469",
  appId: "1:561727559469:web:6fbfb99a9a9c34dc9ce5a4",
  measurementId: "G-GN30L56NP0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {

  // --- A. 3D BACKGROUND CANVAS ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.z = Math.random() * 1000;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.size = Math.random() * 2 + 1;
      this.color = ['#3b82f6', '#06b6d4', '#8b5cf6'][Math.floor(Math.random() * 3)];
      this.alpha = Math.random() * 0.6 + 0.2;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
    }
    draw() {
      const scale = 1000 / (1000 - this.z);
      const px = (this.x - width / 2) * scale + width / 2 + (mouse.x - width / 2) * 0.02 * scale;
      const py = (this.y - height / 2) * scale + height / 2 + (mouse.y - height / 2) * 0.02 * scale;
      ctx.beginPath(); ctx.arc(px, py, this.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.globalAlpha = this.alpha;
      ctx.fill();
    }
  }

  const particles = Array.from({ length: 70 }, () => new Particle());
  function renderCanvas() {
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p, index) => {
      p.update(); p.draw();
      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));
        if (dist < 110) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#3b82f6'; ctx.globalAlpha = (1 - dist / 110) * 0.15;
          ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    });
    requestAnimationFrame(renderCanvas);
  }
  renderCanvas();

  // --- B. 3D GLASS CARD TILT ---
  const cardWrapper = document.getElementById('cardWrapper');
  const glassCard = document.getElementById('glassCard');
  window.addEventListener('mousemove', (e) => {
    const rect = glassCard.getBoundingClientRect();
    const rotateX = (-(e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)) * 12;
    const rotateY = ((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)) * 12;
    cardWrapper.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    glassCard.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    glassCard.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  });
  document.addEventListener('mouseleave', () => { cardWrapper.style.transform = `rotateX(0deg) rotateY(0deg)`; });

  // --- C. BUTTON RIPPLE EFFECT ---
  document.getElementById('resetBtn').addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // --- D. FORM SUBMISSION (FIREBASE RESET) ---
  const forgotForm = document.getElementById('forgotForm');
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!validateEmail(email)) {
      document.getElementById('emailGroup').classList.add('invalid');
      glassCard.classList.remove('shake');
      void glassCard.offsetWidth;
      glassCard.classList.add('shake');
      return;
    } else {
      document.getElementById('emailGroup').classList.remove('invalid');
    }

    const resetBtn = document.getElementById('resetBtn');
    resetBtn.classList.add('loading');
    resetBtn.disabled = true;

    sendPasswordResetEmail(auth, email)
      .then(() => {
        resetBtn.classList.remove('loading');
        resetBtn.disabled = false;
        alert(`A password reset link has been sent to ${email}. Please check your inbox.`);
        window.location.href = "login.html"; // Redirect back to login
      })
      .catch((error) => {
        resetBtn.classList.remove('loading');
        resetBtn.disabled = false;
        glassCard.classList.remove('shake');
        void glassCard.offsetWidth;
        glassCard.classList.add('shake');
        alert(`Error: ${error.message}`);
      });
  });

});
