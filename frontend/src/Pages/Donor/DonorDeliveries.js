// DonorDeliveries.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorDeliveries.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const DonorDeliveries = () => {
    const [user, setUser] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    const [filteredDeliveries, setFilteredDeliveries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Fetch deliveries (mock)
    useEffect(() => {
        if (!user) return;

        const fetchDeliveries = async () => {
            setLoading(true);
            try {
                // Mock data matching the image
                const mockDeliveries = [
                    { id: 1, title: 'Rice & Curry Dishes', volunteer: 'Sarah Johnson', status: 'Delivered', eta: '14:00', statusCode: 'delivered' },
                    { id: 2, title: 'Soup & Sandwiches', volunteer: 'Unassigned', status: 'Pending Pickup', eta: '—', statusCode: 'pending' },
                    { id: 3, title: 'Fresh Vegetables', volunteer: 'John Smith', status: 'Delivered', eta: '10:00', statusCode: 'delivered' },
                    { id: 4, title: 'Bread & Pastries', volunteer: 'Mike Ross', status: 'In Transit', eta: '16:30', statusCode: 'transit' },
                    { id: 5, title: 'Canned Goods', volunteer: 'Unassigned', status: 'Pending Pickup', eta: '—', statusCode: 'pending' },
                ];
                setDeliveries(mockDeliveries);
                setFilteredDeliveries(mockDeliveries);
            } catch (err) {
                console.error('Failed to load deliveries:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveries();
    }, [user]);

    // Calculate stats
    const pendingCount = deliveries.filter(d => d.statusCode === 'pending').length;
    const transitCount = deliveries.filter(d => d.statusCode === 'transit').length;
    const deliveredCount = deliveries.filter(d => d.statusCode === 'delivered').length;

    // Filter deliveries based on search & status
    useEffect(() => {
        let filtered = deliveries;

        if (statusFilter !== 'All') {
            filtered = filtered.filter(d => d.statusCode === statusFilter.toLowerCase());
        }

        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(d =>
                d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.volunteer.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredDeliveries(filtered);
    }, [searchTerm, statusFilter, deliveries]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Status badge style
    const getStatusClass = (statusCode) => {
        switch (statusCode) {
            case 'delivered': return 'status-delivered';
            case 'transit': return 'status-transit';
            default: return 'status-pending';
        }
    };

    const getStatusText = (status) => {
        if (status === 'Pending Pickup') return 'Pending Pickup';
        if (status === 'In Transit') return 'In Transit';
        return status;
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* Banner */}
                <div className="ddb-banner ddel-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">My Deliveries</h1>
                        <p className="ddb-banner-subtitle">Track deliveries of your donated food</p>
                    </div>
                    <div className="ddb-banner-icon">
                        <LocalShippingIcon sx={{ fontSize: 48 }} />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="ddel-stats-row">
                    <div className="ddel-stat-card">
                        <div className="ddel-stat-icon pending-icon">
                            <PendingActionsIcon />
                        </div>
                        <div className="ddel-stat-info">
                            <span className="ddel-stat-number">{pendingCount}</span>
                            <span className="ddel-stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="ddel-stat-card">
                        <div className="ddel-stat-icon transit-icon">
                            <DirectionsCarIcon />
                        </div>
                        <div className="ddel-stat-info">
                            <span className="ddel-stat-number">{transitCount}</span>
                            <span className="ddel-stat-label">In Transit</span>
                        </div>
                    </div>
                    <div className="ddel-stat-card">
                        <div className="ddel-stat-icon delivered-icon">
                            <CheckCircleIcon />
                        </div>
                        <div className="ddel-stat-info">
                            <span className="ddel-stat-number">{deliveredCount}</span>
                            <span className="ddel-stat-label">Delivered</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="ddel-search-bar">
                    <div className="ddel-search-wrapper">
                        <SearchIcon className="ddel-search-icon" />
                        <input
                            type="text"
                            placeholder="Search deliveries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ddel-search-input"
                        />
                    </div>
                    <div className="ddel-filter-buttons">
                        <button
                            className={`ddel-filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('All')}
                        >
                            All
                        </button>
                        <button
                            className={`ddel-filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Pending')}
                        >
                            Pending
                        </button>
                        <button
                            className={`ddel-filter-btn ${statusFilter === 'Transit' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Transit')}
                        >
                            In Transit
                        </button>
                        <button
                            className={`ddel-filter-btn ${statusFilter === 'Delivered' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Delivered')}
                        >
                            Delivered
                        </button>
                    </div>
                </div>

                {/* Deliveries Table */}
                <div className="ddb-card ddel-table-container">
                    <div className="ddb-card-header ddel-table-header">
                        <h3 className="ddb-card-title">Deliveries</h3>
                    </div>

                    {loading ? (
                        <div className="ddel-loading">Loading deliveries...</div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="ddel-empty">
                            <p>No deliveries found.</p>
                            <p className="ddel-empty-sub">Try adjusting your search or filter.</p>
                        </div>
                    ) : (
                        <div className="ddel-table-responsive">
                            <table className="ddel-table">
                                <thead>
                                    <tr>
                                        <th>Deliverer</th>
                                        <th>Volunteer</th>
                                        <th>Status</th>
                                        <th>ETA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeliveries.map((delivery) => (
                                        <tr key={delivery.id}>
                                            <td className="ddel-title">{delivery.title}</td>
                                            <td>{delivery.volunteer}</td>
                                            <td>
                                                <span className={`ddel-status ${getStatusClass(delivery.statusCode)}`}>
                                                    {getStatusText(delivery.status)}
                                                </span>
                                            </td>
                                            <td>{delivery.eta}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Optional pagination info */}
                    {!loading && filteredDeliveries.length > 0 && (
                        <div className="ddel-table-footer">
                            Showing {filteredDeliveries.length} of {deliveries.length} items
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DonorDeliveries;