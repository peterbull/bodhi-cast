import "./App.css";
import { useState } from "react";
import { useSpotsContext } from "./hooks/useSpot";
import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

function App() {
  const [spotClick, setSpotClick] = useState<[number, number]>([0, 0]);
  const { spots, currentSpot, setCurrentSpot, spotForecast } =
    useSpotsContext();

  return (
    <ComponentMapProvider>
      <ComponentWrapper
        spots={spots}
        currentSpot={currentSpot}
        setCurrentSpot={setCurrentSpot}
        spotForecast={spotForecast}
        spotClick={spotClick}
        setSpotClick={setSpotClick}
      />
    </ComponentMapProvider>
  );
}

export default App;
