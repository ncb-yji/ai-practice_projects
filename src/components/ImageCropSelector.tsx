import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert, Stack, CircularProgress } from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { getApiUrl } from '../config/api';

interface Point {
  x: number;
  y: number;
}

interface ImageCropSelectorProps {
  imageUrl: string;
  onComplete: (result: any) => void;
  onCancel: () => void;
  onReset?: () => void;
  originalFile: File;
}

const ImageCropSelector: React.FC<ImageCropSelectorProps> = ({
  imageUrl,
  onComplete,
  onCancel,
  onReset,
  originalFile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImageSize({ width: image.width, height: image.height });
      setImageLoaded(true);
      setCorners([
        { x: 0, y: 0 },
        { x: image.width, y: 0 },
        { x: image.width, y: image.height },
        { x: 0, y: image.height },
      ]);
    };
    image.src = imageUrl;
    imageRef.current = image;
  }, [imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageLoaded) return;

    const maxWidth = 800;
    const maxHeight = 600;
    const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height);
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.drawImage(imageRef.current!, 0, 0, displayWidth, displayHeight);

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00ff00';

    corners.forEach((corner, index) => {
      const x = corner.x * scale;
      const y = corner.y * scale;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`${index + 1}`, x + 12, y + 4);
      ctx.fillStyle = '#00ff00';
    });

    ctx.beginPath();
    ctx.moveTo(corners[0].x * scale, corners[0].y * scale);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x * scale, corners[i].y * scale);
    }
    ctx.closePath();
    ctx.stroke();
  };

  useEffect(() => {
    drawCanvas();
  }, [corners, imageLoaded]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageSize.width / canvas.width;
    const scaleY = imageSize.height / canvas.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const findClosestCorner = (mousePos: Point): number => {
    let closestIndex = -1;
    let minDistance = Infinity;
    corners.forEach((corner, index) => {
      const distance = Math.sqrt(Math.pow(mousePos.x - corner.x, 2) + Math.pow(mousePos.y - corner.y, 2));
      if (distance < minDistance && distance < 50) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    return closestIndex;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    const cornerIndex = findClosestCorner(mousePos);
    if (cornerIndex !== -1) {
      setIsDragging(true);
      setDragIndex(cornerIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragIndex === -1) return;
    const mousePos = getMousePos(e);
    const newCorners = [...corners];
    newCorners[dragIndex] = mousePos;
    setCorners(newCorners);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragIndex(-1);
  };

  const handleCrop = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', originalFile);
      const cornersData = { corners: corners.map(corner => [corner.x, corner.y]) };
      formData.append('corners', JSON.stringify(cornersData));

      const response = await fetch(getApiUrl('/transform-and-analyze'), {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      // onComplete를 통해 성공/실패 결과를 부모로 전달
      onComplete(result);

    } catch (err) {
      // 네트워크 에러 등 fetch 자체의 실패 처리
      onComplete({ success: false, message: '서버와 통신할 수 없습니다. 서버가 실행 중인지 확인해주세요.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    console.log('🔄 이미지 자르기 초기화 버튼 클릭됨'); // 디버깅 로그
    
    // 완전 초기화 함수가 제공된 경우 그것을 실행
    if (onReset) {
      console.log('🔄 완전 초기화 실행됨');
      onReset();
      return;
    }
    
    // 기본 동작: 선택 영역만 초기화
    if (imageLoaded) {
      const newCorners = [
        { x: 0, y: 0 },
        { x: imageSize.width, y: 0 },
        { x: imageSize.width, y: imageSize.height },
        { x: 0, y: imageSize.height },
      ];
      console.log('📐 모서리 좌표 초기화:', newCorners);
      setCorners(newCorners);
      
      // 강제로 캔버스 다시 그리기 (더 안정적인 방법)
      requestAnimationFrame(() => {
        drawCanvas();
        console.log('✅ 캔버스가 다시 그려졌습니다');
      });
    } else {
      console.warn('⚠️ 이미지가 아직 로드되지 않았습니다');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>분석 영역 선택</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        이미지의 4개 모서리를 드래그하여 분석할 영역을 선택하세요. 기울기가 자동으로 보정됩니다.
      </Typography>

      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <canvas
          ref={canvasRef}
          style={{
            border: '2px solid #ccc',
            cursor: isDragging ? 'grabbing' : 'grab',
            maxWidth: '100%',
            height: 'auto',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onMouseUp={handleMouseUp}
        />
      </Box>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button onClick={onCancel} variant="outlined">
          취소
        </Button>
        <Button onClick={handleReset} variant="outlined" startIcon={<RestartAltIcon />}>
          {onReset ? '처음부터 다시' : '영역 초기화'}
        </Button>
        <Button onClick={handleCrop} variant="contained" startIcon={<CropIcon />} disabled={isProcessing}>
          {isProcessing ? <CircularProgress size={24} /> : '분석 실행'}
        </Button>
      </Stack>
    </Paper>
  );
};

export default ImageCropSelector; 