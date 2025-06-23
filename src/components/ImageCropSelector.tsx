import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Stack,
} from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface Point {
  x: number;
  y: number;
}

interface ImageCropSelectorProps {
  imageUrl: string;
  onCropComplete: (croppedImageBlob: Blob, analysisResult: any) => void;
  onCancel: () => void;
  originalFile: File;
}

const ImageCropSelector: React.FC<ImageCropSelectorProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
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

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImageSize({ width: image.width, height: image.height });
      setImageLoaded(true);
      
      // 기본 모서리 위치 설정 (이미지의 4개 모서리)
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

    // 캔버스 크기 설정
    const maxWidth = 800;
    const maxHeight = 600;
    const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height);
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // 이미지 그리기
    ctx.drawImage(imageRef.current!, 0, 0, displayWidth, displayHeight);

    // 모서리 그리기
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00ff00';

    // 모서리 점들 그리기
    corners.forEach((corner, index) => {
      const x = corner.x * scale;
      const y = corner.y * scale;
      
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // 모서리 번호 표시
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`${index + 1}`, x + 12, y + 4);
      ctx.fillStyle = '#00ff00';
    });

    // 모서리 연결선 그리기
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
      const distance = Math.sqrt(
        Math.pow(mousePos.x - corner.x, 2) + Math.pow(mousePos.y - corner.y, 2)
      );
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
    
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('file', originalFile);
      
      // 모서리 좌표를 JSON으로 추가
      const cornersData = {
        corners: corners.map(corner => [corner.x, corner.y])
      };
      formData.append('corners', JSON.stringify(cornersData));

      // 백엔드 API 호출
      const response = await fetch('http://localhost:8000/transform-and-analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // 보정된 이미지를 Blob으로 변환
        if (result.transformed_image) {
          // base64 데이터 URL을 Blob으로 변환
          const response = await fetch(result.transformed_image);
          const blob = await response.blob();
          
          onCropComplete(blob, result);
        } else {
          console.error('보정된 이미지가 없습니다');
          alert('이미지 처리에 실패했습니다: 보정된 이미지가 결과에 포함되지 않았습니다.');
        }
      } else {
        console.error('원근 변환 실패');
        let errorMessage = '서버에서 알 수 없는 오류가 발생했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('서버 에러 응답 파싱 실패:', e);
          errorMessage = response.statusText;
        }
        alert(`이미지 처리에 실패했습니다: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imageLoaded) {
      setCorners([
        { x: 0, y: 0 },
        { x: imageSize.width, y: 0 },
        { x: imageSize.width, y: imageSize.height },
        { x: 0, y: imageSize.height },
      ]);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        분석 영역 선택
      </Typography>
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
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          • 초록색 점들을 드래그하여 모서리 위치를 조정하세요
          • 번호 1-4는 각 모서리를 나타냅니다
          • 선택한 영역이 자동으로 정면으로 보정됩니다
          • 기울어진 로또 용지도 정확하게 분석할 수 있습니다
        </Typography>
      </Alert>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={isProcessing}
        >
          초기화
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isProcessing}
        >
          취소
        </Button>
        <Button
          variant="contained"
          startIcon={<CropIcon />}
          onClick={handleCrop}
          disabled={isProcessing}
        >
          {isProcessing ? '처리 중...' : '영역 선택 완료'}
        </Button>
      </Stack>
    </Paper>
  );
};

export default ImageCropSelector; 