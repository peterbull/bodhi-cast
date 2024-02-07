import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import { table } from "console";

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  currentSpot,
  setCurrentSpot,
  spots,
}) => {
  const globeEl = useRef<any>();
  const [nearbySpots, setNearbySpots] = useState<any>([]);
  const [spotClick, setSpotClick] = useState<any>([0, 0]);
  const [globeSize, setGlobeSize] = useState({ width: 700, height: 600 });

  useEffect(() => {
    const updateGlobeSize = () => {
      if (globeEl.current && globeEl.current.parentElement) {
        const { width, height } =
          globeEl.current.parentElement.getBoundingClientRect();
        setGlobeSize({ width, height });
      }
    };

    // Call updateGlobeSize on mount and add a resize listener
    updateGlobeSize();
    window.addEventListener("resize", updateGlobeSize);

    // Clean up the resize listener on component unmount
    return () => {
      window.removeEventListener("resize", updateGlobeSize);
    };
  }, []);

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

  const globeZoom = (data: any, altitude: any, ms: any) => {
    globeEl.current.pointOfView(
      {
        lat: data.latitude,
        lng: data.longitude,
        altitude: altitude,
      },
      ms
    );
    setCurrentSpot(data);
    setTimeout(() => {
      setCurrentComponent("SwellMap");
    }, ms);
  };

  return spots.length > 0 ? (
    <>
      <div className="flex flex-col bg-gray-900">
        <h1 className="text-[#03e9f4] text-4xl text-center pt-10 pb-2 shadow-neon">
          BODHI CAST
        </h1>
        <h3 className="text-[#03e9f4] font-thin text-center uppercase">
          Riding the Data Wave to Your Next Break
        </h3>
        <div className="bg-gray-900 overflow-x-hidden">
          <div>
            <Globe
              ref={globeEl}
              height={globeSize.height}
              globeImageUrl={globeImageUrl}
              backgroundColor="rgb(17 24 39)"
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
        </div>
        <div>
          <p className="text-[#03e9f4] font-thin text-center">
            CLICK A LOCATION TO SEE NEARBY SPOTS
          </p>
        </div>
        <div className="flex pt-8">
          <div className="text-[#03e9f4] font-thin flex-auto text-center">
            <button
              className="border-2 border-[#03e9f4] rounded px-6 py-2"
              onClick={() => {
                globeEl.current.pointOfView(
                  {
                    lat: spotClick[0],
                    lng: spotClick[1],
                    altitude: 0.2,
                  },
                  2500
                );
                setTimeout(() => {
                  setCurrentComponent("AddSpot");
                }, 2500);
              }}
            >
              ADD A SPOT
            </button>
            <p className="pt-4">
              Current Selection:{" "}
              {spotClick.length > 0
                ? `${spotClick[0].toFixed(2)},${" "}
              ${spotClick[1].toFixed(2)}`
                : `None`}
            </p>
            <h1 className="text-2xl text-center pt-4">NEARBY SPOTS</h1>
            <table className="mx-auto text-center divide-y divide-gray-500">
              <thead>
                <tr className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <th colSpan={1}>NAME</th>
                  <th colSpan={1}>LOCATION</th>
                  <th colSpan={1}>LAT</th>
                  <th colSpan={1}>LON</th>
                </tr>
              </thead>
              <tbody>
                {nearbySpots.map((spot: any) => (
                  <tr
                    className="hover:text-[#95f2f7] text-[#03e9f4] hover:font-normal justify-left text-center text-s font-thin border-0 bg-gray-900 divide-gray-200"
                    key={spot.id}
                    onClick={() => globeZoom(spot, 0.2, 2500)}
                  >
                    <td className="py-2 px-2 cursor-pointer">
                      {spot.spot_name}
                    </td>
                    <td className="py-2 px-2 cursor-pointer">
                      {spot.street_address}
                    </td>
                    <td className="py-2 px-2 cursor-pointer">
                      {spot.latitude.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 cursor-pointer">
                      {spot.longitude.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
