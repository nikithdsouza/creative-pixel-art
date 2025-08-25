'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Palette, Square, Eraser, RotateCcw, Download, Grid3X3, Settings } from 'lucide-react';

const GRID_SIZE = 30;
const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
  '#808080', '#008000', '#000080', '#800000', '#008080', '#C0C0C0'
];

const STORAGE_KEY = 'pixelArtCanvas';
const HIGH_SCORE_KEY = 'pixelArtHighScore';

// Pattern detection functions
const detectPatterns = (grid) => {
  const patterns = [];
  
  // Detect rectangles
  const rectangles = detectRectangles(grid);
  patterns.push(...rectangles);
  
  // Detect lines
  const lines = detectLines(grid);
  patterns.push(...lines);
  
  // Detect filled areas
  const filledAreas = detectFilledAreas(grid);
  patterns.push(...filledAreas);
  
  return patterns;
};

const detectRectangles = (grid) => {
  const rectangles = [];
  const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (!visited[i][j] && grid[i][j] !== '#FFFFFF') {
        const rect = findRectangle(grid, i, j, visited);
        if (rect && rect.width >= 3 && rect.height >= 3) {
          rectangles.push({
            type: 'Rectangle',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: grid[i][j]
          });
        }
      }
    }
  }
  
  return rectangles;
};

const findRectangle = (grid, startX, startY, visited) => {
  const color = grid[startX][startY];
  let width = 0;
  let height = 0;
  
  // Find width
  for (let j = startY; j < GRID_SIZE && grid[startX][j] === color; j++) {
    width++;
  }
  
  // Find height
  for (let i = startX; i < GRID_SIZE; i++) {
    let validRow = true;
    for (let j = startY; j < startY + width; j++) {
      if (j >= GRID_SIZE || grid[i][j] !== color) {
        validRow = false;
        break;
      }
    }
    if (validRow) {
      height++;
    } else {
      break;
    }
  }
  
  // Mark as visited
  for (let i = startX; i < startX + height; i++) {
    for (let j = startY; j < startY + width; j++) {
      if (i < GRID_SIZE && j < GRID_SIZE) {
        visited[i][j] = true;
      }
    }
  }
  
  return { x: startX, y: startY, width, height };
};

const detectLines = (grid) => {
  const lines = [];
  
  // Horizontal lines
  for (let i = 0; i < GRID_SIZE; i++) {
    let lineStart = -1;
    let currentColor = null;
    
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] !== '#FFFFFF') {
        if (lineStart === -1) {
          lineStart = j;
          currentColor = grid[i][j];
        } else if (grid[i][j] !== currentColor) {
          if (j - lineStart >= 5) {
            lines.push({
              type: 'Horizontal Line',
              x: i,
              y: lineStart,
              length: j - lineStart,
              color: currentColor
            });
          }
          lineStart = j;
          currentColor = grid[i][j];
        }
      } else {
        if (lineStart !== -1 && j - lineStart >= 5) {
          lines.push({
            type: 'Horizontal Line',
            x: i,
            y: lineStart,
            length: j - lineStart,
            color: currentColor
          });
        }
        lineStart = -1;
        currentColor = null;
      }
    }
    
    if (lineStart !== -1 && GRID_SIZE - lineStart >= 5) {
      lines.push({
        type: 'Horizontal Line',
        x: i,
        y: lineStart,
        length: GRID_SIZE - lineStart,
        color: currentColor
      });
    }
  }
  
  // Vertical lines
  for (let j = 0; j < GRID_SIZE; j++) {
    let lineStart = -1;
    let currentColor = null;
    
    for (let i = 0; i < GRID_SIZE; i++) {
      if (grid[i][j] !== '#FFFFFF') {
        if (lineStart === -1) {
          lineStart = i;
          currentColor = grid[i][j];
        } else if (grid[i][j] !== currentColor) {
          if (i - lineStart >= 5) {
            lines.push({
              type: 'Vertical Line',
              x: lineStart,
              y: j,
              length: i - lineStart,
              color: currentColor
            });
          }
          lineStart = i;
          currentColor = grid[i][j];
        }
      } else {
        if (lineStart !== -1 && i - lineStart >= 5) {
          lines.push({
            type: 'Vertical Line',
            x: lineStart,
            y: j,
            length: i - lineStart,
            color: currentColor
          });
        }
        lineStart = -1;
        currentColor = null;
      }
    }
    
    if (lineStart !== -1 && GRID_SIZE - lineStart >= 5) {
      lines.push({
        type: 'Vertical Line',
        x: lineStart,
        y: j,
        length: GRID_SIZE - lineStart,
        color: currentColor
      });
    }
  }
  
  return lines;
};

const detectFilledAreas = (grid) => {
  const areas = [];
  const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (!visited[i][j] && grid[i][j] !== '#FFFFFF') {
        const area = floodFill(grid, i, j, visited, grid[i][j]);
        if (area.size >= 10) {
          areas.push({
            type: 'Filled Area',
            size: area.size,
            color: grid[i][j],
            x: area.minX,
            y: area.minY
          });
        }
      }
    }
  }
  
  return areas;
};

const floodFill = (grid, startX, startY, visited, targetColor) => {
  const stack = [{x: startX, y: startY}];
  let size = 0;
  let minX = startX, minY = startY;
  
  while (stack.length > 0) {
    const {x, y} = stack.pop();
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || 
        visited[x][y] || grid[x][y] !== targetColor) {
      continue;
    }
    
    visited[x][y] = true;
    size++;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    
    stack.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
  }
  
  return {size, minX, minY};
};

const PixelArtCanvas = () => {
  // Initialize grid with white background
  const [grid, setGrid] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#FFFFFF'));
  });
  
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [pixelCount, setPixelCount] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');
  });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showGrid, setShowGrid] = useState(true);
  const [showPatterns, setShowPatterns] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customHex, setCustomHex] = useState('#000000');
  
  // Detect patterns
  const patterns = useMemo(() => detectPatterns(grid), [grid]);
  
  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
  }, [grid]);
  
  // Save high score
  useEffect(() => {
    if (pixelCount > highScore) {
      setHighScore(pixelCount);
      localStorage.setItem(HIGH_SCORE_KEY, pixelCount.toString());
    }
  }, [pixelCount, highScore]);
  
  // Add to history
  const addToHistory = useCallback((newGrid) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newGrid)));
      return newHistory.slice(-10); // Keep only last 10 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
  }, [historyIndex]);
  
  const paintPixel = useCallback((row, col) => {
    if (grid[row][col] !== selectedColor) {
      const newGrid = [...grid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = selectedColor;
      
      addToHistory(grid);
      setGrid(newGrid);
      setPixelCount(prev => prev + 1);
    }
  }, [grid, selectedColor, addToHistory]);
  
  const handlePixelClick = useCallback((row, col) => {
    paintPixel(row, col);
  }, [paintPixel]);
  
  const handleMouseDown = useCallback((row, col) => {
    setIsDrawing(true);
    paintPixel(row, col);
  }, [paintPixel]);
  
  const handleMouseEnter = useCallback((row, col) => {
    if (isDrawing) {
      paintPixel(row, col);
    }
  }, [isDrawing, paintPixel]);
  
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);
  
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setGrid(JSON.parse(JSON.stringify(history[historyIndex])));
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);
  
  const clearCanvas = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#FFFFFF'));
      addToHistory(grid);
      setGrid(newGrid);
    }
  }, [grid, addToHistory]);
  
  const resetScore = useCallback(() => {
    if (window.confirm('Reset your score? This will save your current score as high score if it\'s higher.')) {
      setPixelCount(0);
    }
  }, []);
  
  const exportCanvas = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const pixelSize = 10;
      
      canvas.width = GRID_SIZE * pixelSize;
      canvas.height = GRID_SIZE * pixelSize;
      
      // Fill background white first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw each pixel
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          ctx.fillStyle = grid[i][j];
          ctx.fillRect(j * pixelSize, i * pixelSize, pixelSize, pixelSize);
        }
      }
      
      // Create download link
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'pixel-art.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [grid]);

  const handleHexInputChange = useCallback((e) => {
    let value = e.target.value;
    // Ensure it starts with #
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    // Limit to 7 characters (#RRGGBB)
    if (value.length > 7) {
      value = value.substring(0, 7);
    }
    setCustomHex(value);
    
    // Auto-select color if valid hex
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setSelectedColor(value.toUpperCase());
    }
  }, []);

  const handleColorPickerClose = useCallback(() => {
    setShowColorPicker(false);
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white mb-4">
            Creative Pixel Art
          </h1>
          <p className="text-slate-300 text-lg font-medium">Build on what others have created - every pixel tells a story in this endless creative chain</p>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Canvas */}
          <div className="flex-1">
            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700/50">
              <div 
                className="grid gap-0 mx-auto border-4 border-slate-600/50 rounded-2xl overflow-hidden shadow-2xl bg-white"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  maxWidth: '600px',
                  aspectRatio: '1'
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {grid.map((row, i) =>
                  row.map((color, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`aspect-square cursor-pointer transition-all duration-100 hover:scale-110 hover:z-10 relative ${
                        showGrid ? 'border border-slate-200/30' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePixelClick(i, j)}
                      onMouseDown={() => handleMouseDown(i, j)}
                      onMouseEnter={() => handleMouseEnter(i, j)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="w-full xl:w-96 space-y-6">
            {/* Color Palette */}
            <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Color Palette</h3>
                </div>
                
                {/* Color Picker Toggle */}
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="p-2 bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white rounded-xl transition-all duration-200 transform hover:scale-110"
                  title="Custom Color Picker"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-6 gap-3 mb-4">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 transform hover:scale-110 ${
                      selectedColor === color 
                        ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-400/50' 
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              
              <div className="bg-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
                <Square className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 font-medium">Selected Color:</span>
                <div 
                  className="w-8 h-8 border-2 border-slate-600 rounded-lg shadow-inner"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>
            </div>
            
            {/* Tools */}
            <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl">
                  <Square className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg">Tools</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedColor('#FFFFFF')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    selectedColor === '#FFFFFF' 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  Eraser
                </button>
                
                <button
                  onClick={undo}
                  disabled={historyIndex < 0}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                >
                  <RotateCcw className="w-4 h-4" />
                  Undo
                </button>
                
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    showGrid 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Grid
                </button>
                
                <button
                  onClick={exportCanvas}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom Color Picker Modal */}
        {showColorPicker && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Custom Color Picker</h3>
                <button
                  onClick={handleColorPickerClose}
                  className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-all duration-200"
                >
                  ×
                </button>
              </div>
              
              {/* Color Wheel */}
              <div className="mb-6">
                <label className="block text-slate-300 font-medium mb-3">Choose Color:</label>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value.toUpperCase());
                    setCustomHex(e.target.value.toUpperCase());
                  }}
                  className="w-full h-32 rounded-2xl cursor-pointer border-2 border-slate-600 bg-transparent"
                />
              </div>
              
              {/* Hex Input */}
              <div className="mb-6">
                <label className="block text-slate-300 font-medium mb-3">Or Enter Hex Code:</label>
                <input
                  type="text"
                  value={customHex}
                  onChange={handleHexInputChange}
                  placeholder="#000000"
                  className="w-full bg-slate-700 text-white rounded-2xl px-4 py-3 border-2 border-slate-600 focus:border-cyan-400 focus:outline-none transition-all duration-200 font-mono"
                  maxLength="7"
                />
                <p className="text-slate-400 text-sm mt-2">Format: #RRGGBB (e.g., #FF5733)</p>
              </div>
              
              {/* Preview */}
              <div className="mb-6">
                <label className="block text-slate-300 font-medium mb-3">Preview:</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl border-2 border-slate-600 shadow-inner"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="text-slate-300">
                    <div className="font-mono text-lg">{selectedColor}</div>
                    <div className="text-sm text-slate-400">Current selection</div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleColorPickerClose}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-3 px-6 rounded-2xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Use This Color
                </button>
                <button
                  onClick={handleColorPickerClose}
                  className="px-6 py-3 bg-slate-700 text-slate-300 font-medium rounded-2xl hover:bg-slate-600 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center mt-12 space-y-2">
          <p className="text-slate-300 text-lg">Add your creative touch to the collaborative canvas</p>
          <p className="text-slate-500">Each artist builds upon the last - what story will you continue?</p>
        </div>
      </div>
    </div>
  );
};

export default PixelArtCanvas;
