import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Statistics = () => {
  const [value, setValue] = useState(0);
  const navigate = useNavigate();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 임시 데이터
  const numberFrequencyData = {
    labels: Array.from({ length: 45 }, (_, i) => i + 1),
    datasets: [
      {
        label: '구매 빈도',
        data: Array.from({ length: 45 }, () => Math.floor(Math.random() * 10)),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const monthlyData = {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    datasets: [
      {
        label: '구매 횟수',
        data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // 임시 당첨 통계 데이터
  const prizeStats = [
    { rank: '1등', count: 0, percentage: '0%' },
    { rank: '2등', count: 0, percentage: '0%' },
    { rank: '3등', count: 1, percentage: '5%' },
    { rank: '4등', count: 3, percentage: '15%' },
    { rank: '5등', count: 6, percentage: '30%' },
    { rank: '미당첨', count: 10, percentage: '50%' },
  ];

  // 임시 수익 데이터
  const profitData = {
    totalSpent: 200000, // 총 구매 금액
    totalWon: 150000,   // 총 당첨 금액
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            번호 통계
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 2 }}>
          <Paper elevation={3}>
            <Tabs
              value={value}
              onChange={handleChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="구입 번호 관리" />
              <Tab label="나의 구매 경향" />
              <Tab label="나의 당첨률" />
            </Tabs>

            {/* 구입 번호 관리 탭 */}
            {value === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  구입 번호 관리
                </Typography>
                {/* TODO: 구입 번호 관리 기능 추가 */}
              </Box>
            )}

            {/* 나의 구매 경향 탭 */}
            {value === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  내가 자주 구매하는 번호
                </Typography>
                <Box sx={{ height: 400, display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ width: '100%', maxWidth: 800 }}>
                    <Bar data={numberFrequencyData} options={chartOptions} />
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                  나의 구매 패턴 분석
                </Typography>
                <Box sx={{ height: 400, display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ width: '100%', maxWidth: 800 }}>
                    <Bar data={monthlyData} options={chartOptions} />
                  </Box>
                </Box>
              </Box>
            )}

            {/* 나의 당첨률 탭 */}
            {value === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  당첨 등수별 비율
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 4 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>등수</TableCell>
                        <TableCell align="center">횟수</TableCell>
                        <TableCell align="center">비율</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prizeStats.map((stat) => (
                        <TableRow key={stat.rank}>
                          <TableCell>{stat.rank}</TableCell>
                          <TableCell align="center">{stat.count}회</TableCell>
                          <TableCell align="center">{stat.percentage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="h6" gutterBottom>
                  수익 현황
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>총 구매 금액</TableCell>
                        <TableCell align="right">
                          {profitData.totalSpent.toLocaleString()}원
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>총 당첨 금액</TableCell>
                        <TableCell align="right">
                          {profitData.totalWon.toLocaleString()}원
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Typography variant="subtitle1" fontWeight="bold">
                            순손익
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            color={profitData.totalWon - profitData.totalSpent >= 0 ? 'success.main' : 'error.main'}
                          >
                            {(profitData.totalWon - profitData.totalSpent).toLocaleString()}원
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Statistics; 