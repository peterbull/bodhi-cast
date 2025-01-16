import { createFileRoute } from "@tanstack/react-router";
import { useGlobe } from "@/hooks/useGlobe";
import { GlobeView } from "@/components/GlobeView";
import { SpotList } from "@/components/SpotList";
import { SearchBar } from "@/components/SearchBar";

export const Route = createFileRoute('/')({
  component: SpotSelector
});

export function SpotSelector() {
  const { setHeight } = useGlobe();
  
  

  return (
    <>
      <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-normal text-center pt-2 uppercase" onClick={() => setHeight(2000)}>
            BODHI CAST
          </h1>
          <h3 className="text-center uppercase">
            Riding the Data Wave to Your Next Break
          </h3>
        <GlobeView />
        <SearchBar />
        <SpotList />
      </div>
    </>
  );
}