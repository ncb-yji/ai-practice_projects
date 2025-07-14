import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';

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

const History = () => {
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
                    draw_date: '' // API에서 제공되지 않으므로 빈 문자열
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

  // 통계 계산 - 구매 횟수는 번호 조합의 개수로 계산
  const getStatistics = () => {
    let totalNumbers = 0; // 총 번호 조합 개수 (= 구매 횟수)
    let totalPurchases = savedAnalyses.length; // 총 구매 건수 (용지 개수)
    
    const totalAmount = savedAnalyses.reduce((sum, analysis) => {
      const amount = analysis.analysis_result.amount[0] || '₩0';
      const numericAmount = parseInt(amount.replace(/[₩,]/g, '')) || 0;
      totalNumbers += analysis.analysis_result.lotto_numbers.length;
      return sum + numericAmount;
    }, 0);
    
    let winningCount = 0;
    savedAnalyses.forEach(analysis => {
      const drawNumber = analysis.analysis_result.draw_number;
      if (drawNumber && winningNumbersCache.has(drawNumber)) {
        const winning = winningNumbersCache.get(drawNumber)!;
        analysis.analysis_result.lotto_numbers.forEach(numbers => {
          const result = checkWinning(numbers, winning.numbers, winning.bonus);
          if (result.rank > 0) winningCount++;
        });
      }
    });

    return { 
      totalPurchases, // 용지 개수
      totalNumbers,   // 번호 조합 개수 (= 구매 횟수)
      totalAmount, 
      winningCount 
    };
  };

  // 테이블용 데이터 변환
  const getTableData = () => {
    const tableData: Array<{
      id: string;
      drawNumber: number | null;
      purchaseDate: string;
      numbers: number[];
      result: string;
      prize: string;
      resultColor: 'default' | 'error' | 'success';
    }> = [];

    savedAnalyses.forEach(analysis => {
      const drawNumber = analysis.analysis_result.draw_number || null;
      const purchaseDate = new Date(analysis.timestamp).toLocaleDateString('ko-KR');
      
      analysis.analysis_result.lotto_numbers.forEach((numbers, idx) => {
        let winResult = null;
        let resultColor: 'default' | 'error' | 'success' = 'default';
        
        if (drawNumber && winningNumbersCache.has(drawNumber)) {
          const winning = winningNumbersCache.get(drawNumber)!;
          winResult = checkWinning(numbers, winning.numbers, winning.bonus);
          
          // 추첨일이 지났는지 확인 (현재는 당첨 번호가 있으면 추첨 완료로 간주)
          const isDrawn = true; // 당첨 번호 API에서 데이터를 받았다면 추첨 완료
          
          if (isDrawn) {
            resultColor = winResult.rank > 0 ? 'success' : 'error';
          }
        }
        
        tableData.push({
          id: `${analysis.id}-${idx}`,
          drawNumber,
          purchaseDate,
          numbers,
          result: !drawNumber ? '회차 정보 없음' : 
                  !winningNumbersCache.has(drawNumber) ? '미추첨' : 
                  (winResult ? winResult.prize : '미당첨'),
          prize: winResult && winResult.rank > 0 ? getPrizeAmount(winResult.rank) : '-',
          resultColor
        });
      });
    });

    return tableData.sort((a, b) => (b.drawNumber || 0) - (a.drawNumber || 0));
  };

  // 등수별 당첨금 (예시)
  const getPrizeAmount = (rank: number) => {
    switch (rank) {
      case 1: return '20억원';
      case 2: return '6천만원';
      case 3: return '150만원';
      case 4: return '5만원';
      case 5: return '5천원';
      default: return '-';
    }
  };

  const stats = getStatistics();
  const tableData = getTableData();

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
        <Box sx={{ mt: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>이력 불러오는 중...</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <>
              {/* 통계 카드 */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {stats.totalNumbers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 구매 횟수
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {stats.totalPurchases}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 구매 건수
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        ₩{stats.totalAmount.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 구매 금액
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {stats.winningCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        당첨 횟수
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {tableData.length === 0 ? (
                <Alert severity="info">
                  저장된 구매 이력이 없습니다. 로또 용지를 분석하고 저장해보세요!
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                          회차
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                          구매일
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 280 }}>
                          번호
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                          결과
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                          당첨금
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell align="center">
                            {row.drawNumber ? `${row.drawNumber}회` : '-'}
                          </TableCell>
                          <TableCell align="center">
                            {row.purchaseDate}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {row.numbers.map((num) => {
                                // 당첨된 번호인지 확인
                                let isWinningNumber = false;
                                if (row.drawNumber && winningNumbersCache.has(row.drawNumber)) {
                                  const winning = winningNumbersCache.get(row.drawNumber)!;
                                  isWinningNumber = winning.numbers.includes(num) || winning.bonus === num;
                                }
                                
                                return (
                                  <Chip
                                    key={num}
                                    label={num}
                                    size="small"
                                    sx={{
                                      backgroundColor: isWinningNumber ? '#1E90FF' : '#A9A9A9', // 당첨: 파란색, 미당첨: 회색
                                      color: 'white',
                                      fontWeight: 'bold',
                                      minWidth: 32,
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row.result}
                              color={row.resultColor}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {row.prize}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>
      </Container>
    </>
  );
};

export default History; 