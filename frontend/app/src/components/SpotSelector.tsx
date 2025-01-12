import { useGlobe } from "@/hooks/useGlobe";
import { GlobeView } from "./GlobeView";
import { SpotList } from "./SpotList";
import { SearchBar } from "./SearchBar";

export function SpotSelector() {
  const { setHeight } = useGlobe();
  
  

  return (
    <>
    <div className="flex flex-col items-center gap-4">
      <p onClick={() => setHeight(2000)}>test</p>
      <GlobeView />
      <SearchBar />
      <SpotList />
    </div>
    </>
  );
}
