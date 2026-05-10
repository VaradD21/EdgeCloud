import React, { useEffect, useRef } from 'react';

export default function LogViewer({ logs }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-gray-300">
      {logs.length === 0 ? (
        <div className="text-gray-500 italic">Waiting for logs...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
