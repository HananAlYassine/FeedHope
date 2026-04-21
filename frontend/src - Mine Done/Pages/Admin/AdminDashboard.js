import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };
    const stored = localStorage.getItem('feedhope_user');
    const adminName = stored ? JSON.parse(stored).name : 'Admin';

    return (
        <div className="admin-layout">
            <AdminSidebar onLogout={handleLogout} activePage="dashboard" />
            
        </div>
    );
};

export default AdminDashboard;