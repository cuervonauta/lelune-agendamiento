import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Importa los estilos que tienes en el Canvas

// Este código busca el elemento con id 'root' en tu index.html y "dibuja" la App allí
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
