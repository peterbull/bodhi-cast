import React, { ReactElement, useState, useEffect } from "react";

function GetData() {
    const [data, setData] = useState(null);

    const fetchData = async () => {
        const res = await fetch("http://localhost:8000/waveforecast/1/1");
        const result = res.json();
        return result;
  };

  useEffect(() => {
    fetchData().then(data => setData(data)).catch(error => console.error(error))
  },[])

  return data;
}

export default GetData;
