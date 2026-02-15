// Firebase CDN imports (required for GitHub Pages & plain HTML)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Your Firebase configuration (already verified)
const firebaseConfig = {
  apiKey: "AIzaSyC782rWnLGhlGBc8NyYDkD47TCrgOXbAiU",
  authDomain: "cbe-school-portal.firebaseapp.com",
  databaseURL: "https://cbe-school-portal-default-rtdb.firebaseio.com",
  projectId: "cbe-school-portal",
  storageBucket: "cbe-school-portal.firebasestorage.app",
  messagingSenderId: "841837301040",
  appId: "1:841837301040:web:3df0142e8088187ae64cf5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);
