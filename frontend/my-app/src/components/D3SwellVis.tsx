import { useEffect } from "react";
import { useMap } from "react-leaflet";
import * as d3 from "d3";
import * as d3Geo from "d3-geo";
import L from "leaflet";

const D3Overlay: React.FC<any> = ({ currentSpot, tileForecast }) => {
  const map = useMap();
  console.log(tileForecast);
  useEffect(() => {
    const svg = d3
      .select(map.getPanes().overlayPane)
      .append("svg")
      .attr("width", map.getSize().x)
      .attr("height", map.getSize().y);
    const g = svg.append("g").attr("class", "leaflet-zoom-hide");

    const center = map.latLngToLayerPoint(
      new L.LatLng(currentSpot.latitude, currentSpot.longitude)
    );

    const circle = g
      .append("circle")
      .attr("cx", center.x)
      .attr("cy", center.y)
      .attr("r", 40) // radius of the circle
      .style("fill", "red");

    map.on("viewreset", reset);

    reset();

    function reset() {
      const center = map.latLngToLayerPoint(
        new L.LatLng(currentSpot.latitude, currentSpot.longitude)
      );
      circle.attr("cx", center.x).attr("cy", center.y);
    }

    // Clean up the effect
    return () => {
      svg.remove();
      map.off("viewreset", reset);
    };
  }, [map, currentSpot]);

  return null;
};

export default D3Overlay;
