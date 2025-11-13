import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const AnalyticsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #eff4ff 0%, #f6f7fb 55%, #ffffff 100%);
  color: #0f172a;

  .dark-mode & {
    background: radial-gradient(circle at top, rgba(30, 41, 59, 0.8) 0%, #0b1120 70%);
    color: #e2e8f0;
  }
`;

const AnalyticsHeader = styled.div`
  padding: 24px 32px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);

  .dark-mode & {
    background: rgba(17, 24, 39, 0.86);
    border-bottom-color: rgba(148, 163, 184, 0.08);
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    background: rgba(15, 23, 42, 0.05);
    border-color: rgba(15, 23, 42, 0.2);
  }

  .dark-mode & {
    border-color: rgba(148, 163, 184, 0.25);
    color: #e2e8f0;

    &:hover {
      background: rgba(148, 163, 184, 0.1);
      border-color: rgba(148, 163, 184, 0.4);
    }
  }
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;

  .dark-mode & {
    color: #f8fafc;
  }
`;

const AnalyticsContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.94);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.08);

  .dark-mode & {
    background: rgba(30, 41, 59, 0.92);
    border-color: rgba(148, 163, 184, 0.12);
  }
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;

  .dark-mode & {
    color: #9ca3af;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;

  .dark-mode & {
    color: #f8fafc;
  }
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1f2937;

  .dark-mode & {
    color: #f8fafc;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

  .dark-mode & {
    background: rgba(30, 41, 59, 0.92);
  }
`;

const TableHeader = styled.thead`
  background: rgba(79, 70, 229, 0.1);

  .dark-mode & {
    background: rgba(99, 102, 241, 0.2);
  }
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);

  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.12);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;

  .dark-mode & {
    color: #e2e8f0;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  color: #1f2937;
  font-size: 0.9rem;

  .dark-mode & {
    color: #cbd5e1;
  }
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 20px;

  .dark-mode & {
    background: rgba(248, 113, 113, 0.18);
    color: #fca5a5;
  }
`;

const DateRangeContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
  flex-wrap: wrap;
`;

const DateInput = styled.input`
  padding: 8px 12px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 8px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.94);
  color: #1f2937;

  .dark-mode & {
    background: rgba(30, 41, 59, 0.92);
    border-color: rgba(148, 163, 184, 0.25);
    color: #e2e8f0;
  }
`;

const FilterButton = styled.button`
  padding: 8px 16px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface ActivityStats {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByDay: Array<{ date: string; count: number }>;
  topActiveUsers: Array<{ userId: string; userName: string; activityCount: number }>;
  messagesSent: number;
  messagesReceived: number;
  conversationsCreated: number;
  logins: number;
  logouts: number;
  profileUpdates: number;
}

interface UserReport {
  userId: string;
  userName: string;
  email: string;
  totalActivities: number;
  activitiesByType: Record<string, number>;
  lastActivityAt: string | null;
  messagesSent: number;
  messagesReceived: number;
  conversationsCreated: number;
  averageMessagesPerDay: number;
  mostActiveDay: string | null;
}

const Analytics = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  
  // Set default date range to last 7 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/chats');
      return;
    }
    // Initial fetch with default dates
    fetchAnalytics();

    // Auto-refresh every 5 minutes to get latest job data
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]); // Only fetch on mount or when user changes

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // Get API URL - VITE_API_URL might already include /api, so check
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      // Ensure it ends with /api
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
      }
      
      const params = new URLSearchParams();
      if (startDate) {
        // Ensure date is in YYYY-MM-DD format and send as ISO string
        const start = new Date(startDate + 'T00:00:00');
        params.append('startDate', start.toISOString());
      }
      if (endDate) {
        // Ensure date is in YYYY-MM-DD format and send as ISO string
        const end = new Date(endDate + 'T23:59:59');
        params.append('endDate', end.toISOString());
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [statsResponse, usersResponse] = await Promise.all([
        fetch(`${apiUrl}/analytics/stats?${params.toString()}`, { headers }),
        fetch(`${apiUrl}/analytics/users?${params.toString()}`, { headers }),
      ]);

      if (!statsResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${statsResponse.status}`);
      }

      if (!usersResponse.ok) {
        const errorData = await usersResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${usersResponse.status}`);
      }

      const statsData = await statsResponse.json();
      const usersData = await usersResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
      if (usersData.success) {
        setUserReports(usersData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setError('Start date must be before or equal to end date');
        return;
      }
    }
    setError('');
    fetchAnalytics();
  };

  const handleClearFilter = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setError('');
    // fetchAnalytics will be called by useEffect when dates change
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError('');

      // Get API URL
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // First, trigger the analytics job to collect latest activities
      const jobResponse = await fetch(`${apiUrl}/analytics/trigger-job`, {
        method: 'POST',
        headers,
      });

      if (!jobResponse.ok) {
        const errorData = await jobResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to trigger analytics job');
      }

      // Wait a moment for the job to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then fetch the updated analytics data
      await fetchAnalytics();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh analytics data');
      console.error('Refresh error:', err);
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <AnalyticsContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Loader message="Loading analytics..." />
        </div>
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer>
      <AnalyticsHeader>
        <HeaderContent>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <BackButton onClick={() => navigate('/chats')}>
              ← Back
            </BackButton>
            <Title>User Activity Analytics</Title>
          </div>
        </HeaderContent>
      </AnalyticsHeader>

      <AnalyticsContent>
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <DateRangeContainer>
          <DateInput
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setError(''); // Clear error when user changes date
            }}
            placeholder="Start Date"
            max={endDate || undefined} // Prevent selecting start date after end date
          />
          <DateInput
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setError(''); // Clear error when user changes date
            }}
            placeholder="End Date"
            min={startDate || undefined} // Prevent selecting end date before start date
          />
          <FilterButton onClick={handleFilter}>Apply Filter</FilterButton>
          <FilterButton 
            onClick={handleClearFilter}
            style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}
          >
            Clear Filter
          </FilterButton>
          <FilterButton 
            onClick={handleRefresh}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            disabled={loading}
          >
            🔄 Refresh & Collect
          </FilterButton>
        </DateRangeContainer>

        {stats && (
          <>
            <StatsGrid>
              <StatCard>
                <StatLabel>Total Activities</StatLabel>
                <StatValue>{stats.totalActivities.toLocaleString()}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Messages Sent</StatLabel>
                <StatValue>{stats.messagesSent.toLocaleString()}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Messages Received</StatLabel>
                <StatValue>{stats.messagesReceived.toLocaleString()}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Conversations Created</StatLabel>
                <StatValue>{stats.conversationsCreated.toLocaleString()}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Logins</StatLabel>
                <StatValue>{stats.logins.toLocaleString()}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Profile Updates</StatLabel>
                <StatValue>{stats.profileUpdates.toLocaleString()}</StatValue>
              </StatCard>
            </StatsGrid>

            <Section>
              <SectionTitle>Top Active Users</SectionTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>User</TableHeaderCell>
                    <TableHeaderCell>Total Activities</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {stats.topActiveUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell>{user.activityCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </Section>
          </>
        )}

        <Section>
          <SectionTitle>User Activity Reports</SectionTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Total Activities</TableHeaderCell>
                <TableHeaderCell>Messages Sent</TableHeaderCell>
                <TableHeaderCell>Messages Received</TableHeaderCell>
                <TableHeaderCell>Avg Messages/Day</TableHeaderCell>
                <TableHeaderCell>Last Activity</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {userReports.map((report) => (
                <TableRow key={report.userId}>
                  <TableCell>{report.userName}</TableCell>
                  <TableCell>{report.email}</TableCell>
                  <TableCell>{report.totalActivities.toLocaleString()}</TableCell>
                  <TableCell>{report.messagesSent.toLocaleString()}</TableCell>
                  <TableCell>{report.messagesReceived.toLocaleString()}</TableCell>
                  <TableCell>{report.averageMessagesPerDay.toFixed(2)}</TableCell>
                  <TableCell>
                    {report.lastActivityAt
                      ? new Date(report.lastActivityAt).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </Section>
      </AnalyticsContent>
    </AnalyticsContainer>
  );
};

export default Analytics;

