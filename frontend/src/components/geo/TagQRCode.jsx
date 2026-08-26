import { Download, Printer } from 'lucide-react';
import { useRef } from 'react';

// Simple QR code generator using a canvas-based approach
// For production, you'd use a proper QR library, but this creates a visual placeholder
function generateQRMatrix(text, size = 21) {
  // Simple hash-based pseudo-QR pattern for visual representation
  const matrix = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      // Fixed finder patterns in corners
      if (
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7)
      ) {
        // Finder pattern logic
        const isEdge =
          x === 0 || y === 0 || x === 6 || y === 6 ||
          x === size - 1 || y === size - 7 || x === size - 7 || y === size - 1;
        const isInner =
          (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
          (x >= size - 5 && x <= size - 3 && y >= 2 && y <= 4) ||
          (x >= 2 && x <= 4 && y >= size - 5 && y <= size - 3);
        row.push(isEdge || isInner ? 1 : 0);
      } else {
        // Pseudo-random data based on hash
        hash = ((hash << 13) ^ hash) & 0x7fffffff;
        row.push(hash % 3 === 0 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

export default function TagQRCode({ tagCode, animalTag, showPrint = true }) {
  const canvasRef = useRef(null);
  const matrix = generateQRMatrix(tagCode);
  const cellSize = 6;
  const padding = 20;
  const canvasSize = matrix.length * cellSize + padding * 2;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw QR code
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR modules
    ctx.fillStyle = '#000000';
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          ctx.fillRect(
            padding + x * cellSize,
            padding + y * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    // Draw text below
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tagCode, canvasSize / 2, canvasSize + 20);
    ctx.font = '12px sans-serif';
    ctx.fillText(`Animal: ${animalTag}`, canvasSize / 2, canvasSize + 40);

    // Download
    const link = document.createElement('a');
    link.download = `tag-${tagCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw QR for print
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          ctx.fillRect(
            padding + x * cellSize,
            padding + y * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Tag ${tagCode}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: monospace; }
        .tag-label { text-align: center; margin-top: 10px; }
        .tag-code { font-size: 18px; font-weight: bold; }
        .animal-tag { font-size: 14px; color: #666; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <img src="${canvas.toDataURL('image/png')}" width="200" height="200" />
      <div class="tag-label">
        <div class="tag-code">${tagCode}</div>
        <div class="animal-tag">Animal: ${animalTag}</div>
      </div>
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hidden canvas for generation */}
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize + 50}
        className="hidden"
      />

      {/* Visual QR display */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block">
        <svg
          viewBox={`0 0 ${matrix.length} ${matrix.length}`}
          width={168}
          height={168}
          className="block"
        >
          <rect width={matrix.length} height={matrix.length} fill="white" />
          {matrix.map((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1}
                  height={1}
                  fill="black"
                />
              ) : null
            )
          )}
        </svg>
        <div className="text-center mt-2">
          <p className="font-mono font-bold text-sm text-gray-900">{tagCode}</p>
          <p className="text-xs text-gray-500">{animalTag}</p>
        </div>
      </div>

      {/* Action buttons */}
      {showPrint && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Tag
          </button>
        </div>
      )}
    </div>
  );
}
