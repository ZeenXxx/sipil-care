import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDm_PmGLGQ9NEnaeMZJiphEfFFVRZhJDBk",
  authDomain: "sipilcare.firebaseapp.com",
  projectId: "sipilcare",
  storageBucket: "sipilcare.firebasestorage.app",
  messagingSenderId: "195505029208",
  appId: "1:195505029208:web:43fab3178aee3678b2ca2d",
  measurementId: "G-WD58LNB1G6"
};

export const app = initializeApp(firebaseConfig);
window.SIPILCARE_FB_APP = app;