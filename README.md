# XAUUSD Professional Trade Journal

A secure, multi-user web application designed for day traders to log, track, and analyze their XAUUSD (Gold) trades. Built with a modern Glassmorphism UI, interactive 3D elements, and powered by Firebase for real-time data synchronization and authentication.

Link For Live Website - https://journalapex.netlify.app/login/login

## 🚀 Features

* **Secure Authentication:** Multi-user support with Sign Up, Sign In, and Password Reset functionality using Firebase Auth.
* **Data Privacy:** Firestore Security Rules ensure users can only view, edit, and delete their own logged trades.
* **Advanced Analytics Dashboard:**
  * Real-time calculation of Win Rate, Profit Factor, Average Win/Loss, and Maximum Drawdown.
  * Custom HTML5 Canvas charts including an Equity Curve, Outcome Donut Chart, Monthly Bar Chart, and Win Rate Gauge.
* **Trade Management:**
  * Log BUY/SELL positions with lot sizes, entry/exit prices, dates, and custom notes.
  * Dynamic trade history table with search, outcome filters, direction filters, and pagination.
  * Edit and Delete capabilities for past trades.
* **Export Capabilities:** One-click CSV export of your entire trade history.
* **Immersive UI:** 3D tilt cards, interactive particle backgrounds, and dynamic CSS styling.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
* **Backend & Database:** Firebase v10 Modular SDK (Authentication & Firestore)
* **Graphics & Charts:** HTML5 `<canvas>` API (No external charting libraries used)
* **Deployment:** Netlify (Configured with Root Redirect)

## 📁 Project Structure

The repository is organized into isolated modules for authentication and dashboard functionality:

```text
TRAIL/
├── index.html               # Root redirect file (routes to Login)
├── Login/                   # Authentication Module
│   ├── login.html           # Sign In & Sign Up UI
│   ├── script.js            # Auth logic & UI toggles
│   ├── style.css            # Auth-specific styling
│   ├── forgot.html          # Password Reset UI
│   └── forgot.js            # Password Reset logic
└── Dashboard/               # Main Application Module
    ├── dashboard.html       # Analytics & Trade Table UI
    ├── script.js            # Firestore CRUD operations & Chart rendering
    └── style.css            # Dashboard layout & theming
