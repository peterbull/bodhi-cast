import React from 'react';
import { Fragment } from 'react';
import './App.css';
import MyMap from './components/MyMap';
import LocationInput from './components/LocationInput';

function App() {

  const handleLocationSubmit = (location) => {
    console.log("Location Submitted", location);
  };

  return (
    <Fragment>
      <LocationInput onSubmitLocation={handleLocationSubmit} />
      <MyMap />
    </Fragment>
  );
}

export default App;
