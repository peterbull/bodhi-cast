import { Fragment } from 'react';
import './App.css';
import cladioPic from './imgs/IMG_2706.jpg';

const Button = ({ children }) => (
  <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
    {children}
  </button>
);

const Alert = ({ message, type}) => (
  <div className={`p-4 ${type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
    {message}
  </div>
);

const toggleButton = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <button
      onClick={() => setIsActive(!isActive)}
  )
}

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
    
      <Button>
        Click Me
      </Button>

      <Alert message="Success" type="success" />
      <Alert message="Error" type="error" />
    
      {/* responsive design, md: lg: */}
      <div className='flex flex-col md:flex-row text-center'>
        <div className='md:w-1/2'>Left Side</div>
        <div className='md:w-1/2'>Right Side</div>
      </div>


    </Fragment>
  );
}

export default App;
