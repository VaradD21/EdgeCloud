import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ResourceGraph({ data }) {
  // Format data for recharts
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    cpu: d.cpu_percent,
    ram: d.ram_mb_used
  }));

  return (
    <div className="h-64 w-full bg-white p-4 rounded-lg border border-gray-200">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#2563eb" name="CPU %" dot={false} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="ram" stroke="#16a34a" name="RAM MB" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
