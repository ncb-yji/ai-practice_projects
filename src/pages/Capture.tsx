import React, { useState, useEffect, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import FolderIcon from '@mui/icons-material/Folder';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate } from 'react-router-dom';
import ImageCropSelector from '../components/ImageCropSelector';
import { getApiUrl } from '../config/api';

interface AnalysisResult {
  success: boolean;
  transformed_image?: string;  // 디버깅용: 기울기 보정만 된 원본 이미지
  corrected_image?: string;    // OCR 전처리된 이미지
  ocr_results?: string[];
  extracted_combinations?: number[][];  // 로또 번호 조합들
  extracted_amounts?: string[];
  draw_number?: number;  // 회차
  issue_date?: string;   // 발행일
  draw_date?: string;    // 추첨일
  payment_deadline?: string;  // 지급기한
  region_results?: {      // 3개 영역별 추출 결과 (최적화됨)
    title?: string;       // ① 상단 타이틀 (최종 추출)
    dates?: string;       // ② 날짜 정보 (최종 추출)
    unique_numbers?: string; // ③ 고유번호 영역
    lotto_combinations?: number[][]; // ④ 번호 조합 (A~E)
    amount?: string;      // ⑤ 금액 표시
    barcode_numbers?: string; // ⑥ 바코드 아래 숫자
    
    // 통합 OCR 영역들 (최적화됨)
    draw_issue_combined_text?: string; // 회차발행일 통합 OCR 원본
    number_area_text?: string; // 번호영역 OCR 원본
    
    // 후처리 결과들
    number_area_filtered_text?: string; // 번호영역 후처리 결과
    title_filtered_text?: string; // 회차 후처리 결과
    issue_date_filtered_text?: string; // 발행일 후처리 결과
    
    // 기타
    count_detection_text?: string; // 개수 판단 영역 OCR 원본
    
    // 구버전 호환성 (deprecated)
    issue_date_text?: string; 
    draw_date_text?: string; 
    payment_deadline_text?: string; 
    title_text?: string; 
    draw_date_filtered_text?: string; 
    payment_deadline_filtered_text?: string; 
  };
  amount_verification?: {   // 금액 검증 결과
    lotto_count: number;
    expected_amount: string;
    ocr_raw: string;
    ocr_normalized: string | null;
    final_amount: string;
    confidence: 'high' | 'medium' | 'low';
    verification_status: string;
  };
  validation_result?: {  // OCR 검증 결과 (새로 추가)
    draw_number_valid: boolean;
    issue_date_valid: boolean;
    corrected_draw_number?: number;
    corrected_issue_date?: string;
    validation_messages: string[];
  };
  message?: string;
  detail?: string; // 백엔드 HTTPException detail 필드
}

interface OCRStatus {
  ocr_available: boolean;
  message: string;
}

interface SavedAnalysis {
  id: string;
  timestamp: string;
  original_image?: string;
  analysis_result: {
    draw_number?: number;
    issue_date?: string;
    draw_date?: string;
    payment_deadline?: string;
    lotto_numbers: number[][];
    amount: string[];
  };
}

const Capture = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OCRStatus | null>(null);
  const [isCheckingOcr, setIsCheckingOcr] = useState(true);
  const [currentView, setCurrentView] = useState<'upload' | 'crop' | 'result' | 'saved-data'>('upload');
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingSavedData, setLoadingSavedData] = useState(false);
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0); // 강제 재렌더링용
  const navigate = useNavigate();

  // 초기화 상태 확인을 위한 useEffect
  useEffect(() => {
    if (currentView === 'upload' && !selectedFile && !previewUrl && !analysisResult) {
      console.log('✅ 초기화 상태 확인됨 - 모든 상태가 정상적으로 리셋되었습니다');
    }
  }, [currentView, selectedFile, previewUrl, analysisResult]);

  useEffect(() => {
    const checkOcrStatus = async () => {
      try {
        const response = await fetch(getApiUrl('/ocr-status'));
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
      setAnalysisResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setCurrentView('crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    if (result.success && result.corrected_image) {
      setAnalysisResult(result);
      setPreviewUrl(result.corrected_image); // 미리보기를 보정된 이미지로 교체
      setError(null);
    } else {
      // 백엔드에서 전달된 에러 메시지(detail) 또는 일반 메시지 표시
      setError(result.detail || result.message || '알 수 없는 오류가 발생했습니다.');
      setAnalysisResult(null);
    }
    setCurrentView('result');
  };

  const handleCropCancel = () => {
    setCurrentView('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleReset = () => {
    console.log('🔄 초기화 버튼 클릭됨'); // 디버깅 로그
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      console.log('📁 파일 입력 필드 초기화됨');
    }
    
    // 기존 URL 해제 (메모리 누수 방지)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
      console.log('🗑️ 이전 URL 해제됨');
    }
    
    // 모든 상태 완전 초기화
    setCurrentView('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setSelectedAnalysis(null);
    setDialogOpen(false);
    
    // 추가: 혹시 남아있을 수 있는 이미지 요소들 강제 정리
    setTimeout(() => {
      const images = document.querySelectorAll('img[src^="data:image"], img[src^="blob:"]');
      images.forEach((img) => {
        if (img instanceof HTMLImageElement) {
          const oldSrc = img.src;
          img.src = '';
          if (oldSrc.startsWith('blob:')) {
            URL.revokeObjectURL(oldSrc);
          }
        }
      });
      console.log('🖼️ 모든 이미지 요소 정리 완료');
    }, 100);
    
    console.log('✅ 모든 상태가 완전히 초기화되었습니다');
    setForceUpdateKey(prevKey => prevKey + 1);
  };

  const handleSaveAnalysis = async () => {
    if (!analysisResult || !selectedFile) {
      setError('저장할 분석 결과가 없습니다.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('analysis_result', JSON.stringify(analysisResult));

      const response = await fetch(getApiUrl('/api/save-analysis'), {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`분석 결과가 저장되었습니다!\nID: ${result.analysis_id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const fetchSavedAnalyses = async () => {
    setLoadingSavedData(true);
    try {
      const response = await fetch(getApiUrl('/api/saved-analyses'));
      if (response.ok) {
        const data = await response.json();
        
        // 구매일자(issue_date) 기준으로 정렬 (최신순)
        const sortedAnalyses = (data.analyses || []).sort((a: SavedAnalysis, b: SavedAnalysis) => {
          const dateA = a.analysis_result.issue_date || a.timestamp;
          const dateB = b.analysis_result.issue_date || b.timestamp;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        setSavedAnalyses(sortedAnalyses);
        setCurrentView('saved-data');
      } else {
        setError('저장된 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
      setError('저장된 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingSavedData(false);
    }
  };

  const handleAnalysisClick = (analysis: SavedAnalysis) => {
    // 이미 목록에서 모든 데이터를 가져왔으므로 바로 다이얼로그 표시
    setSelectedAnalysis(analysis);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAnalysis(null);
  };

  const handleGoToStatistics = () => {
    navigate('/statistics');
  };

  // 공통 헤더
  const renderAppBar = (title: string, backAction: () => void) => (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="back" onClick={backAction} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" component="div">{title}</Typography>
      </Toolbar>
    </AppBar>
  );

  if (isCheckingOcr) {
    return (
      <>
        {renderAppBar('번호 분석', () => navigate(-1))}
        <Container maxWidth="md">
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>OCR 상태 확인 중...</Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (currentView === 'crop' && previewUrl) {
    return (
      <>
        {renderAppBar('분석 영역 선택', handleCropCancel)}
        <Container maxWidth="lg">
          <Box sx={{ mt: 4 }}>
            <ImageCropSelector
              imageUrl={previewUrl}
              onComplete={handleAnalysisComplete}
              onCancel={handleCropCancel}
              onReset={handleReset}
              originalFile={selectedFile!}
            />
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      {renderAppBar(
        currentView === 'saved-data' ? '이미지 저장 목록' : '번호 분석', 
        currentView === 'saved-data' ? () => setCurrentView('upload') : () => navigate(-1)
      )}
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            {ocrStatus && !ocrStatus.ocr_available && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                  {ocrStatus.message}
              </Alert>
            )}

            {currentView === 'upload' && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>로또 용지 촬영 또는 업로드</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  로또 용지의 번호 부분을 촬영하거나 이미지 파일을 업로드해주세요.
                </Typography>
                
                <Stack spacing={2} direction="column" alignItems="center">
                  <Button variant="contained" component="label" disabled={!ocrStatus?.ocr_available}>
                    이미지 선택
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} ref={fileInputRef} />
                  </Button>
                  
                  <Stack spacing={2} direction="row">
                    <Button 
                      variant="outlined" 
                      startIcon={<FolderIcon />}
                      onClick={fetchSavedAnalyses}
                      disabled={loadingSavedData}
                    >
                      {loadingSavedData ? '로딩 중...' : '저장된 분석 데이터'}
                    </Button>
                    
                    <Button 
                      variant="outlined" 
                      startIcon={<BarChartIcon />}
                      onClick={handleGoToStatistics}
                    >
                      통계
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}

                        {currentView === 'saved-data' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5">이미지 저장 목록</Typography>
                  <Button variant="outlined" onClick={() => setCurrentView('upload')}>
                    새 분석하기
                  </Button>
                </Box>
                
                {savedAnalyses.length === 0 ? (
                  <Alert severity="info">
                    저장된 분석 데이터가 없습니다. 로또 용지를 분석하고 저장해보세요!
                  </Alert>
                ) : (
                  <Box>
                    {/* 회차별로 그룹화된 데이터 표시 */}
                    {Object.entries(
                      savedAnalyses.reduce((groups, analysis) => {
                        const drawNumber = analysis.analysis_result.draw_number;
                        const key = drawNumber ? `${drawNumber}회` : '회차 정보 없음';
                        if (!groups[key]) {
                          groups[key] = [];
                        }
                        groups[key].push(analysis);
                        return groups;
                      }, {} as Record<string, SavedAnalysis[]>)
                    )
                    .sort(([a], [b]) => {
                      // 회차별 정렬 (숫자가 큰 순서대로)
                      const numA = parseInt(a.replace('회', '')) || 0;
                      const numB = parseInt(b.replace('회', '')) || 0;
                      return numB - numA;
                    })
                    .map(([drawNumber, analyses]) => (
                      <Box key={drawNumber} sx={{ mb: 4 }}>
                        {/* 회차 헤더 */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 2,
                          p: 2,
                          backgroundColor: '#f5f5f5',
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {drawNumber}
                          </Typography>
                        </Box>
                        
                        {/* 해당 회차의 분석 데이터들 - 그리드 레이아웃으로 변경 */}
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                          gap: 2 
                        }}>
                          {analyses
                            .sort((a, b) => {
                              // 구매일자 기준 최신순 정렬
                              const dateA = a.analysis_result.issue_date || a.timestamp;
                              const dateB = b.analysis_result.issue_date || b.timestamp;
                              return new Date(dateB).getTime() - new Date(dateA).getTime();
                            })
                            .map((analysis) => (
                              <Box 
                                key={analysis.id}
                                sx={{ 
                                  border: '1px solid #e0e0e0',
                                  borderRadius: 2,
                                  backgroundColor: '#fff',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': { 
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    transform: 'translateY(-2px)'
                                  }
                                }}
                                onClick={() => handleAnalysisClick(analysis)}
                              >
                                {/* 이미지만 표시 */}
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  p: 2,
                                  backgroundColor: '#f9f9f9',
                                  borderRadius: '8px 8px 0 0',
                                  minHeight: '200px'
                                }}>
                                  {analysis.original_image ? (
                                    <img 
                                      src={`data:image/jpeg;base64,${analysis.original_image}`}
                                      alt={`분석 이미지 - ${drawNumber}`}
                                      style={{ 
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        objectFit: 'contain',
                                        borderRadius: '4px'
                                      }}
                                    />
                                  ) : (
                                    <Typography color="text.secondary">
                                      이미지 없음
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            ))
                          }
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {currentView === 'result' && (
              <Box key={`result-${forceUpdateKey}`}>
                <Typography variant="h5" sx={{ mb: 2 }}>분석 결과</Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                {analysisResult && analysisResult.success && (
                  <>
                    {/* 분석 과정 이미지 - 나란히 표시 */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>분석 과정 이미지</Typography>
                      
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                        gap: 2 
                      }}>
                        {/* 기울기 보정만 된 원본 이미지 */}
                        {analysisResult.transformed_image && (
                          <Box key={`transformed-${forceUpdateKey}`}>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                              1. 기울기 보정된 원본 이미지
                            </Typography>
                            <img 
                              key={`img-transformed-${forceUpdateKey}`}
                              src={analysisResult.transformed_image} 
                              alt="Transformed" 
                              style={{ 
                                width: '100%', 
                                border: '2px solid #1976d2', 
                                borderRadius: '4px',
                                objectFit: 'contain'
                              }} 
                            />
                          </Box>
                        )}
                        
                        {/* OCR 전처리된 이미지 */}
                        {analysisResult.corrected_image && (
                          <Box key={`corrected-${forceUpdateKey}`}>
                            <Typography variant="subtitle1" gutterBottom color="secondary">
                              2. OCR 전처리된 이미지
                            </Typography>
                            <img 
                              key={`img-corrected-${forceUpdateKey}`}
                              src={analysisResult.corrected_image} 
                              alt="OCR Preprocessed" 
                              style={{ 
                                width: '100%', 
                                border: '2px solid #d32f2f', 
                                borderRadius: '4px',
                                objectFit: 'contain'
                              }} 
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    {/* 로또 용지 정보 */}
                    {(analysisResult.draw_number || analysisResult.issue_date || analysisResult.draw_date || analysisResult.payment_deadline || analysisResult.extracted_combinations || analysisResult.extracted_amounts) && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>로또 용지 정보</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                          {analysisResult.draw_number && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">회차</Typography>
                              <Typography variant="h6">{analysisResult.draw_number}회</Typography>
                            </Box>
                          )}
                          {analysisResult.issue_date && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">발행일</Typography>
                              <Typography variant="h6">{analysisResult.issue_date}</Typography>
                            </Box>
                          )}
                          {analysisResult.draw_date && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">추첨일</Typography>
                              <Typography variant="h6">{analysisResult.draw_date}</Typography>
                            </Box>
                          )}
                          {analysisResult.payment_deadline && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">지급기한</Typography>
                              <Typography variant="h6">{analysisResult.payment_deadline}</Typography>
                            </Box>
                          )}
                          {analysisResult.extracted_combinations && analysisResult.extracted_combinations.length > 0 && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">로또 번호</Typography>
                              <Box sx={{ mt: 1 }}>
                                {analysisResult.extracted_combinations.map((combination, index) => (
                                  <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                      조합 {index + 1}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                      {combination.map((num) => (
                                        <Chip key={num} label={num} size="small" sx={{ fontSize: '0.75rem', height: '20px' }} />
                                      ))}
                                    </Stack>
                                  </Box>
                                ))}
                              </Box>
                </Box>
              )}
                          {analysisResult.extracted_amounts && analysisResult.extracted_amounts.length > 0 && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" color="text.secondary">가격</Typography>
                              <Box sx={{ mt: 1 }}>
                                {analysisResult.extracted_amounts.map((amount, index) => (
                                  <Chip key={index} label={amount} color="secondary" size="small" sx={{ mb: 0.5 }} />
                                ))}
                              </Box>
                            </Box>
                          )}
              </Box>
                      </>
                    )}
                    
                    {/* 6개 영역별 추출 결과 */}
                    {analysisResult.region_results && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>6개 영역별 추출 결과</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 2 }}>
                          {analysisResult.region_results.title && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f0f8ff' }}>
                              <Typography variant="subtitle2" color="text.secondary">① 회차</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {analysisResult.region_results.title}
                              </Typography>
                            </Box>
                          )}
                          {analysisResult.region_results.dates && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f0fff0' }}>
                              <Typography variant="subtitle2" color="text.secondary">② 날짜 정보</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {analysisResult.region_results.dates}
                              </Typography>
                            </Box>
                          )}
                          {analysisResult.region_results.unique_numbers && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fff8f0' }}>
                              <Typography variant="subtitle2" color="text.secondary">③ 고유번호 영역</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {analysisResult.region_results.unique_numbers}
                  </Typography>
                            </Box>
                          )}
                          {analysisResult.region_results.amount && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fff0f0' }}>
                              <Typography variant="subtitle2" color="text.secondary">⑤ 금액 표시</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {analysisResult.region_results.amount}
                    </Typography>
                            </Box>
                          )}
                          {analysisResult.region_results.barcode_numbers && (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f8f0ff' }}>
                              <Typography variant="subtitle2" color="text.secondary">⑥ 바코드 아래</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {analysisResult.region_results.barcode_numbers}
                    </Typography>
                            </Box>
                          )}
                  </Box>


                      </>
                    )}

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>추출된 로또 번호 조합</Typography>
                    {analysisResult.extracted_combinations && analysisResult.extracted_combinations.length > 0 ? (
                      <Box>
                        {analysisResult.extracted_combinations.map((combination, index) => (
                          <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                              조합 {index + 1}
                          </Typography>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                              {combination.map((num) => (
                                <Chip key={num} label={num} color="primary" size="small" />
                              ))}
                            </Stack>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                      <Typography>추출된 로또 번호 조합이 없습니다.</Typography>
                    )}

                    {analysisResult.extracted_amounts && analysisResult.extracted_amounts.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>추출된 금액</Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {analysisResult.extracted_amounts.map((amount, index) => (
                            <Chip key={index} label={amount} color="secondary" />
                          ))}
                        </Stack>
                      </>
                    )}

                    {/* 금액 검증 정보 */}
                    {analysisResult.amount_verification && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>금액 검증 정보</Typography>
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">검증 상태</Typography>
                              <Chip 
                                label={analysisResult.amount_verification.verification_status} 
                                color={
                                  analysisResult.amount_verification.confidence === 'high' ? 'success' :
                                  analysisResult.amount_verification.confidence === 'medium' ? 'warning' : 'error'
                                }
                                size="small"
                              />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">신뢰도</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {analysisResult.amount_verification.confidence.toUpperCase()}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">로또 번호 개수</Typography>
                              <Typography variant="body2">{analysisResult.amount_verification.lotto_count}개</Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">예상 금액</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {analysisResult.amount_verification.expected_amount}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">OCR 원본</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {analysisResult.amount_verification.ocr_raw}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">OCR 정규화</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {analysisResult.amount_verification.ocr_normalized || 'null'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">최종 금액</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {analysisResult.amount_verification.final_amount}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>영역별 OCR 결과</Typography>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto', backgroundColor: '#f5f5f5' }}>


                      {analysisResult.region_results ? (
                        <Box>
                          <Typography variant="subtitle1" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                            🔍 영역별 OCR 상세 결과
                          </Typography>
                          
                          {/* 개수 판단 영역 OCR 결과 */}
                          {analysisResult.region_results.count_detection_text && (
                            <Box sx={{ mb: 2, p: 2, border: '2px solid #4caf50', borderRadius: 1, backgroundColor: '#f1f8e9' }}>
                              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                🔢 개수 판단 영역 OCR 원본
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {analysisResult.region_results.count_detection_text}
                              </Typography>
                            </Box>
                          )}

                          {/* 📋 회차발행일 통합 OCR 원본 (최적화됨) */}
                          {analysisResult.region_results.draw_issue_combined_text && (
                            <Box sx={{ mb: 2, p: 2, border: '2px solid #ff9800', borderRadius: 1, backgroundColor: '#fff3e0' }}>
                              <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                📋 회차발행일 통합 OCR 원본
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {analysisResult.region_results.draw_issue_combined_text}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* ① 회차 후처리 결과 */}
                          {analysisResult.region_results.title_filtered_text && (
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #2196f3', borderRadius: 1, backgroundColor: '#e3f2fd' }}>
                              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                                ① 회차 후처리 결과
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                회차: {analysisResult.region_results.title_filtered_text}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* ② 발행일 후처리 결과 */}
                          {analysisResult.region_results.issue_date_filtered_text && (
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #4caf50', borderRadius: 1, backgroundColor: '#e8f5e8' }}>
                              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                ② 발행일 후처리 결과
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                발행일: {analysisResult.region_results.issue_date_filtered_text}
                              </Typography>
                            </Box>
                          )}
                          {/* ③ 추첨일 & ④ 지급기한: API에서 정확한 정보 획득하므로 OCR 제외 */}
                          <Box sx={{ mb: 2, p: 2, border: '1px solid #9e9e9e', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                              ℹ️ 추첨일 & 지급기한 정보
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              추첨일과 지급기한은 동행복권 API에서 정확한 정보를 가져오므로 OCR 처리에서 제외되었습니다.
                            </Typography>
                          </Box>
                          
                          {/* 🎯 번호영역 OCR 원본 */}
                          {analysisResult.region_results.number_area_text && (
                            <Box sx={{ mb: 2, p: 2, border: '2px solid #9c27b0', borderRadius: 1, backgroundColor: '#f3e5f5' }}>
                              <Typography variant="subtitle2" color="secondary.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                🎯 번호영역 OCR 원본
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {analysisResult.region_results.number_area_text}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* ③ 번호영역 후처리 결과 & 추출된 번호 조합 */}
                          {(analysisResult.region_results.number_area_filtered_text || 
                            (analysisResult.region_results.lotto_combinations && analysisResult.region_results.lotto_combinations.length > 0)) && (
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #673ab7', borderRadius: 1, backgroundColor: '#ede7f6' }}>
                              <Typography variant="subtitle2" color="secondary.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                ③ 번호영역 후처리 결과
                              </Typography>
                              
                              {/* 후처리된 텍스트 */}
                              {analysisResult.region_results.number_area_filtered_text && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mb: 1 }}>
                                    {analysisResult.region_results.number_area_filtered_text}
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* 추출된 번호 조합들 */}
                              {analysisResult.region_results.lotto_combinations && analysisResult.region_results.lotto_combinations.length > 0 && (
                                <Box>
                                  <Typography variant="body2" color="secondary.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    📊 추출된 번호 조합 ({analysisResult.region_results.lotto_combinations.length}개):
                                  </Typography>
                                  {analysisResult.region_results.lotto_combinations.map((combination, index) => (
                                    <Box key={index} sx={{ mb: 0.5, pl: 1 }}>
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {String.fromCharCode(65 + index)} 조합: {combination.map(n => n.toString().padStart(2, '0')).join(' - ')}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          )}
                          
                          {/* 💰 금액 OCR 결과 */}
                          {analysisResult.region_results.amount && (
                            <Box sx={{ mb: 2, p: 2, border: '2px solid #4caf50', borderRadius: 1, backgroundColor: '#e8f5e8' }}>
                              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                💰 금액 OCR 결과
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {analysisResult.region_results.amount}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* 🔍 금액 검증 정보 (상세) */}
                          {analysisResult.amount_verification && (
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #ff9800', borderRadius: 1, backgroundColor: '#fff3e0' }}>
                              <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                                🔍 금액 검증 정보
                              </Typography>
                              
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>추출된 로또 개수:</span>
                                  <span style={{ fontWeight: 'bold' }}>{analysisResult.amount_verification.lotto_count}개</span>
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>예상 금액:</span>
                                  <span style={{ fontWeight: 'bold' }}>{analysisResult.amount_verification.expected_amount}</span>
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>OCR 원본:</span>
                                  <span style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '2px' }}>
                                    '{analysisResult.amount_verification.ocr_raw}'
                                  </span>
                                </Typography>
                              </Box>
                              
                              {analysisResult.amount_verification.ocr_normalized && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>OCR 정규화:</span>
                                    <span style={{ fontWeight: 'bold' }}>{analysisResult.amount_verification.ocr_normalized}</span>
                                  </Typography>
                                </Box>
                              )}
                              
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>최종 금액:</span>
                                  <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{analysisResult.amount_verification.final_amount}</span>
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>신뢰도:</span>
                                  <Chip 
                                    label={analysisResult.amount_verification.confidence}
                                    size="small"
                                    color={
                                      analysisResult.amount_verification.confidence === 'high' ? 'success' :
                                      analysisResult.amount_verification.confidence === 'medium' ? 'warning' : 'error'
                                    }
                                  />
                                </Typography>
                              </Box>
                              
                              <Box>
                                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>검증 상태:</span>
                                  <span style={{ 
                                    fontSize: '0.8rem', 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '2px 6px', 
                                    borderRadius: '10px',
                                    border: '1px solid #ddd'
                                  }}>
                                    {analysisResult.amount_verification.verification_status}
                                  </span>
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* 📋 최종 추출 결과 요약 */}
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #795548', borderRadius: 1, backgroundColor: '#efebe9' }}>
                            <Typography variant="subtitle2" color="text.primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                                📋 최종 추출 결과 요약
                              </Typography>
                              
                            {/* 회차 정보 */}
                                <Typography variant="body2" sx={{ mb: 1 }}>
                              • 회차: {analysisResult.draw_number ? `제 ${analysisResult.draw_number} 회` : '추출 실패'}
                              {analysisResult.validation_result && !analysisResult.validation_result.draw_number_valid && (
                                <Chip 
                                  label="보정됨" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                />
                              )}
                                </Typography>
                            
                            {/* 발행일 정보 */}
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • 발행일: {analysisResult.issue_date || '추출 실패'}
                              {analysisResult.validation_result && !analysisResult.validation_result.issue_date_valid && (
                                <Chip 
                                  label="보정됨" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                />
                              )}
                            </Typography>
                            
                            {/* 추첨일 정보 */}
                                <Typography variant="body2" sx={{ mb: 1 }}>
                              • 추첨일: {analysisResult.draw_date ? 
                                        (analysisResult.draw_date.includes('-') ? 
                                         analysisResult.draw_date.replace(/-/g, '/') : 
                                         analysisResult.draw_date) : 
                                        '조회 중...'}
                              <Chip 
                                label="API" 
                                size="small" 
                                color="info" 
                                sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                              />
                                </Typography>
                            
                            {/* 지급기한 정보 */}
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              • 지급기한: {analysisResult.payment_deadline || '계산 중...'}
                              <Chip 
                                label="API" 
                                size="small" 
                                color="info" 
                                sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                              />
                            </Typography>
                            
                            {/* 번호 조합 정보 */}
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                              • 번호 조합: {analysisResult.extracted_combinations?.length || 0}개
                            </Typography>
                            {analysisResult.extracted_combinations && analysisResult.extracted_combinations.length > 0 && (
                              <Box sx={{ ml: 2, mb: 2 }}>
                                {analysisResult.extracted_combinations.map((combination, index) => (
                                  <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                      조합 {index + 1}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ display: 'inline-flex' }}>
                                      {combination.map((num) => (
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
                                            fontWeight: 'bold',
                                            fontSize: '0.7rem',
                                            height: '20px'
                                          }}
                                        />
                                      ))}
                                    </Stack>
                                  </Box>
                                ))}
                              </Box>
                            )}
                            
                            {/* 금액 정보 */}
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • 금액: {analysisResult.extracted_amounts && analysisResult.extracted_amounts.length > 0 
                                      ? analysisResult.extracted_amounts.join(', ') 
                                      : '추출 실패'}
                              {analysisResult.amount_verification && (
                                <Chip 
                                  label={`신뢰도: ${analysisResult.amount_verification.confidence.toUpperCase()}`}
                                  size="small" 
                                  color={analysisResult.amount_verification.confidence === 'high' ? 'success' : 
                                         analysisResult.amount_verification.confidence === 'medium' ? 'warning' : 'error'}
                                  sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                />
                              )}
                            </Typography>
                            
                            {/* 검증 메시지 (있는 경우만) */}
                            {analysisResult.validation_result && analysisResult.validation_result.validation_messages.length > 0 && (
                              <Box sx={{ mt: 1, p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                  🔍 검증 정보:
                                </Typography>
                                {analysisResult.validation_result.validation_messages.map((message, index) => (
                                  <Typography key={index} variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                    {message}
                                  </Typography>
                                ))}
                            </Box>
                          )}
                          </Box>
                          
                          {/* 🔧 기타 디버깅 정보 (필요시만 표시) */}
                          {(analysisResult.region_results.unique_numbers || analysisResult.region_results.barcode_numbers) && (
                            <Box sx={{ mb: 2, p: 2, border: '1px solid #9e9e9e', borderRadius: 1, backgroundColor: '#fafafa' }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                                🔧 기타 디버깅 정보
                              </Typography>
                              
                              {analysisResult.region_results.unique_numbers && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary">고유번호 영역:</Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {analysisResult.region_results.unique_numbers}
                                  </Typography>
                                </Box>
                              )}
                              
                              {analysisResult.region_results.barcode_numbers && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary">바코드 아래:</Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {analysisResult.region_results.barcode_numbers}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}

                          {/* 모든 OCR 결과가 없는 경우 */}
                          {(!analysisResult.region_results.draw_issue_combined_text && 
                            !analysisResult.region_results.number_area_text &&
                            !analysisResult.region_results.count_detection_text &&
                            !analysisResult.region_results.title_filtered_text && 
                            !analysisResult.region_results.issue_date_filtered_text && 
                            !analysisResult.region_results.number_area_filtered_text &&
                            !analysisResult.region_results.title && 
                            !analysisResult.region_results.dates && 
                            !analysisResult.region_results.unique_numbers && 
                            !analysisResult.region_results.lotto_combinations &&
                            !analysisResult.region_results.amount && 
                            !analysisResult.region_results.barcode_numbers) && (
                            <Typography color="text.secondary">영역별 OCR 결과가 없습니다.</Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography color="text.secondary">영역별 OCR 결과가 없습니다.</Typography>
                      )}

                      {/* 영역별 결과가 없는 경우 */}
                      {!analysisResult.region_results && (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography color="text.secondary" sx={{ mb: 1 }}>
                            OCR 인식 결과가 없습니다.
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            이미지가 너무 흐리거나 텍스트가 인식되지 않았을 수 있습니다.
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </>
                )}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleSaveAnalysis} variant="contained" color="success">
                    결과 저장
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    variant="contained" 
                    color="primary"
                    startIcon={<RestartAltIcon />}
                  >
                    새로 분석하기
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>

      {/* 분석 결과 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          분석 결과 상세
        </DialogTitle>
        <DialogContent>
          {selectedAnalysis && (
            <Box>
              {/* 원본 이미지 */}
              {selectedAnalysis.original_image && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>원본 이미지</Typography>
                  <img 
                    src={`data:image/jpeg;base64,${selectedAnalysis.original_image}`}
                    alt="Original Analysis"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '300px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </Box>
              )}

              {/* 분석 정보 */}
              <Box sx={{ mb: 3 }}>
                {selectedAnalysis.analysis_result.draw_number && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>회차:</strong> {selectedAnalysis.analysis_result.draw_number}회
                  </Typography>
                )}
                {selectedAnalysis.analysis_result.issue_date && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>구매일:</strong> {selectedAnalysis.analysis_result.issue_date}
                  </Typography>
                )}
                {selectedAnalysis.analysis_result.draw_date && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>추첨일:</strong> {selectedAnalysis.analysis_result.draw_date}
                  </Typography>
                )}
                {selectedAnalysis.analysis_result.payment_deadline && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>지급기한:</strong> {selectedAnalysis.analysis_result.payment_deadline}
                  </Typography>
                )}
              </Box>

              {/* 로또 번호 */}
              {selectedAnalysis.analysis_result.lotto_numbers.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>로또 번호</Typography>
                  {selectedAnalysis.analysis_result.lotto_numbers.map((numbers, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        조합 {index + 1}
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {numbers.map((num) => (
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
                              fontWeight: 'bold'
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              {/* 금액 정보 */}
              {selectedAnalysis.analysis_result.amount.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>금액</Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {selectedAnalysis.analysis_result.amount.map((amount, index) => (
                      <Chip key={index} label={amount} color="secondary" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>닫기</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Capture; 