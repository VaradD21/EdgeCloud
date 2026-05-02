import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MetricsChart({ type, color, dataKey, liveValue }) {
  // Generate initial fake 24h data or empty history
  const initialData = useMemo(() => {
    const points = [];
    const now = new Date();
    let baseValue = type === 'cpu' ? 0 : 0;
    
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      // Add some random noise and a slight trend
      baseValue = Math.max(5, Math.min(type === 'cpu' ? 95 : type === 'ram' ? 1024 : 200, baseValue + (Math.random() - 0.4) * (type === 'cpu' ? 10 : 50)));
      
      // Add a random spike sometimes
      if (Math.random() > 0.9) {
        baseValue += type === 'cpu' ? 40 : 200;
      }
      
      points.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [dataKey]: Math.round(baseValue)
      });
    }
    return points;
  }, [type, dataKey]);

  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (liveValue === undefined || liveValue === null) return;
    
    setData(prev => {
      const newPoints = [...prev];
      const now = new Date();
      newPoints.push({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        [dataKey]: liveValue
      });
      if (newPoints.length > 25) newPoints.shift();
      return newPoints;
    });
  }, [liveValue, dataKey]);

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={10} 
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={10} 
            tickFormatter={(value) => type === 'ram' ? `${value}MB` : type === 'cpu' ? `${value}%` : value}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fillOpacity={1} 
            fill={`url(#color-${dataKey})`} 
            strokeWidth={2}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
