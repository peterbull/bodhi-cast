import React from "react";

const SearchBar = ({ query, setQuery }: any) => {
  return (
    <input
      type="text"
      className="border-[#03e9f4] focus:outline-none border-2 rounded bg-gray-900 w-64 px-1"
      placeholder="Search..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
};

export default SearchBar;
