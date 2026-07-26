// 1. Import Firebase Modules via CDN (Added sendPasswordResetEmail)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJZo227pWs4uZ6VfRrb1CLeptAeMWQ294",
  authDomain: "aura-tradez.firebaseapp.com",
  projectId: "aura-tradez",
  storageBucket: "aura-tradez.firebasestorage.app",
  messagingSenderId: "561727559469",
  appId: "1:561727559469:web:6fbfb99a9a9c34dc9ce5a4",
  measurementId: "G-GN30L56NP0"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------------
     A. 3D BACKGROUND CANVAS
     ------------------------------------------------------------------------ */
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
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
    }
    draw() {
      const scale = 1000 / (1000 - this.z);
      const px = (this.x - width / 2) * scale + width / 2 + (mouse.x - width / 2) * 0.02 * scale;
      const py = (this.y - height / 2) * scale + height / 2 + (mouse.y - height / 2) * 0.02 * scale;

      ctx.beginPath();
      ctx.arc(px, py, this.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class FloatingSphere {
    constructor(x, y, radius, color) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.color = color;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = 0.005 + Math.random() * 0.005;
      this.range = 30 + Math.random() * 20;
    }
    update() { this.angle += this.speed; }
    draw() {
      const offsetY = Math.sin(this.angle) * this.range;
      const offsetX = Math.cos(this.angle * 0.8) * (this.range * 0.5);
      const parallaxX = (mouse.x - width / 2) * 0.04;
      const parallaxY = (mouse.y - height / 2) * 0.04;

      const grad = ctx.createRadialGradient(
        this.x + offsetX + parallaxX - this.radius * 0.3, this.y + offsetY + parallaxY - this.radius * 0.3, this.radius * 0.1,
        this.x + offsetX + parallaxX, this.y + offsetY + parallaxY, this.radius
      );

      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, this.color);
      grad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(this.x + offsetX + parallaxX, this.y + offsetY + parallaxY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.25;
      ctx.fill();
    }
  }

  const particles = Array.from({ length: 70 }, () => new Particle());
  const spheres = [
    new FloatingSphere(width * 0.15, height * 0.25, 120, '#3b82f6'),
    new FloatingSphere(width * 0.85, height * 0.75, 160, '#8b5cf6'),
    new FloatingSphere(width * 0.80, height * 0.20, 90, '#06b6d4')
  ];

  function renderCanvas() {
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    ctx.clearRect(0, 0, width, height);
    spheres.forEach(sphere => { sphere.update(); sphere.draw(); });

    particles.forEach((p, index) => {
      p.update(); p.draw();
      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#3b82f6';
          ctx.globalAlpha = (1 - dist / 110) * 0.15;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(renderCanvas);
  }
  renderCanvas();


  /* ------------------------------------------------------------------------
     B. 3D GLASS CARD TILT
     ------------------------------------------------------------------------ */
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


  /* ------------------------------------------------------------------------
     C. TOGGLE BETWEEN SIGN IN AND SIGN UP VIEWS
     ------------------------------------------------------------------------ */
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const cardFooterText = document.getElementById('cardFooterText');

  let isSignupMode = false;

  cardFooterText.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      isSignupMode = !isSignupMode;

      if (isSignupMode) {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        formTitle.textContent = 'Create Account';
        formSubtitle.textContent = 'Start tracking your XAUUSD trades';
        cardFooterText.innerHTML = `Already have an account? <a href="#">Sign in</a>`;
      } else {
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
        formTitle.textContent = 'Welcome Back';
        formSubtitle.textContent = 'Access your XAUUSD Journal dashboard';
        cardFooterText.innerHTML = `Don't have an account? <a href="#">Create one</a>`;
      }
    }
  });


  /* ------------------------------------------------------------------------
     D. PASSWORD VISIBILITY TOGGLE
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      btn.querySelector('.eyeIcon').innerHTML = isVisible
        ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
        : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    });
  });


  /* ------------------------------------------------------------------------
     E. BUTTON RIPPLE EFFECT
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.submit-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });



  /* ------------------------------------------------------------------------
     G. FIREBASE AUTHENTICATION (VALIDATION, SUBMISSION, & REDIRECT)
     ------------------------------------------------------------------------ */
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  function triggerErrorShake() {
    glassCard.classList.remove('shake');
    void glassCard.offsetWidth;
    glassCard.classList.add('shake');
  }

  // 1. Handle Sign In
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    let isValid = true;

    if (!validateEmail(email)) { document.getElementById('loginEmailGroup').classList.add('invalid'); isValid = false; } 
    else { document.getElementById('loginEmailGroup').classList.remove('invalid'); }

    if (password.length < 8) { document.getElementById('loginPasswordGroup').classList.add('invalid'); isValid = false; } 
    else { document.getElementById('loginPasswordGroup').classList.remove('invalid'); }

    if (!isValid) return triggerErrorShake();

    const submitBtn = document.getElementById('loginSubmitBtn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Firebase Sign In
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        // Correct path to exit the Login folder and enter the Dashboard folder
        window.location.href = "../Dashboard/dashboard.html"; 
      })
      .catch((error) => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        triggerErrorShake();
        alert(`Login failed: ${error.message}`);
      });
  });

  // 2. Handle Sign Up
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const name = document.getElementById('signupName').value.trim();
    let isValid = true;

    if (name === '') { document.getElementById('signupNameGroup').classList.add('invalid'); isValid = false; } 
    else { document.getElementById('signupNameGroup').classList.remove('invalid'); }

    if (!validateEmail(email)) { document.getElementById('signupEmailGroup').classList.add('invalid'); isValid = false; } 
    else { document.getElementById('signupEmailGroup').classList.remove('invalid'); }

    if (password.length < 8) { document.getElementById('signupPasswordGroup').classList.add('invalid'); isValid = false; } 
    else { document.getElementById('signupPasswordGroup').classList.remove('invalid'); }

    if (!isValid) return triggerErrorShake();

    const submitBtn = document.getElementById('signupSubmitBtn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Firebase Create Account
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        alert("Account created successfully!");
        
        // Correct path to exit the Login folder and enter the Dashboard folder
        window.location.href = "../Dashboard/dashboard.html"; 
      })
      .catch((error) => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        triggerErrorShake();
        alert(`Signup failed: ${error.message}`);
      });
  });

});
