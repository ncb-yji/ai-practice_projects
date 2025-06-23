import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  AppBar,
  Toolbar,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface LottoResult {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  firstWinamnt: number;
  firstPrzwnerCo: number;
  returnValue: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [lottoResult, setLottoResult] = useState<LottoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestLottoResult();
  }, []);

  const fetchLatestLottoResult = async () => {
    try {
      setLoading(true);
      setError(null);

      // 로컬 백엔드 API 호출
      const response = await fetch('http://localhost:8000/api/latest-lotto');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: LottoResult = await response.json();
      setLottoResult(data);
      
    } catch (err) {
      console.error('로또 정보 가져오기 실패:', err);
      setError('로또 정보를 가져오는데 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const getNumberColor = (num: number) => {
    if (num <= 10) return '#FFD700';
    if (num <= 20) return '#1E90FF';
    if (num <= 30) return '#FF6B6B';
    if (num <= 40) return '#A9A9A9';
    return '#32CD32';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div">
            로또 분석 서비스
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          {/* 최신 로또 결과 표시 */}
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom align="center">
              최신 로또 결과
            </Typography>
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Typography color="error" align="center" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            {lottoResult && !loading && !error && (
              <Box>
                <Typography variant="h6" gutterBottom align="center">
                  {lottoResult.drwNo}회 ({lottoResult.drwNoDate})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  {[lottoResult.drwtNo1, lottoResult.drwtNo2, lottoResult.drwtNo3, 
                    lottoResult.drwtNo4, lottoResult.drwtNo5, lottoResult.drwtNo6].map((num) => (
                    <Chip
                      key={num}
                      label={num}
                      sx={{
                        backgroundColor: getNumberColor(num),
                        color: num <= 30 ? 'white' : 'black',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        width: 50,
                        height: 50,
                      }}
                    />
                  ))}
                  <Typography variant="h5" sx={{ mx: 1, fontWeight: 'bold' }}>+</Typography>
                  <Chip
                    label={lottoResult.bnusNo}
                    sx={{
                      backgroundColor: '#8e24aa',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      width: 50,
                      height: 50,
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      1등 당첨금
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(lottoResult.firstWinamnt)}원
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      1등 당첨자
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {lottoResult.firstPrzwnerCo}명
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>

          {/* 메인 버튼들 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CameraAltIcon />}
              onClick={() => navigate('/capture')}
              sx={{ py: 2 }}
            >
              번호 분석
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/history')}
              sx={{ py: 2 }}
            >
              당첨 및 구매 이력
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/statistics')}
              sx={{ py: 2 }}
            >
              통계 확인
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default Home; 