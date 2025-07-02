import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';

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

const AnalysisList = () => {
  const navigate = useNavigate();
  const [analysisList, setAnalysisList] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [selectedAnalysisDetail, setSelectedAnalysisDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedAnalyses();
  }, []);

  const fetchSavedAnalyses = async () => {
    try {
      const response = await fetch(getApiUrl('/api/saved-analyses'));
      if (response.ok) {
        const data = await response.json();
        setAnalysisList(data.analyses);
      } else {
        setError('저장된 분석 결과를 불러올 수 없습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (analysis: SavedAnalysis) => {
    try {
      const response = await fetch(getApiUrl(`/api/saved-analyses/${analysis.id}`));
      if (response.ok) {
        const data = await response.json();
        setSelectedAnalysisDetail(data.analysis);
        setSelectedAnalysis(analysis);
      } else {
        setError('상세 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
    }
  };

  const handleCloseDialog = () => {
    setSelectedAnalysis(null);
    setSelectedAnalysisDetail(null);
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
            저장된 분석 목록
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {!loading && !error && analysisList.length === 0 && (
            <Alert severity="info">
              저장된 분석 결과가 없습니다.
            </Alert>
          )}
          
          {!loading && !error && analysisList.length > 0 && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: 3
            }}>
              {analysisList.map((analysis) => (
                <Card key={analysis.id}>
                  <CardActionArea onClick={() => handleCardClick(analysis)}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {analysis.analysis_result.draw_number ? `제 ${analysis.analysis_result.draw_number}회` : '회차 정보 없음'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {new Date(analysis.timestamp).toLocaleDateString('ko-KR')}
                      </Typography>
                      
                      {analysis.analysis_result.lotto_numbers.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>로또 번호:</Typography>
                          {analysis.analysis_result.lotto_numbers.map((numbers, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                              {numbers.map((num: number) => (
                                <Chip
                                  key={num}
                                  label={num}
                                  size="small"
                                  sx={{
                                    backgroundColor: num <= 10 ? '#FFD700' :
                                      num <= 20 ? '#1E90FF' :
                                      num <= 30 ? '#FF6B6B' :
                                      num <= 40 ? '#A9A9A9' : '#32CD32',
                                    color: num <= 30 ? 'white' : 'black',
                                    fontSize: '0.7rem',
                                    height: '20px'
                                  }}
                                />
                              ))}
                            </Box>
                          ))}
                        </Box>
                      )}
                      
                      {analysis.analysis_result.amount.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          금액: {analysis.analysis_result.amount.join(', ')}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Container>

      <Dialog
        open={!!selectedAnalysis}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedAnalysis && selectedAnalysisDetail && (
          <>
            <DialogTitle>
              분석 결과 - {selectedAnalysis.analysis_result.draw_number ? `제 ${selectedAnalysis.analysis_result.draw_number}회` : '회차 정보 없음'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                {selectedAnalysisDetail.original_image && (
                  <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="subtitle2" gutterBottom>원본 이미지</Typography>
                    <img
                      src={`data:image/jpeg;base64,${selectedAnalysisDetail.original_image}`}
                      alt="Original Analysis"
                      style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd' }}
                    />
                  </Box>
                )}
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>분석 정보</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                    {selectedAnalysis.analysis_result.draw_number && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">회차</Typography>
                        <Typography variant="body1">{selectedAnalysis.analysis_result.draw_number}회</Typography>
                      </Box>
                    )}
                    {selectedAnalysis.analysis_result.issue_date && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">발행일</Typography>
                        <Typography variant="body1">{selectedAnalysis.analysis_result.issue_date}</Typography>
                      </Box>
                    )}
                    {selectedAnalysis.analysis_result.draw_date && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">추첨일</Typography>
                        <Typography variant="body1">{selectedAnalysis.analysis_result.draw_date}</Typography>
                      </Box>
                    )}
                    {selectedAnalysis.analysis_result.payment_deadline && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">지급기한</Typography>
                        <Typography variant="body1">{selectedAnalysis.analysis_result.payment_deadline}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                {selectedAnalysis.analysis_result.lotto_numbers.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>로또 번호</Typography>
                    {selectedAnalysis.analysis_result.lotto_numbers.map((numbers, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          조합 {idx + 1}:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {numbers.map((num: number) => (
                            <Chip
                              key={num}
                              label={num}
                              sx={{
                                backgroundColor: num <= 10 ? '#FFD700' :
                                  num <= 20 ? '#1E90FF' :
                                  num <= 30 ? '#FF6B6B' :
                                  num <= 40 ? '#A9A9A9' : '#32CD32',
                                color: num <= 30 ? 'white' : 'black',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {selectedAnalysis.analysis_result.amount.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>금액</Typography>
                    <Typography variant="body1">{selectedAnalysis.analysis_result.amount.join(', ')}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default AnalysisList; 