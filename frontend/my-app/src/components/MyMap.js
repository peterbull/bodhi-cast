import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import moment from 'moment-js';
import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';

const swellData = async () => {
    const currentDate = moment();
    const year = parseInt(currentDate.format('YYYY'));
    const month = parseInt(currentDate.format('MM'));
    const day = parseInt(currentDate.format('DD'));
    const hour = parseInt(currentDate.format('hh'));

    const url = `http://localhost:8000/swelldata/${year}/${month}/${day}/${hour}`;

    try {
        const response = await fetch(url);

        const data = await response.json();
        console.log(data)
        return data;
    } catch (error) {
        console.error("Error fetching swell data:", error)
        return null;
    }
}
// 2023-11-21T20:00:00+00:00 example data to match
// currentDate.format("YYYY-MM-DDThh:mm:ss+00:00")
// 2023-11-21T15:12:20+00:00 



const MyMap = () => {
    // initialize state
    const [swellState, setSwellState] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const data = await swellData();
            setSwellState(data); // update state with the fetched data
        };  
        
        fetchData();
    }, [])

    if (!swellState) {
        // render a loading spinner as placeholder until data is fetched
        return <CircularProgress />;
    }
    
    const coordinates = [swellState[0].latitude, swellState[0].longitude];

    return (
        <MapContainer center={coordinates} zoom={13} className='h-screen'>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={coordinates}>
                <Popup>
                    Current Swell Wave Height: {swellState[0].swell_wave_height} meters <br />
                    Current Swell Wave Period: {swellState[0].swell_wave_period} seconds
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default MyMap