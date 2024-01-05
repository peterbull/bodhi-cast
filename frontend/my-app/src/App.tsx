import "./App.css";
import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  const [spots, setSpots] = useState([]);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [spotForecast, setSpotForecast] = useState<any>([]);

  useEffect(() => {
    const fetchAllSpots = async () => {
      try {
        const res = await fetch(
          `http://${process.env.REACT_APP_BACKEND_HOST}:${process.env.REACT_APP_BACKEND_PORT}/spots`
        );
        const data = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchAllSpots();
  }, []);

  useEffect(() => {
    if (currentSpot) {
      setSpotForecast([]);
      const fetchSpotForecast = async () => {
        try {
          const now = new Date();
          const date =
            now.getUTCFullYear().toString() +
            (now.getUTCMonth() + 1).toString().padStart(2, "0") +
            now.getUTCDate().toString().padStart(2, "0");
          const res = await fetch(
            `http://${process.env.REACT_APP_BACKEND_HOST}:${process.env.REACT_APP_BACKEND_PORT}/forecasts/spots/${date}/${currentSpot.latitude}/${currentSpot.longitude}/`
          );
          const data = await res.json();
          setSpotForecast(data);
        } catch (error) {
          console.error(error);
        }
      };

      fetchSpotForecast();
    }
  }, [currentSpot]);

  return (
    <ComponentMapProvider>
      <ComponentWrapper
        spots={spots}
        currentSpot={currentSpot}
        setCurrentSpot={setCurrentSpot}
        spotForecast={spotForecast}
      />
    </ComponentMapProvider>
  );
}

export default App;
