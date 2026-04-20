// DonorDeliveries.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorDeliveries.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

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

    // Fetch deliveries from API
    useEffect(() => {
        if (!user) return;

        const fetchDeliveries = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/donor/deliveries/${user.user_id}`);
                const data = await response.json();

                if (response.ok) {
                    setDeliveries(data);
                    setFilteredDeliveries(data);
                } else {
                    console.error('Failed to fetch deliveries:', data);
                }
            } catch (err) {
                console.error('Failed to load deliveries:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveries();
    }, [user]);

    // Calculate stats
    const acceptedCount = deliveries.filter(d => d.delivery_status === 'accepted by delivery').length;
    const inDeliverCount = deliveries.filter(d => d.delivery_status === 'in deliver').length;
    const deliveredCount = deliveries.filter(d => d.delivery_status === 'delivered').length;

    // Filter deliveries based on search & status
    useEffect(() => {
        let filtered = deliveries;

        if (statusFilter !== 'All') {
            const statusMap = {
                'Accepted': 'accepted by delivery',
                'In Deliver': 'in deliver',
                'Delivered': 'delivered'
            };
            filtered = filtered.filter(d => d.delivery_status === statusMap[statusFilter]);
        }

        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(d =>
                d.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.volunteer_name && d.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredDeliveries(filtered);
    }, [searchTerm, statusFilter, deliveries]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Status badge style
    const getStatusClass = (status) => {
        switch (status) {
            case 'delivered': return 'status-delivered';
            case 'in deliver': return 'status-transit';
            case 'accepted by delivery': return 'status-accepted';
            default: return 'status-accepted';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'accepted by delivery': return 'Accepted by Delivery';
            case 'in deliver': return 'In Deliver';
            case 'delivered': return 'Delivered';
            default: return status;
        }
    };

    // Format time
    const formatTime = (timeStr) => {
        if (!timeStr) return '—';
        const time = new Date(timeStr);
        return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
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
                        <div className="ddel-stat-icon accepted-icon">
                            <AssignmentTurnedInIcon />
                        </div>
                        <div className="ddel-stat-info">
                            <span className="ddel-stat-number">{acceptedCount}</span>
                            <span className="ddel-stat-label">Accepted</span>
                        </div>
                    </div>
                    <div className="ddel-stat-card">
                        <div className="ddel-stat-icon transit-icon">
                            <DirectionsCarIcon />
                        </div>
                        <div className="ddel-stat-info">
                            <span className="ddel-stat-number">{inDeliverCount}</span>
                            <span className="ddel-stat-label">In Deliver</span>
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
                            className={`ddel-filter-btn ${statusFilter === 'Accepted' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Accepted')}
                        >
                            Accepted
                        </button>
                        <button
                            className={`ddel-filter-btn ${statusFilter === 'In Deliver' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('In Deliver')}
                        >
                            In Deliver
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
                                        <th>Food Item</th>
                                        <th>Volunteer</th>
                                        <th>Status</th>
                                        <th>Pickup Time</th>
                                        <th>Delivery Time</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeliveries.map((delivery) => (
                                        <tr key={delivery.delivery_id}>
                                            <td className="ddel-title">{delivery.food_name}</td>
                                            <td>{delivery.volunteer_name || 'Unassigned'}</td>
                                            <td>
                                                <span className={`ddel-status ${getStatusClass(delivery.delivery_status)}`}>
                                                    {getStatusText(delivery.delivery_status)}
                                                </span>
                                            </td>
                                            <td>{formatTime(delivery.pickup_time)}</td>
                                            <td>{formatTime(delivery.delivery_time)}</td>
                                            <td className="ddel-notes">{delivery.notes || '—'}</td>
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