import { useSearch } from "@/hooks/useSearch";

export const SearchBar = () => {
  const {searchQuery, setSearchQuery} = useSearch();
  return (
    <input
      type="text"
      className="border-neon focus:outline-none border-2 rounded bg-gray-900 w-64 px-1"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );
};