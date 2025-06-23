from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
from typing import Optional, List
import uvicorn
import os
import cv2
import numpy as np
from PIL import Image
import io
from pydantic import BaseModel

app = FastAPI(title="로또 분석 API", version="1.0.0")

# CORS 설정 - 로컬 개발을 위해 모든 origin 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 시에만 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OCR 상태 변수
OCR_AVAILABLE = False
OCR_MESSAGE = "EasyOCR이 설치되지 않았습니다."

# EasyOCR 초기화 시도
try:
    import easyocr
    reader = easyocr.Reader(['ko', 'en'])
    OCR_AVAILABLE = True
    OCR_MESSAGE = "OCR이 사용 가능합니다."
    print("EasyOCR 초기화 성공")
except ImportError:
    OCR_MESSAGE = "EasyOCR 패키지가 설치되지 않았습니다. 'pip install easyocr' 명령어로 설치하세요."
    print("EasyOCR 패키지가 설치되지 않았습니다.")
except Exception as e:
    OCR_MESSAGE = f"EasyOCR 초기화 실패: {str(e)}"
    print(f"EasyOCR 초기화 실패: {e}")

class CornerPoints(BaseModel):
    corners: List[List[float]]  # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]

@app.get("/")
async def root():
    return {"message": "로또 분석 API 서버가 실행 중입니다."}

@app.get("/ocr-status")
async def get_ocr_status():
    """OCR 상태를 확인합니다."""
    return {
        "ocr_available": OCR_AVAILABLE,
        "message": OCR_MESSAGE
    }

def preprocess_image(image_cv):
    """이미지 전처리를 통해 OCR 정확도를 향상시킵니다."""
    # 그레이스케일 변환
    if len(image_cv.shape) == 3:
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_cv
    
    # 노이즈 제거
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # 대비 향상
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    # 이진화
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary

def perspective_transform_image(image_cv, corners):
    """4개 모서리 점을 사용하여 원근 변환을 적용합니다."""
    # 입력 모서리 점들을 numpy 배열로 변환
    src_points = np.array(corners, dtype=np.float32)
    
    # 모서리 점들을 정렬 (좌상단, 우상단, 우하단, 좌하단 순서)
    # 각 모서리 점의 x+y 값으로 정렬
    sum_coords = src_points.sum(axis=1)
    diff_coords = np.diff(src_points, axis=1)
    
    # 좌상단 (x+y가 가장 작음)
    top_left = src_points[np.argmin(sum_coords)]
    # 우하단 (x+y가 가장 큼)
    bottom_right = src_points[np.argmax(sum_coords)]
    
    # 우상단 (y-x가 가장 작음)
    top_right = src_points[np.argmin(diff_coords)]
    # 좌하단 (y-x가 가장 큼)
    bottom_left = src_points[np.argmax(diff_coords)]
    
    # 정렬된 모서리 점들
    src_points = np.array([top_left, top_right, bottom_right, bottom_left], dtype=np.float32)
    
    # 목표 사각형의 크기 계산
    width1 = float(np.linalg.norm(src_points[1] - src_points[0]))
    width2 = float(np.linalg.norm(src_points[2] - src_points[3]))
    width = max(width1, width2)
    
    height1 = float(np.linalg.norm(src_points[3] - src_points[0]))
    height2 = float(np.linalg.norm(src_points[2] - src_points[1]))
    height = max(height1, height2)
    
    # 목표 사각형의 모서리 점들
    dst_points = np.array([
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
    ], dtype=np.float32)
    
    # 원근 변환 행렬 계산
    transform_matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    
    # 원근 변환 적용
    warped_image = cv2.warpPerspective(image_cv, transform_matrix, (int(width), int(height)))
    
    return warped_image

@app.post("/transform-and-analyze")
async def transform_and_analyze_image(file: UploadFile = File(...), corners: str = Form(...)):
    """이미지를 원근 변환한 후 OCR 분석을 수행합니다."""
    if not OCR_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR 기능이 사용 불가능합니다.")
    
    # 파일 타입 검증
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
    
    try:
        # corners JSON 파싱
        import json
        corners_data = json.loads(corners)
        corners_list = corners_data.get('corners', [])
        
        if len(corners_list) != 4:
            raise HTTPException(status_code=400, detail="정확히 4개의 모서리 점이 필요합니다.")
        
        # 이미지 파일 읽기
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # PIL Image를 numpy array로 변환
        image_np = np.array(image)
        
        # BGR로 변환 (OpenCV 형식)
        if len(image_np.shape) == 3:
            image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        else:
            image_cv = image_np
        
        # 원근 변환 적용
        transformed_image = perspective_transform_image(image_cv, corners_list)
        
        # 보정된 이미지를 base64로 인코딩
        import base64
        # BGR을 RGB로 변환 (PIL 형식)
        transformed_rgb = cv2.cvtColor(transformed_image, cv2.COLOR_BGR2RGB)
        transformed_pil = Image.fromarray(transformed_rgb)
        
        # PIL 이미지를 base64로 인코딩
        buffer = io.BytesIO()
        transformed_pil.save(buffer, format='JPEG', quality=90)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # 이미지 전처리
        processed_image = preprocess_image(transformed_image)
        
        # OCR 실행 (원근 변환된 이미지와 전처리된 이미지 모두 시도)
        results = []
        
        # 1. 원근 변환된 이미지로 OCR
        try:
            transformed_results = reader.readtext(transformed_image)
            results.extend(transformed_results)
        except Exception as e:
            print(f"원근 변환 이미지 OCR 실패: {e}")
        
        # 2. 전처리된 이미지로 OCR
        try:
            processed_results = reader.readtext(processed_image)
            results.extend(processed_results)
        except Exception as e:
            print(f"전처리 이미지 OCR 실패: {e}")
        
        # 중복 제거 (같은 텍스트는 하나만 유지)
        unique_results = []
        seen_texts = set()
        
        for result in results:
            # EasyOCR 결과 형식에 따라 안전하게 처리
            if len(result) == 3:
                # (bbox, text, confidence) 형식
                bbox, text, confidence = result
            elif len(result) == 2:
                # (bbox, text) 형식
                bbox, text = result
                confidence = 0.5  # 기본 신뢰도
            else:
                # 예상치 못한 형식이면 건너뛰기
                continue
            
            # 텍스트 정규화 (공백 제거, 소문자 변환)
            normalized_text = text.strip().lower()
            if normalized_text and normalized_text not in seen_texts:
                seen_texts.add(normalized_text)
                unique_results.append((bbox, text, confidence))
        
        # 텍스트 추출
        extracted_texts = []
        lotto_numbers = []
        
        for (bbox, text, confidence) in unique_results:
            extracted_texts.append(text)
            
            # 로또 번호 패턴 찾기 (6개 숫자 조합)
            numbers = extract_lotto_numbers(text)
            if numbers:
                lotto_numbers.append({
                    "numbers": numbers,
                    "confidence": confidence,
                    "source_text": text
                })
        
        return {
            "success": True,
            "transformed_image": f"data:image/jpeg;base64,{img_base64}",
            "extracted_text": extracted_texts,
            "lotto_numbers": lotto_numbers,
            "total_texts_found": len(extracted_texts),
            "lotto_combinations_found": len(lotto_numbers)
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="모서리 좌표 데이터 형식이 올바르지 않습니다.")
    except Exception as e:
        # 더 자세한 오류 정보 제공
        import traceback
        error_details = traceback.format_exc()
        print(f"OCR 오류 상세: {error_details}")
        raise HTTPException(status_code=500, detail=f"이미지 분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/analyze")
async def analyze_lotto_image(file: UploadFile = File(...)):
    """로또 이미지를 분석하여 번호를 추출합니다."""
    if not OCR_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR 기능이 사용 불가능합니다.")
    
    # 파일 타입 검증
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
    
    try:
        # 이미지 파일 읽기
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # PIL Image를 numpy array로 변환
        image_np = np.array(image)
        
        # BGR로 변환 (OpenCV 형식)
        if len(image_np.shape) == 3:
            image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        else:
            image_cv = image_np
        
        # 이미지 전처리
        processed_image = preprocess_image(image_cv)
        
        # OCR 실행 (원본 이미지와 전처리된 이미지 모두 시도)
        results = []
        
        # 1. 원본 이미지로 OCR
        try:
            original_results = reader.readtext(image_cv)
            results.extend(original_results)
        except Exception as e:
            print(f"원본 이미지 OCR 실패: {e}")
        
        # 2. 전처리된 이미지로 OCR
        try:
            processed_results = reader.readtext(processed_image)
            results.extend(processed_results)
        except Exception as e:
            print(f"전처리 이미지 OCR 실패: {e}")
        
        # 중복 제거 (같은 텍스트는 하나만 유지)
        unique_results = []
        seen_texts = set()
        
        for result in results:
            # EasyOCR 결과 형식에 따라 안전하게 처리
            if len(result) == 3:
                # (bbox, text, confidence) 형식
                bbox, text, confidence = result
            elif len(result) == 2:
                # (bbox, text) 형식
                bbox, text = result
                confidence = 0.5  # 기본 신뢰도
            else:
                # 예상치 못한 형식이면 건너뛰기
                continue
            
            # 텍스트 정규화 (공백 제거, 소문자 변환)
            normalized_text = text.strip().lower()
            if normalized_text and normalized_text not in seen_texts:
                seen_texts.add(normalized_text)
                unique_results.append((bbox, text, confidence))
        
        # 텍스트 추출
        extracted_texts = []
        lotto_numbers = []
        
        for (bbox, text, confidence) in unique_results:
            extracted_texts.append(text)
            
            # 로또 번호 패턴 찾기 (6개 숫자 조합)
            numbers = extract_lotto_numbers(text)
            if numbers:
                lotto_numbers.append({
                    "numbers": numbers,
                    "confidence": confidence,
                    "source_text": text
                })
        
        return {
            "success": True,
            "extracted_text": extracted_texts,
            "lotto_numbers": lotto_numbers,
            "total_texts_found": len(extracted_texts),
            "lotto_combinations_found": len(lotto_numbers)
        }
        
    except Exception as e:
        # 더 자세한 오류 정보 제공
        import traceback
        error_details = traceback.format_exc()
        print(f"OCR 오류 상세: {error_details}")
        raise HTTPException(status_code=500, detail=f"이미지 분석 중 오류가 발생했습니다: {str(e)}")

def extract_lotto_numbers(text: str) -> Optional[List[int]]:
    """텍스트에서 로또 번호를 추출합니다."""
    # 숫자만 추출
    numbers = re.findall(r'\d+', text)
    
    # 6개 숫자가 있는지 확인
    if len(numbers) >= 6:
        # 1-45 범위의 숫자만 필터링
        valid_numbers = []
        for num in numbers:
            num_int = int(num)
            if 1 <= num_int <= 45:
                valid_numbers.append(num_int)
        
        # 6개 숫자가 있으면 반환
        if len(valid_numbers) >= 6:
            return valid_numbers[:6]  # 처음 6개만 반환
    
    return None

@app.get("/api/latest-lotto")
async def get_latest_lotto():
    """최신 로또 회차 정보를 가져옵니다."""
    try:
        # 1. 최신 회차 정보 가져오기
        response = requests.get("https://dhlottery.co.kr/gameResult.do?method=byWin")
        response.raise_for_status()
        
        html_content = response.text
        
        # HTML에서 회차 정보 추출 (win_result에서 회차 찾기)
        draw_no_match = re.search(r'<strong>(\d+)회</strong>', html_content)
        if not draw_no_match:
            raise HTTPException(status_code=404, detail="회차 정보를 찾을 수 없습니다.")
        
        latest_draw_no = int(draw_no_match.group(1))
        
        # 2. 해당 회차의 상세 정보 가져오기
        detail_response = requests.get(f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={latest_draw_no}")
        detail_response.raise_for_status()
        
        lotto_data = detail_response.json()
        
        if lotto_data.get("returnValue") != "success":
            raise HTTPException(status_code=404, detail="당첨 정보를 가져올 수 없습니다.")
        
        return lotto_data
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"외부 API 호출 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.get("/api/lotto/{draw_no}")
async def get_lotto_by_draw_no(draw_no: int):
    """특정 회차의 로또 정보를 가져옵니다."""
    try:
        response = requests.get(f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={draw_no}")
        response.raise_for_status()
        
        lotto_data = response.json()
        
        if lotto_data.get("returnValue") != "success":
            raise HTTPException(status_code=404, detail=f"{draw_no}회차 정보를 찾을 수 없습니다.")
        
        return lotto_data
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"외부 API 호출 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.get("/api/health")
async def health_check():
    """서버 상태 확인"""
    return {"status": "healthy", "message": "서버가 정상적으로 동작 중입니다."}

if __name__ == "__main__":
    # 로컬 개발 환경에서는 8000 포트 사용
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)