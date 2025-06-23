#!/usr/bin/env python3
"""
로컬 테스트용 실행 스크립트
"""

import uvicorn
import os

if __name__ == "__main__":
    print("🚀 로또 분석 백엔드 서버 시작...")
    print("📍 서버 주소: http://localhost:8000")
    print("📚 API 문서: http://localhost:8000/docs")
    print("=" * 50)
    
    # 로컬 개발 환경 설정
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 코드 변경 시 자동 재시작
        log_level="info"
    ) 