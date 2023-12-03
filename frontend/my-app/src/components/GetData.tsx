import { table } from "console";
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
    <table>
      <thead>
        <tr>
          {Object.keys(data[0]).map(key => <th key={key}>{key}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((item: any, index: number) => (
          <tr key={index}>
          {Object.keys(data[0]).map(key => <td key={key}>{item[key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default GetData;

