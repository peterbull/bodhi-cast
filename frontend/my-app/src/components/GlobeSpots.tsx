import React, { useEffect, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import SearchBar from "./SearchBar";
import { SpotTable } from "./SpotTable";
import { Spot } from "../types/types";
import { GlobeSize } from "../types/types";

export interface GlobeSpotsProps {
  setCurrentComponent: React.Dispatch<React.SetStateAction<string>>;
  currentSpot: Spot;
  setCurrentSpot: React.Dispatch<React.SetStateAction<Spot | undefined>>;
  spots: Spot[];
  spotClick: [number, number];
  setSpotClick: React.Dispatch<React.SetStateAction<[number, number]>>;
}

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  currentSpot,
  setCurrentSpot,
  spots,
  spotClick,
  setSpotClick,
}: GlobeSpotsProps) => {
  const globeEl = useRef<GlobeMethods>();
  const [nearbySpots, setNearbySpots] = useState<Spot[]>([]);
  const [globeSize, setGlobeSize] = useState<GlobeSize>({
    width: 700,
    height: 600,
  });
  const [query, setQuery] = useState<string>("");

  // Filter items based on the search query
  const filteredSpots = nearbySpots.filter(
    (spot) =>
      spot.spot_name.toLowerCase().includes(query.toLowerCase()) ||
      spot.street_address.toLowerCase().includes(query.toLowerCase()),
  );

  // Defining initial perspective and controls for globe component
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({
        lat: currentSpot ? currentSpot.latitude : spots[0].latitude,
        lng: currentSpot ? currentSpot.longitude : spots[0].longitude,
        altitude: 2.0,
      });
      globeEl.current.controls().enableZoom = false;
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, [currentSpot, spots]);

  // Fetches all spots -- a placeholder for querying nearby spots in the future
  useEffect(() => {
    const fetchNearbySpots = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots`,
        );
        const data: Spot[] = await res.json();
        setNearbySpots(data);
      } catch (error) {
        console.error("Error fetching nearby spot data:", error);
      }
    };

    if (spotClick.length > 0) {
      fetchNearbySpots();
    }
  }, [spotClick]);

  // Zoom in animation and component swap on spot selection
  const globeZoom = (data: any, altitude: any, ms: any) => {
    if (globeEl.current) {
      globeEl.current.pointOfView(
        {
          lat: data.latitude,
          lng: data.longitude,
          altitude: altitude,
        },
        ms,
      );
      setCurrentSpot(data);
      setTimeout(() => {
        setCurrentComponent("SwellMap");
      }, ms);
    }
  };

  const handleGlobeClick = ({ lat, lng }: { lat: number; lng: number }) => {
    setSpotClick([lat, lng]);
    console.log(`Clicked [${lat + "," + lng}]`);
  };

  const handleGlobeZoom = (spot: Spot) => {
    globeZoom(spot, 0.2, 2500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClickAddSpot = () => {
    if (globeEl.current) {
      globeEl.current.pointOfView(
        {
          lat: spotClick[0],
          lng: spotClick[1],
          altitude: 0.2,
        },
        2500,
      );
      setTimeout(() => {
        setCurrentComponent("AddSpot");
      }, 2500);
    }
  };

  return spots.length > 0 ? (
    <>
      <div className="flex flex-col bg-gray-900 pb-28">
        <h1 className="text-[#03e9f4] text-4xl text-center pt-10 pb-2 shadow-neon">
          BODHI CAST
        </h1>
        <h3 className="text-[#03e9f4] font-thin text-center uppercase">
          Riding the Data Wave to Your Next Break
        </h3>
        <div className="bg-gray-900 overflow-x-hidden">
          <Globe
            ref={globeEl}
            height={globeSize.height}
            globeImageUrl={globeImageUrl}
            backgroundColor="rgb(17 24 39)"
            onGlobeClick={handleGlobeClick}
          />
        </div>
        <p className="text-[#03e9f4] font-thin text-center">
          CLICK A LOCATION TO SEE NEARBY SPOTS
        </p>
        <div className="flex pt-8">
          <div className="text-[#03e9f4] font-thin flex-auto text-center">
            <button
              className="border-2 border-[#03e9f4] rounded px-6 py-2"
              onClick={handleClickAddSpot}
            >
              ADD A SPOT
            </button>
            <p className="pt-4">
              Current Selection:{" "}
              {`${spotClick[0].toFixed(2)},${" "}
              ${spotClick[1].toFixed(2)}`}
            </p>
            <h1 className="text-2xl text-center pt-4">NEARBY SPOTS</h1>

            <SearchBar query={query} setQuery={setQuery} />
            <SpotTable
              filteredSpots={filteredSpots}
              handleGlobeZoom={handleGlobeZoom}
            />
          </div>
        </div>
      </div>
    </>
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
