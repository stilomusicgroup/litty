import React, { useEffect, useState } from 'react';
import { useStreamAnalytics } from '@/hooks/use-stream-analytics';
import { getManySongDetails } from '@/lib/collections/songDetails';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Play, Users, Calendar, Music } from 'lucide-react';

const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const CYAN = '#00D4FF';

export const StreamAnalyticsSection: React.FC = () => {
  const { data, loading, error } = useStreamAnalytics();
  const [songTitles, setSongTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data?.topSongs?.length) return;
    let mounted = true;
    (async () => {
      const ids = data.topSongs.map((s) => s.songId);
      const details = await getManySongDetails('limit 50');
      if (!mounted) return;
      const map: Record<string, string> = {};
      for (const d of details) {
        if (ids.includes(d.id)) {
          map[d.id] = d.title || d.id;
        }
      }
      setSongTitles(map);
    })();
    return () => { mounted = false; };
  }, [data?.topSongs]);

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading analytics...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" style={{ color: '#ef4444' }}>{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No data available</div>
    );
  }

  const summaryCards = [
    { label: 'Total Streams', value: data.totalStreams.toLocaleString(), icon: Play, color: PURPLE },
    { label: 'Unique Listeners', value: data.uniqueListeners.toLocaleString(), icon: Users, color: GREEN },
    { label: 'Streams Today', value: data.streamsToday.toLocaleString(), icon: Calendar, color: CYAN },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
            >
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-lg font-black text-white">{card.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Streams Chart */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <h3 className="text-sm font-bold text-white mb-4">Daily Streams (Last 30 Days)</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data.dailyStreams}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgba(220,214,240,0.4)' }}
                tickFormatter={(v: string) => v.slice(5)}
                stroke="rgba(139,92,246,0.2)"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(220,214,240,0.4)' }}
                stroke="rgba(139,92,246,0.2)"
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,5,30,0.95)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '0.75rem',
                  fontSize: 12,
                  color: '#e0d7ff',
                }}
              />
              <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Songs Table */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <h3 className="text-sm font-bold text-white mb-4">Top Songs by Streams</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>Rank</th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>Song</th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'rgba(220,214,240,0.4)' }}>Streams</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {data.topSongs.map((song, i) => (
                <tr key={song.songId} style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <td className="py-3 text-sm font-bold" style={{ color: 'rgba(220,214,240,0.5)' }}>#{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Music size={14} style={{ color: PURPLE }} />
                      <span className="text-sm text-white truncate max-w-[200px]">
                        {songTitles[song.songId] || song.songId.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-sm font-bold text-right" style={{ color: '#e0d7ff' }}>{song.count.toLocaleString()}</td>
                </tr>
              ))}
              {data.topSongs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No streams recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
