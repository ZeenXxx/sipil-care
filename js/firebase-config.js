import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPXHKoHxMUN30tJZQhWXP3yXosyLfBolU",
  authDomain: "sipil-care.firebaseapp.com",
  projectId: "sipil-care",
  storageBucket: "sipil-care.appspot.com",
  messagingSenderId: "165545014090",
  appId: "1:165545014090:web:176b1edf986827e73cc7b3",
  measurementId: "G-XW5RX4F9VF"
};

export const app = initializeApp(firebaseConfig);