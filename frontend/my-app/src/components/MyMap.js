import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import moment from 'moment-js';
import { useEffect } from 'react';

const swellData = async () => {
    const currentDate = moment();
    const year = parseInt(currentDate.format('YYYY'));
    const month = parseInt(currentDate.format('MM'));
    const day = parseInt(currentDate.format('DD'));

    const url = `http://localhost:8000/swelldata/${year}/${month}/${day}`;

    try {
        const response = await fetch(url);

        const data = await response.json();
        console.log(data)
    } catch (error) {
        console.error("Error fetching swell data:", error)
    }
}




const MyMap = () => {

    useEffect(() => {
        swellData();
    }, [])

    return (
        <MapContainer center={[51.505, -0.09]} zoom={13} className='h-screen'>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[51.505, -0.09]}>
                <Popup>
                    A pretty CSS3 popup. <br /> Easily customizable.
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default MyMap