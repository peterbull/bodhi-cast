import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  currentSpot,
  setCurrentSpot,
  spots,
}) => {
  const globeEl = useRef<any>();
  const [nearbySpots, setNearbySpots] = useState<any>([]);
  const [spotClick, setSpotClick] = useState<any>([]);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({
        lat: currentSpot ? currentSpot.latitude : spots[0].latitude,
        lng: currentSpot ? currentSpot.longitude : spots[0].longitude,
        altitude: 1.0,
      });
    }
  });

  useEffect(() => {
    const fetchNearbySpots = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/spots`);
        const data = await res.json();
        setNearbySpots(data);
        console.log(`Nearby Spots updated: ${data}`);
      } catch (error) {
        console.error("Error fetching nearby spot data:", error);
      }
    };

    if (spotClick.length > 0) {
      fetchNearbySpots();
    }
  }, [spotClick]);

  return spots.length > 0 ? (
    <div>
      <Globe
        ref={globeEl}
        globeImageUrl={globeImageUrl}
        labelsData={spots}
        labelLat="latitude"
        labelLng="longitude"
        labelText="spot_name"
        labelSize={0.0}
        labelDotRadius={0.4}
        labelColor={() => "rgba(164, 255, 61, 0.5)"}
        labelLabel={(spot: any) =>
          `<div>
          <b>${spot.spot_name}</b>
        </div>`
        }
        onGlobeClick={({ lat, lng }: any) => {
          console.log(`Clicked at latitude: ${lat}, longitude: ${lng}`);
          setSpotClick([lat, lng]);
        }}
        onLabelClick={(label: any) => {
          globeEl.current.pointOfView(
            {
              lat: label.latitude,
              lng: label.longitude,
              altitude: 0.1,
            },
            2500
          );
          setCurrentSpot(spots.find((spot: any) => spot.id === label.id));
          setTimeout(() => {
            setCurrentComponent("SwellMap");
          }, 2500);
        }}
      />
    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
