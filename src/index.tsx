import React from 'react';
import ReactDOM from 'react-dom/client';
// Removed BrowserRouter from here if keeping it in App.tsx wrapper
import './index.css'; // Your global styles
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: [https://bit.ly/CRA-vitals](https://bit.ly/CRA-vitals)
reportWebVitals();