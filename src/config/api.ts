// API 설정
export const API_CONFIG = {
  // 로컬 개발 환경
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  
  // API 엔드포인트들
  ENDPOINTS: {
    LATEST_LOTTO: '/api/latest-lotto',
    LOTTO_BY_DRAW: '/api/lotto',
    OCR_STATUS: '/ocr-status',
    ANALYZE: '/analyze',
    HEALTH: '/api/health',
  }
};

// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint: string, params?: Record<string, string | number>) => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    url += `?${queryParams.toString()}`;
  }
  
  return url;
}; 