# 로또 분석 백엔드 API

로또 최신 회차와 당첨 정보를 가져오는 FastAPI 서버입니다.

## 🚀 실행 방법

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
python main.py
```

또는 uvicorn 직접 사용:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. API 문서 확인
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📋 API 엔드포인트

### 최신 로또 정보
```
GET /api/latest-lotto
```

### 특정 회차 로또 정보
```
GET /api/lotto/{draw_no}
```

### 서버 상태 확인
```
GET /api/health
```

## 🔧 개발 환경

- Python 3.8+
- FastAPI
- Uvicorn
- Requests

## 📊 응답 데이터 예시

```json
{
  "drwNo": 1176,
  "drwNoDate": "2025-06-14",
  "drwtNo1": 7,
  "drwtNo2": 9,
  "drwtNo3": 11,
  "drwtNo4": 21,
  "drwtNo5": 30,
  "drwtNo6": 35,
  "bnusNo": 29,
  "firstWinamnt": 2052166154,
  "firstPrzwnerCo": 13,
  "totSellamnt": 115765450000,
  "returnValue": "success"
}
``` 