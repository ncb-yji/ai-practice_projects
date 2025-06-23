import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, API_CONFIG } from '../config/api';
import ImageCropSelector from '../components/ImageCropSelector';

interface LottoNumber {
  numbers: number[];
  confidence: number;
  source_text: string;
}

interface AnalysisResult {
  success: boolean;
  extracted_text: string[];
  lotto_numbers: LottoNumber[];
  total_texts_found: number;
  lotto_combinations_found: number;
}

interface OCRStatus {
  ocr_available: boolean;
  message: string;
}

const Capture = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [showCropSelector, setShowCropSelector] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OCRStatus | null>(null);
  const [isCheckingOcr, setIsCheckingOcr] = useState(true);
  const navigate = useNavigate();

  // OCR 상태 확인
  useEffect(() => {
    const checkOcrStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/ocr-status');
        if (response.ok) {
          const status = await response.json();
          setOcrStatus(status);
        } else {
          setOcrStatus({ ocr_available: false, message: 'OCR 상태를 확인할 수 없습니다.' });
        }
      } catch (error) {
        setOcrStatus({ ocr_available: false, message: '서버 연결에 실패했습니다.' });
      } finally {
        setIsCheckingOcr(false);
      }
    };

    checkOcrStatus();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCroppedImageBlob(null);
      setAnalysisResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setShowCropSelector(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (blob: Blob, analysisResult: any) => {
    setCroppedImageBlob(blob);
    setShowCropSelector(false);
    setAnalysisResult(analysisResult);
    
    // 크롭된 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(blob);
  };

  const handleCropCancel = () => {
    setShowCropSelector(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCroppedImageBlob(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!croppedImageBlob) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    // Blob을 File 객체로 변환
    const croppedFile = new File([croppedImageBlob], 'cropped_image.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', croppedFile);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
        console.log('Analysis result:', data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '이미지 분석에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isCheckingOcr) {
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
              번호 분석
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md">
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              OCR 상태 확인 중...
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  // 크롭 선택기 화면
  if (showCropSelector && previewUrl) {
    return (
      <>
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back"
              onClick={handleCropCancel}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div">
              분석 영역 선택
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg">
          <Box sx={{ mt: 4 }}>
            <ImageCropSelector
              imageUrl={previewUrl}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              originalFile={selectedFile!}
            />
          </Box>
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
            번호 분석
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            {/* OCR 상태 알림 */}
            {ocrStatus && !ocrStatus.ocr_available && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {ocrStatus.message}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  OCR 기능을 사용하려면 서버에 EasyOCR을 설치해야 합니다.
                </Typography>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  로또 용지 이미지 업로드
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  로또 용지의 사진을 업로드하면 분석할 영역을 선택할 수 있습니다.
                </Typography>
                
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="raised-button-file"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="raised-button-file">
                  <Button 
                    variant="contained" 
                    component="span"
                    disabled={!ocrStatus?.ocr_available}
                  >
                    이미지 선택
                  </Button>
                </label>
              </Box>

              {previewUrl && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {analysisResult ? '보정된 이미지:' : '선택된 영역 미리보기:'}
                  </Typography>
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Preview"
                    sx={{
                      width: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                      border: '2px solid #e0e0e0',
                      borderRadius: 1,
                    }}
                  />
                  {!analysisResult && (
                    <Button
                      variant="outlined"
                      onClick={() => setShowCropSelector(true)}
                      sx={{ mt: 1 }}
                    >
                      영역 다시 선택
                    </Button>
                  )}
                </Box>
              )}

              {!analysisResult && (
                <Box sx={{ mb: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!croppedImageBlob || isAnalyzing || !ocrStatus?.ocr_available}
                    fullWidth
                    size="large"
                  >
                    {isAnalyzing ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        OCR 분석 중...
                      </>
                    ) : (
                      '번호 추출하기'
                    )}
                  </Button>
                </Box>
              )}

              {analysisResult && (
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setAnalysisResult(null);
                      setCroppedImageBlob(null);
                      setShowCropSelector(true);
                    }}
                    sx={{ mb: 2 }}
                  >
                    새로 분석하기
                  </Button>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {analysisResult && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    분석 결과
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      발견된 텍스트: {analysisResult.total_texts_found}개
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      로또 조합: {analysisResult.lotto_combinations_found}개
                    </Typography>
                  </Box>

                  {analysisResult.lotto_numbers.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        추출된 로또 번호:
                      </Typography>
                      {analysisResult.lotto_numbers.map((lotto, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <Box sx={{ mb: 1 }}>
                            {lotto.numbers.map((number, numIndex) => (
                              <Chip
                                key={numIndex}
                                label={number}
                                color="primary"
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            신뢰도: {(lotto.confidence * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            원본 텍스트: {lotto.source_text}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="warning">
                      이미지에서 로또 번호를 찾을 수 없습니다.
                    </Alert>
                  )}

                  {analysisResult.extracted_text.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        추출된 모든 텍스트:
                      </Typography>
                      <List dense>
                        {analysisResult.extracted_text.map((text, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={text} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/analysis-list')}
                >
                  저장 목록
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => navigate('/analysis-result')}
                >
                  분석 결과
                </Button>
              </Stack>
            </form>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Capture; 