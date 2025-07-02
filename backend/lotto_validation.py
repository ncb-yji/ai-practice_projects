#!/usr/bin/env python3
"""로또 추첨 규칙 기반 검증 시스템"""

from datetime import datetime, timedelta
import requests

def get_first_lotto_date():
    """1회차 추첨일 반환 (2002년 12월 7일 토요일)"""
    return datetime(2002, 12, 7)

def calculate_draw_number_from_date(date_str):
    """날짜로부터 회차 계산 (매주 토요일 추첨 기준)"""
    try:
        # 날짜 파싱 (YYYY-MM-DD 또는 YYYY/MM/DD)
        if isinstance(date_str, str):
            if '/' in date_str:
                target_date = datetime.strptime(date_str, "%Y/%m/%d")
            else:
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            target_date = date_str
        
        first_draw = get_first_lotto_date()
        
        # 첫 추첨일 이전이면 불가능
        if target_date < first_draw:
            return None
        
        # 주차 계산 (7일 단위)
        days_diff = (target_date - first_draw).days
        weeks_diff = days_diff // 7
        
        return 1 + weeks_diff
        
    except (ValueError, TypeError):
        return None

def calculate_draw_date_from_number(draw_number):
    """회차로부터 추첨일 계산"""
    try:
        if not draw_number or draw_number < 1:
            return None
        
        first_draw = get_first_lotto_date()
        
        # 주차 계산 (회차 - 1)
        weeks_to_add = draw_number - 1
        draw_date = first_draw + timedelta(weeks=weeks_to_add)
        
        return draw_date
        
    except (ValueError, TypeError):
        return None

def calculate_draw_number_from_purchase_date(purchase_date_str):
    """구매일로부터 해당 회차 계산 (구매는 추첨일 당일까지 가능)"""
    try:
        # 구매일 파싱
        if '/' in purchase_date_str:
            purchase_date = datetime.strptime(purchase_date_str, "%Y/%m/%d")
        else:
            purchase_date = datetime.strptime(purchase_date_str, "%Y-%m-%d")
        
        # 구매일이 속한 주의 토요일 찾기 (구매는 토요일 당일까지 가능)
        # 일요일부터 다음 토요일까지는 다음 회차 구매 기간
        days_since_sunday = purchase_date.weekday() + 1  # 월=0 → 일=0 변환
        if days_since_sunday == 7:  # 일요일인 경우
            days_since_sunday = 0
        
        # 해당 주의 토요일 계산
        if days_since_sunday == 6:  # 토요일인 경우 (당일 구매)
            saturday = purchase_date
        else:  # 일~금요일인 경우 (다음 토요일까지 구매 가능)
            days_until_saturday = 6 - days_since_sunday
            saturday = purchase_date + timedelta(days=days_until_saturday)
        
        # 해당 토요일의 회차 계산
        return calculate_draw_number_from_date(saturday)
        
    except (ValueError, TypeError):
        return None

def validate_draw_number_with_draw_date(draw_number, draw_date_str):
    """회차와 추첨일의 일치성 검증"""
    try:
        if not draw_number or not draw_date_str:
            return False, "회차 또는 추첨일 정보가 없습니다"
        
        # 회차로부터 계산된 추첨일
        calculated_date = calculate_draw_date_from_number(draw_number)
        if not calculated_date:
            return False, f"회차 {draw_number}로부터 추첨일 계산 실패"
        
        # 주어진 추첨일 파싱
        if '/' in draw_date_str:
            given_date = datetime.strptime(draw_date_str, "%Y/%m/%d")
        else:
            given_date = datetime.strptime(draw_date_str, "%Y-%m-%d")
        
        # 날짜 일치 확인
        if calculated_date.date() == given_date.date():
            return True, f"✅ 회차-추첨일 일치: {draw_number}회 = {calculated_date.strftime('%Y/%m/%d')}"
        else:
            return False, f"❌ 회차-추첨일 불일치: {draw_number}회는 {calculated_date.strftime('%Y/%m/%d')}이어야 함 (실제: {given_date.strftime('%Y/%m/%d')})"
        
    except Exception as e:
        return False, f"회차-추첨일 검증 오류: {e}"

def validate_purchase_date_with_draw_number(purchase_date_str, draw_number):
    """구매일과 회차의 일치성 검증"""
    try:
        if not purchase_date_str or not draw_number:
            return False, "구매일 또는 회차 정보가 없습니다"
        
        # 구매일로부터 계산된 회차
        calculated_draw_number = calculate_draw_number_from_purchase_date(purchase_date_str)
        if not calculated_draw_number:
            return False, f"구매일 {purchase_date_str}로부터 회차 계산 실패"
        
        # 회차 일치 확인
        if calculated_draw_number == draw_number:
            return True, f"✅ 구매일-회차 일치: {purchase_date_str} = {draw_number}회"
        else:
            return False, f"❌ 구매일-회차 불일치: {purchase_date_str}는 {calculated_draw_number}회여야 함 (실제: {draw_number}회)"
        
    except Exception as e:
        return False, f"구매일-회차 검증 오류: {e}"

def validate_ocr_with_draw_rules(ocr_draw_number, ocr_issue_date, latest_lotto_info):
    """OCR 결과를 추첨 규칙 기반으로 검증하고 보정"""
    validation_result = {
        "draw_number_valid": True,
        "issue_date_valid": True,
        "corrected_draw_number": ocr_draw_number,
        "corrected_issue_date": ocr_issue_date,
        "validation_messages": []
    }
    
    if not latest_lotto_info:
        validation_result["validation_messages"].append("⚠️ 최신 로또 정보 없음 - 추첨 규칙 검증 생략")
        return validation_result
    
    print(f"\n🔍 추첨 규칙 기반 이중 검증:")
    
    final_draw_number = validation_result["corrected_draw_number"]
    final_issue_date = validation_result["corrected_issue_date"]
    
    # 1. 회차와 추첨일 일치성 검증 (API에서 가져온 추첨일 사용)
    if final_draw_number and latest_lotto_info.get("draw_date"):
        try:
            # 보정된 회차의 추첨일 조회 (API 호출)
            api_url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={final_draw_number}"
            response = requests.get(api_url, timeout=10)
            if response.status_code == 200:
                api_data = response.json()
                if api_data.get('returnValue') == 'success':
                    api_draw_date = api_data.get('drwNoDate')
                    if api_draw_date:
                        # 회차-추첨일 일치성 검증
                        is_valid, message = validate_draw_number_with_draw_date(final_draw_number, api_draw_date)
                        validation_result["validation_messages"].append(f"   📅 {message}")
                        
                        # 계산된 추첨일과 API 추첨일 비교
                        calculated_date = calculate_draw_date_from_number(final_draw_number)
                        if calculated_date:
                            calc_str = calculated_date.strftime('%Y-%m-%d')
                            if calc_str == api_draw_date:
                                validation_result["validation_messages"].append(f"   ✅ 추첨일 계산 검증: {final_draw_number}회 = {calc_str}")
                            else:
                                validation_result["validation_messages"].append(f"   ⚠️ 추첨일 계산 차이: 계산값 {calc_str} ≠ API값 {api_draw_date}")
                    else:
                        validation_result["validation_messages"].append(f"   ⚠️ {final_draw_number}회 추첨일 API 조회 실패")
                else:
                    validation_result["validation_messages"].append(f"   ⚠️ {final_draw_number}회 API 응답 오류")
            else:
                validation_result["validation_messages"].append(f"   ⚠️ {final_draw_number}회 API 호출 실패")
        except Exception as e:
            validation_result["validation_messages"].append(f"   ❌ 회차-추첨일 검증 오류: {e}")
    
    # 2. 구매일과 회차 일치성 검증
    if final_issue_date and final_draw_number:
        try:
            is_valid, message = validate_purchase_date_with_draw_number(final_issue_date, final_draw_number)
            validation_result["validation_messages"].append(f"   🛒 {message}")
            
            # 구매일로부터 계산된 회차 정보 추가
            calculated_draw_number = calculate_draw_number_from_purchase_date(final_issue_date)
            if calculated_draw_number and calculated_draw_number != final_draw_number:
                validation_result["validation_messages"].append(f"   💡 구매일 기준 추천 회차: {final_issue_date} → {calculated_draw_number}회")
        except Exception as e:
            validation_result["validation_messages"].append(f"   ❌ 구매일-회차 검증 오류: {e}")
    
    return validation_result 