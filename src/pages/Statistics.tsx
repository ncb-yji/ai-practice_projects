import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
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
import { getApiUrl } from '../config/api';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SavedAnalysis {
  id: string;
  timestamp: string;
  analysis_result: {
    draw_number?: number;
    issue_date?: string;
    draw_date?: string;
    payment_deadline?: string;
    lotto_numbers: number[][];
    amount: string[];
  };
}

interface WinningNumbers {
  draw_no: number;
  numbers: number[];
  bonus: number;
  draw_date: string;
}

interface LottoApiResponse {
  success: boolean;
  draw_no: number;
  numbers: number[];
  bonus: number;
  message?: string;
}

const Statistics = () => {
  const [value, setValue] = useState(0);
  const navigate = useNavigate();
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [winningNumbersCache, setWinningNumbersCache] = useState<Map<number, WinningNumbers>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 저장된 분석 결과 가져오기
      const analysesResponse = await fetch(getApiUrl('/api/saved-analyses'));
      if (analysesResponse.ok) {
        const analysesData = await analysesResponse.json();
        const analyses = analysesData.analyses || [];
        setSavedAnalyses(analyses);

        // 각 분석 결과의 회차별 당첨 번호 조회
        const uniqueDrawNumbers = new Set<number>();
        analyses.forEach((analysis: SavedAnalysis) => {
          if (analysis.analysis_result.draw_number) {
            uniqueDrawNumbers.add(analysis.analysis_result.draw_number);
          }
        });

        // 각 회차별 당첨 번호 조회
        const winningCache = new Map<number, WinningNumbers>();
        await Promise.all(
          Array.from(uniqueDrawNumbers).map(async (drawNo) => {
            try {
              const lottoResponse = await fetch(getApiUrl(`/api/lotto/${drawNo}`));
              if (lottoResponse.ok) {
                const lottoData: LottoApiResponse = await lottoResponse.json();
                if (lottoData.success) {
                  winningCache.set(drawNo, {
                    draw_no: lottoData.draw_no,
                    numbers: lottoData.numbers,
                    bonus: lottoData.bonus,
                    draw_date: ''
                  });
                }
              }
            } catch (err) {
              console.log(`${drawNo}회차 당첨 번호 조회 실패:`, err);
            }
          })
        );

        setWinningNumbersCache(winningCache);
      }

    } catch (e: any) {
      setError(e.message || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 당첨 확인 함수
  const checkWinning = (userNumbers: number[], winningNumbers: number[], bonus: number) => {
    const matches = userNumbers.filter(num => winningNumbers.includes(num)).length;
    const bonusMatch = userNumbers.includes(bonus);
    
    if (matches === 6) return { rank: 1, prize: '1등' };
    if (matches === 5 && bonusMatch) return { rank: 2, prize: '2등' };
    if (matches === 5) return { rank: 3, prize: '3등' };
    if (matches === 4) return { rank: 4, prize: '4등' };
    if (matches === 3) return { rank: 5, prize: '5등' };
    return { rank: 0, prize: '미당첨' };
  };

  // 번호별 구매 빈도 계산
  const getNumberFrequencyData = () => {
    const frequency = new Array(46).fill(0); // 1~45번 + 인덱스 0은 사용하지 않음
    
    savedAnalyses.forEach(analysis => {
      analysis.analysis_result.lotto_numbers.forEach(numbers => {
        numbers.forEach(num => {
          if (num >= 1 && num <= 45) {
            frequency[num]++;
          }
        });
      });
    });

    return {
      labels: Array.from({ length: 45 }, (_, i) => i + 1),
      datasets: [
        {
          label: '구매 빈도',
          data: frequency.slice(1), // 인덱스 0 제외
          backgroundColor: Array.from({ length: 45 }, (_, i) => {
            const num = i + 1;
            if (num <= 10) return 'rgba(255, 215, 0, 0.7)'; // 노란색
            if (num <= 20) return 'rgba(30, 144, 255, 0.7)'; // 파란색
            if (num <= 30) return 'rgba(255, 107, 107, 0.7)'; // 빨간색
            if (num <= 40) return 'rgba(169, 169, 169, 0.7)'; // 회색
            return 'rgba(50, 205, 50, 0.7)'; // 녹색
          }),
          borderColor: Array.from({ length: 45 }, (_, i) => {
            const num = i + 1;
            if (num <= 10) return 'rgba(255, 215, 0, 1)';
            if (num <= 20) return 'rgba(30, 144, 255, 1)';
            if (num <= 30) return 'rgba(255, 107, 107, 1)';
            if (num <= 40) return 'rgba(169, 169, 169, 1)';
            return 'rgba(50, 205, 50, 1)';
          }),
          borderWidth: 1,
        },
      ],
    };
  };

  // 월별 구매 패턴 계산
  const getMonthlyData = () => {
    const monthlyCountMap = new Map<string, number>(); // 'YYYY-MM' 형태의 키로 저장
    
    savedAnalyses.forEach(analysis => {
      // 구매일(issue_date)을 우선 사용하고, 없으면 저장일(timestamp) 사용
      const dateString = analysis.analysis_result.issue_date || analysis.timestamp;
      const date = new Date(dateString);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return;
      }
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1~12
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyCountMap.has(key)) {
        monthlyCountMap.set(key, 0);
      }
      monthlyCountMap.set(key, monthlyCountMap.get(key)! + analysis.analysis_result.lotto_numbers.length);
    });

    // 데이터가 있는 월만 정렬하여 표시
    const sortedEntries = Array.from(monthlyCountMap.entries())
      .sort(([a], [b]) => a.localeCompare(b)); // 시간순 정렬

    const labels = sortedEntries.map(([key]) => {
      const [year, month] = key.split('-');
      return `${year}년 ${parseInt(month)}월`;
    });

    const data = sortedEntries.map(([, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: '구매 횟수',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // 당첨 통계 계산
  const getPrizeStats = () => {
    const stats = {
      '1등': 0,
      '2등': 0,
      '3등': 0,
      '4등': 0,
      '5등': 0,
      '미당첨': 0
    };

    let totalNumbers = 0;

    savedAnalyses.forEach(analysis => {
      const drawNumber = analysis.analysis_result.draw_number;
      if (drawNumber && winningNumbersCache.has(drawNumber)) {
        const winning = winningNumbersCache.get(drawNumber)!;
        analysis.analysis_result.lotto_numbers.forEach(numbers => {
          totalNumbers++;
          const result = checkWinning(numbers, winning.numbers, winning.bonus);
          stats[result.prize as keyof typeof stats]++;
        });
      } else {
        // 당첨 번호 정보가 없는 경우 미추첨으로 처리하지 않고 제외
        analysis.analysis_result.lotto_numbers.forEach(() => {
          totalNumbers++;
          stats['미당첨']++; // 임시로 미당첨으로 처리
        });
      }
    });

    return Object.entries(stats).map(([rank, count]) => ({
      rank,
      count,
      percentage: totalNumbers > 0 ? `${((count / totalNumbers) * 100).toFixed(1)}%` : '0%'
    }));
  };

  // 수익 현황 계산
  const getProfitData = () => {
    let totalSpent = 0;
    let totalWon = 0;

    savedAnalyses.forEach(analysis => {
      // 구매 금액 계산
      const amount = analysis.analysis_result.amount[0] || '₩0';
      const numericAmount = parseInt(amount.replace(/[₩,]/g, '')) || 0;
      totalSpent += numericAmount;

      // 당첨 금액 계산
      const drawNumber = analysis.analysis_result.draw_number;
      if (drawNumber && winningNumbersCache.has(drawNumber)) {
        const winning = winningNumbersCache.get(drawNumber)!;
        analysis.analysis_result.lotto_numbers.forEach(numbers => {
          const result = checkWinning(numbers, winning.numbers, winning.bonus);
          if (result.rank > 0) {
            // 실제 당첨금은 회차별로 다르므로 예시 금액 사용
            const prizeAmounts = {
              1: 2000000000, // 20억
              2: 60000000,   // 6천만
              3: 1500000,    // 150만
              4: 50000,      // 5만
              5: 5000        // 5천
            };
            totalWon += prizeAmounts[result.rank as keyof typeof prizeAmounts] || 0;
          }
        });
      }
    });

    return { totalSpent, totalWon };
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

  const numberFrequencyData = getNumberFrequencyData();
  const monthlyData = getMonthlyData();
  const prizeStats = getPrizeStats();
  const profitData = getProfitData();

  if (loading) {
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
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>통계 데이터 로딩 중...</Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (error) {
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
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        </Container>
      </>
    );
  }

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
          {savedAnalyses.length === 0 ? (
            <Alert severity="info">
              저장된 구매 이력이 없습니다. 로또 용지를 분석하고 저장해보세요!
            </Alert>
          ) : (
            <Paper elevation={3}>
              <Tabs
                value={value}
                onChange={handleChange}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="나의 구매 경향" />
                <Tab label="나의 당첨률" />
              </Tabs>

              {/* 나의 구매 경향 탭 */}
              {value === 0 && (
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
                    월별 구매 패턴
                  </Typography>
                  <Box sx={{ height: 400, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: 800 }}>
                      <Bar data={monthlyData} options={chartOptions} />
                    </Box>
                  </Box>
                </Box>
              )}

              {/* 나의 당첨률 탭 */}
              {value === 1 && (
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
                            <TableCell>
                              <Typography 
                                color={stat.rank === '미당첨' ? 'error' : stat.rank.includes('등') ? 'success.main' : 'inherit'}
                                fontWeight={stat.rank !== '미당첨' && stat.count > 0 ? 'bold' : 'normal'}
                              >
                                {stat.rank}
                              </Typography>
                            </TableCell>
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
          )}
        </Box>
      </Container>
    </>
  );
};

export default Statistics; 