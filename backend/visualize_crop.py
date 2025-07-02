import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
import sys

# main.py에서 필요한 함수들 임포트
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import crop_regions_dynamic_coords, detect_lotto_count_from_region

def setup_korean_font():
    """한글 폰트 설정"""
    try:
        import matplotlib.font_manager as fm
        font_path = 'C:/Windows/Fonts/malgun.ttf'  # Windows 기본 한글 폰트
        if os.path.exists(font_path):
            plt.rcParams['font.family'] = 'Malgun Gothic'
        else:
            print("한글 폰트를 찾을 수 없습니다. 기본 폰트를 사용합니다.")
    except Exception as e:
        print(f"폰트 설정 오류: {e}")

def visualize_regions(image_path, lotto_count=None):
    """영역 시각화"""
    # 이미지 로드
    image = cv2.imread(image_path)
    if image is None:
        print(f"이미지를 로드할 수 없습니다: {image_path}")
        return

    h, w = image.shape[:2]
    print(f"이미지 크기: {w}x{h}")
    
    # 자동 구매 개수 판단 (main.py와 동일한 로직)
    if lotto_count is None:
        auto_detected_count = detect_lotto_count_from_region(image)
        print(f"🤖 자동 판단된 구매 개수: {auto_detected_count}개")
        lotto_count = auto_detected_count
    else:
        print(f"👤 사용자 지정 구매 개수: {lotto_count}개")
    
    # 영역 좌표 가져오기 (main.py와 동일한 로직)
    regions = crop_regions_dynamic_coords(h, w, lotto_count)
    
    print(f"\n📐 설정된 OCR 영역 좌표 (lotto_count={lotto_count}):")
    for region_name, ((y1, y2), (x1, x2)) in regions.items():
        print(f"   • {region_name}: ({x1},{y1}) → ({x2},{y2})")
        print(f"     └ 크기: {x2-x1}x{y2-y1} (가로x세로)")
        print(f"     └ 비율: x({x1/w:.1%}-{x2/w:.1%}), y({y1/h:.1%}-{y2/h:.1%})")
    
    # 색상 정의 (BGR 형식)
    colors = {
        "회차발행일": (255, 0, 0),      # 빨강  
        "번호영역": (255, 0, 255),      # 자홍
        "금액": (0, 255, 255),         # 노랑
    }
    
    # 각 영역에 사각형 그리기
    display_image = image.copy()
    for region_name, ((y1, y2), (x1, x2)) in regions.items():
        color = colors.get(region_name, (128, 128, 128))
        cv2.rectangle(display_image, (x1, y1), (x2, y2), color, 3)
        
        # 레이블 추가
        label = f"{region_name}"
        cv2.putText(display_image, label, (x1+5, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    # 구매 개수 정보 추가
    info_text = f"Lotto Count: {lotto_count}"
    cv2.putText(display_image, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 3)
    cv2.putText(display_image, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    # 한글 폰트 설정
    setup_korean_font()
    
    # matplotlib를 사용해서 결과 표시
    print("matplotlib를 사용해서 영역을 표시 중...")
    
    # BGR -> RGB 변환
    display_rgb = cv2.cvtColor(display_image, cv2.COLOR_BGR2RGB)
    original_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 서브플롯 생성
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(f'Lotto Crop Visualization - {os.path.basename(image_path)} (Count: {lotto_count})', fontsize=14)
    
    # 전체 이미지 (영역 표시)
    axes[0, 0].imshow(display_rgb)
    axes[0, 0].set_title('전체 이미지 - 영역 표시')
    axes[0, 0].axis('off')
    
    # 회차발행일 영역
    if "회차발행일" in regions:
        (y1, y2), (x1, x2) = regions["회차발행일"]
        crop_region = original_rgb[y1:y2, x1:x2]
        if crop_region.size > 0:
            axes[0, 1].imshow(crop_region)
            axes[0, 1].set_title(f'회차발행일 영역\n({x1},{y1}) → ({x2},{y2})')
        else:
            axes[0, 1].text(0.5, 0.5, '빈 영역', ha='center', va='center', transform=axes[0, 1].transAxes)
            axes[0, 1].set_title('회차발행일 영역 (빈 영역)')
        axes[0, 1].axis('off')
    
    # 번호영역
    if "번호영역" in regions:
        (y1, y2), (x1, x2) = regions["번호영역"]
        crop_region = original_rgb[y1:y2, x1:x2]
        if crop_region.size > 0:
            axes[1, 0].imshow(crop_region)
            axes[1, 0].set_title(f'번호영역\n({x1},{y1}) → ({x2},{y2})')
        else:
            axes[1, 0].text(0.5, 0.5, '빈 영역', ha='center', va='center', transform=axes[1, 0].transAxes)
            axes[1, 0].set_title('번호영역 (빈 영역)')
        axes[1, 0].axis('off')
    
    # 금액 영역
    if "금액" in regions:
        (y1, y2), (x1, x2) = regions["금액"]
        crop_region = original_rgb[y1:y2, x1:x2]
        if crop_region.size > 0:
            axes[1, 1].imshow(crop_region)
            axes[1, 1].set_title(f'금액 영역\n({x1},{y1}) → ({x2},{y2})')
        else:
            axes[1, 1].text(0.5, 0.5, '빈 영역', ha='center', va='center', transform=axes[1, 1].transAxes)
            axes[1, 1].set_title('금액 영역 (빈 영역)')
        axes[1, 1].axis('off')
    
    plt.tight_layout()
    
    # 저장 버튼 추가
    def save_visualization(event):
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        output_path = f"crop_visualization_{base_name}_count{lotto_count}.jpg"
        cv2.imwrite(output_path, display_image)
        print(f"✅ 시각화 이미지 저장: {output_path}")
    
    # 저장 버튼 추가
    ax_button = plt.axes([0.45, 0.01, 0.1, 0.04])
    button_save = plt.Button(ax_button, '저장')
    button_save.on_clicked(save_visualization)
    
    plt.show()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("🔍 로또 OCR 영역 시각화 도구")
        print("사용법: python visualize_crop.py <image_path> [lotto_count]")
        print("  - lotto_count 생략 시: 자동으로 구매 개수 판단 (main.py와 동일)")
        print("  - lotto_count 지정 시: 해당 개수로 영역 설정")
        print("")
        print("예시:")
        print("  python visualize_crop.py sample.jpg          # 자동 판단")
        print("  python visualize_crop.py sample.jpg 3        # 3개로 지정")
        print("  python visualize_crop.py ../sample-image/1.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    lotto_count = int(sys.argv[2]) if len(sys.argv) > 2 else None
    
    print(f"🔍 이미지 분석: {image_path}")
    if lotto_count is None:
        print(f"🤖 구매 개수: 자동 판단 (main.py 로직과 동일)")
    else:
        print(f"👤 구매 개수: {lotto_count}개 (사용자 지정)")
    print("")
    
    visualize_regions(image_path, lotto_count) 