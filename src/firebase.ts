import { initializeApp, getApps, getApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgTIQfG_DUZk3BJHpEr3BtUiZtFfmtB0Q",
  authDomain: "phototherapy-mask.firebaseapp.com",
  projectId: "phototherapy-mask",
  storageBucket: "phototherapy-mask.firebasestorage.app",
  messagingSenderId: "673735734959",
  appId: "1:673735734959:web:051a1efaafab48907d065a"
};

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export default app;
