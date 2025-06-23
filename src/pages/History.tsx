import React from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

// 요일 구하는 함수
const getDayOfWeek = (dateString: string) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(dateString);
  return days[date.getDay()];
};

// 번호별 배경색 결정 함수
const getNumberColor = (num: number) => {
  if (num <= 10) return '#FFD700'; // 노란색
  if (num <= 20) return '#1E90FF'; // 파란색
  if (num <= 30) return '#FF6B6B'; // 붉은색
  if (num <= 40) return '#A9A9A9'; // 회색
  return '#32CD32'; // 녹색
};

// 임시 데이터
const mockData = [
  {
    id: 1,
    round: 1000,
    purchaseDate: '2024-03-16',
    type: '자동',
    numbers: [1, 2, 3, 4, 5, 6],
    result: '미추첨',
    prize: 0,
  },
  {
    id: 2,
    round: 999,
    purchaseDate: '2024-03-09',
    type: '수동',
    numbers: [7, 14, 21, 28, 35, 42],
    result: '3등',
    prize: 1500000,
  },
  {
    id: 3,
    round: 998,
    purchaseDate: '2024-03-02',
    type: '자동',
    numbers: [3, 8, 15, 22, 29, 36],
    result: '5등',
    prize: 5000,
  },
  {
    id: 4,
    round: 997,
    purchaseDate: '2024-02-24',
    type: '수동',
    numbers: [2, 9, 16, 23, 30, 37],
    result: '미당첨',
    prize: 0,
  },
  {
    id: 5,
    round: 996,
    purchaseDate: '2024-02-17',
    type: '자동',
    numbers: [4, 11, 18, 25, 32, 39],
    result: '4등',
    prize: 50000,
  },
  {
    id: 6,
    round: 995,
    purchaseDate: '2024-02-10',
    type: '수동',
    numbers: [5, 12, 19, 26, 33, 40],
    result: '미당첨',
    prize: 0,
  },
  {
    id: 7,
    round: 994,
    purchaseDate: '2024-02-03',
    type: '자동',
    numbers: [6, 13, 20, 27, 34, 41],
    result: '5등',
    prize: 5000,
  },
  {
    id: 8,
    round: 993,
    purchaseDate: '2024-01-27',
    type: '수동',
    numbers: [8, 15, 22, 29, 36, 43],
    result: '미당첨',
    prize: 0,
  },
  {
    id: 9,
    round: 992,
    purchaseDate: '2024-01-20',
    type: '자동',
    numbers: [9, 16, 23, 30, 37, 44],
    result: '4등',
    prize: 50000,
  },
  {
    id: 10,
    round: 991,
    purchaseDate: '2024-01-13',
    type: '수동',
    numbers: [10, 17, 24, 31, 38, 45],
    result: '미당첨',
    prize: 0,
  },
].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

const History = () => {
  const navigate = useNavigate();

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
            당첨 및 구매 이력
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '10%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  회차
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '15%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  구매일
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '10%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  구분
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '35%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  번호
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '15%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  결과
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    width: '15%',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  당첨금
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell align="center">{row.round}회</TableCell>
                  <TableCell align="center">
                    {row.purchaseDate} ({getDayOfWeek(row.purchaseDate)})
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.type}
                      color={row.type === '자동' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {row.numbers.map((num) => (
                      <Chip
                        key={num}
                        label={num}
                        size="small"
                        sx={{
                          m: 0.5,
                          backgroundColor: getNumberColor(num),
                          color: num <= 30 ? 'white' : 'black',
                          fontWeight: 'bold',
                        }}
                      />
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      sx={{
                        color: row.result === '미추첨' 
                          ? 'black' 
                          : row.result === '미당첨' 
                            ? '#FF0000' 
                            : '#2E7D32',
                        fontWeight: row.result === '미추첨' ? 'normal' : 'bold',
                      }}
                    >
                      {row.result}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      sx={{
                        color: row.prize > 0 ? '#2E7D32' : 'black',
                        fontWeight: row.prize > 0 ? 'bold' : 'normal',
                      }}
                    >
                      {row.result === '미추첨' ? '-' : `${row.prize.toLocaleString()}원`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
};

export default History; 