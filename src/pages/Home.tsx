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
import { getApiUrl } from '../config/api';

interface LottoData {
  draw_no: number;
  draw_date: string;
  numbers: number[];
  bonus: number;
  first_win_amount: number;
  first_prize_winners: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: LottoData | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [lottoData, setLottoData] = useState<LottoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestLottoResult();
  }, []);

  const fetchLatestLottoResult = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = getApiUrl('/api/latest-lotto');
      console.log('🔗 API 요청 URL:', apiUrl);
      console.log('🚀 API 요청 시작...');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 응답 상태:', response.status, response.statusText);
      console.log('📋 응답 헤더:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      
      const result: ApiResponse = await response.json();
      console.log('✅ API 응답 성공:', result);

      if (result.success && result.data) {
        setLottoData(result.data);
        console.log('✅ 로또 데이터 설정 완료:', result.data);
      } else {
        throw new Error(result.message || '데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (err: any) {
      console.error('❌ 로또 정보 가져오기 실패:', err);
      console.error('❌ 오류 타입:', err.constructor.name);
      console.error('❌ 오류 메시지:', err.message);
      console.error('❌ 스택 트레이스:', err.stack);
      
      let errorMessage = '로또 정보를 가져오는데 실패했습니다.';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = '네트워크 연결 오류: 백엔드 서버(8000포트)에 연결할 수 없습니다.';
      } else if (err.message.includes('HTTP error')) {
        errorMessage = `서버 오류: ${err.message}`;
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
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

            {lottoData && !loading && !error && (
              <Box>
                <Typography variant="h6" gutterBottom align="center">
                  {lottoData.draw_no}회 ({lottoData.draw_date})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  {lottoData.numbers.map((num) => (
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
                    label={lottoData.bonus}
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
                      {formatCurrency(lottoData.first_win_amount)}원
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      1등 당첨자
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {lottoData.first_prize_winners}명
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