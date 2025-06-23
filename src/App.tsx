import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Home from './pages/Home';
import Capture from './pages/Capture';
import History from './pages/History';
import Statistics from './pages/Statistics';
import AnalysisList from './pages/AnalysisList';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/history" element={<History />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/analysis-list" element={<AnalysisList />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
