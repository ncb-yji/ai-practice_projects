import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

// 임시 데이터
const mockAnalysisList = [
  {
    id: 1,
    imageUrl: 'https://via.placeholder.com/300x400',
    date: '2024-03-16',
    numbers: [1, 2, 3, 4, 5, 6],
    type: '자동',
  },
  {
    id: 2,
    imageUrl: 'https://via.placeholder.com/300x400',
    date: '2024-03-15',
    numbers: [7, 14, 21, 28, 35, 42],
    type: '수동',
  },
  {
    id: 3,
    imageUrl: 'https://via.placeholder.com/300x400',
    date: '2024-03-14',
    numbers: [3, 8, 15, 22, 29, 36],
    type: '자동',
  },
];

const AnalysisList = () => {
  const navigate = useNavigate();
  const [selectedAnalysis, setSelectedAnalysis] = useState<typeof mockAnalysisList[0] | null>(null);

  const handleCardClick = (analysis: typeof mockAnalysisList[0]) => {
    setSelectedAnalysis(analysis);
  };

  const handleCloseDialog = () => {
    setSelectedAnalysis(null);
  };

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
            저장된 분석 목록
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            },
            gap: 3
          }}>
            {mockAnalysisList.map((analysis) => (
              <Card key={analysis.id}>
                <CardActionArea onClick={() => handleCardClick(analysis)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={analysis.imageUrl}
                    alt={`Analysis ${analysis.id}`}
                    sx={{ objectFit: 'contain' }}
                  />
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {analysis.date}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {analysis.numbers.map((num) => (
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
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {analysis.type}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      </Container>

      <Dialog
        open={!!selectedAnalysis}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedAnalysis && (
          <>
            <DialogTitle>
              분석 결과 - {selectedAnalysis.date}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <img
                  src={selectedAnalysis.imageUrl}
                  alt="Analysis"
                  style={{ width: '100%', height: 'auto' }}
                />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    선택된 번호
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedAnalysis.numbers.map((num) => (
                      <Chip
                        key={num}
                        label={num}
                        sx={{
                          backgroundColor: num <= 10 ? '#FFD700' :
                            num <= 20 ? '#1E90FF' :
                            num <= 30 ? '#FF6B6B' :
                            num <= 40 ? '#A9A9A9' : '#32CD32',
                          color: num <= 30 ? 'white' : 'black',
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    구매 유형: {selectedAnalysis.type}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default AnalysisList; 