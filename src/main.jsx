import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import IlikaCampaign from './IlikaCampaign.jsx'
import GroupPageRoute from './GroupPageRoute.jsx'
import AdminRoute from './AdminRoute.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<IlikaCampaign />} />
                <Route path="/group/:slug" element={<GroupPageRoute />} />
                <Route path="/admin" element={<AdminRoute />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>,
)
