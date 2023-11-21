import { Fragment } from 'react';
import './App.css';
import cladioPic from './imgs/IMG_2706.jpg';

function App() {
  return (
    <Fragment>
      <div className="max-w-sm rounded overflow-hidden shadow-lg p-4">
        <img className="w-full" src={cladioPic} alt="User pic" />
        <div className="px-6 py-4">
          <div className="font-bold text-xl mb-2">John Doe</div>
          <p className="text-gray-700 text-base">
            Some quick example text to build on the card and make up the bulk of the card's content.
          </p>
        </div>
      </div>

      
    </Fragment>
  );
}

export default App;
