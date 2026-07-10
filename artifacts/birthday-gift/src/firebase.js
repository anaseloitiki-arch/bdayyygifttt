import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCgHt5iLpxp-Tz7d2UkkZanpS9JZCPyMqU",
  authDomain: "vie-chat-808f6.firebaseapp.com",
  databaseURL: "https://vie-chat-808f6-default-rtdb.firebaseio.com",
  projectId: "vie-chat-808f6",
  storageBucket: "vie-chat-808f6.firebasestorage.app",
  messagingSenderId: "695995438861",
  appId: "1:695995438861:web:8495f8b09925b9697dc244"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);