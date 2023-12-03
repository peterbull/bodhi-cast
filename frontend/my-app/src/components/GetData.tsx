import { useState, useEffect } from "react";

function GetData() {
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    const res = await fetch("http://localhost:8000/waveforecast/1/1");
    const result = res.json();
    return result;
  };

  useEffect(() => {
    fetchData()
      .then((data) => setData(data))
      .catch((error) => console.error(error));
  }, []);

  if (data === null) {
    return (
      <div>
        <h3>loading...</h3>
      </div>
    );
  }
  console.log(data);
  // return null;
  return (
    <div>
      <th>
        {Object.keys(data[0]).map(
          (category, index) => <tr key={index}>{category}</tr>
        )}
      </th>
    </div>
  )
  
}

export default GetData;

