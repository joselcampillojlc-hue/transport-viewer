import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log('Main.jsx: Root created, attempting to render...');
try {
    // root.render(
    //     <div style={{ padding: 20, border: '5px solid red' }}>
    //         <h1>REACT ESTA FUNCIONANDO</h1>
    //         <p>Si ves esto, el problema está dentro de App.jsx</p>
    //     </div>
    // )
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
} catch (e) {
    console.error(e);
    document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Fatal</h1><pre>${e.message}\n${e.stack}</pre></div>`;
}

window.addEventListener('error', (event) => {
    document.body.innerHTML += `<div style="color: red; padding: 20px; border-top: 1px solid #ccc;"><h1>Runtime Error</h1><pre>${event.message}\n${event.filename}:${event.lineno}:${event.colno}</pre></div>`;
});
