import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Eye, Play, MousePointer, TrendingUp, Music } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnalyticsStats {
  totalShares: number;
  totalViews: number;
  totalPlays: number;
  totalCtaClicks: number;
  conversionRate: number;
}

interface DailyData {
  date: string;
  views: number;
  plays: number;
  cta_clicks: number;
  shares: number;
}

interface TopSong {
  order_id: string;
  song_title: string;
  views: number;
}

interface PlatformData {
  name: string;
  value: number;
  color: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  facebook: '#1877F2',
  instagram: '#E4405F',
  native: '#6366F1',
  copy: '#8B5CF6',
  direct: '#64748B'
};

const PLATFORM_NAMES: Record<string, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  native: 'Nativo',
  copy: 'Copiar Link',
  direct: 'Direto'
};

const ShareAnalytics = () => {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalShares: 0,
    totalViews: 0,
    totalPlays: 0,
    totalCtaClicks: 0,
    conversionRate: 0
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [topSongs, setTopSongs] = useState<TopSong[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch all analytics data
      const { data: analyticsData, error } = await supabase
        .from('share_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!analyticsData || analyticsData.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate totals
      const shares = analyticsData.filter(a => a.event_type === 'share').length;
      const views = analyticsData.filter(a => a.event_type === 'view').length;
      const plays = analyticsData.filter(a => a.event_type === 'play').length;
      const ctaClicks = analyticsData.filter(a => a.event_type === 'cta_click').length;
      const conversionRate = views > 0 ? (ctaClicks / views) * 100 : 0;

      setStats({
        totalShares: shares,
        totalViews: views,
        totalPlays: plays,
        totalCtaClicks: ctaClicks,
        conversionRate: parseFloat(conversionRate.toFixed(1))
      });

      // Calculate daily data for last 30 days
      const last30Days: DailyData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = analyticsData.filter(a => 
          a.created_at && a.created_at.startsWith(dateStr)
        );
        
        last30Days.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          views: dayData.filter(a => a.event_type === 'view').length,
          plays: dayData.filter(a => a.event_type === 'play').length,
          cta_clicks: dayData.filter(a => a.event_type === 'cta_click').length,
          shares: dayData.filter(a => a.event_type === 'share').length
        });
      }
      setDailyData(last30Days);

      // Calculate top songs by views
      const viewsByOrder: Record<string, number> = {};
      analyticsData
        .filter(a => a.event_type === 'view' && a.order_id)
        .forEach(a => {
          if (a.order_id) {
            viewsByOrder[a.order_id] = (viewsByOrder[a.order_id] || 0) + 1;
          }
        });

      const topOrderIds = Object.entries(viewsByOrder)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      // Fetch song titles for top orders
      if (topOrderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, song_title, music_style')
          .in('id', topOrderIds.map(([id]) => id));

        const topSongsWithTitles: TopSong[] = topOrderIds.map(([orderId, views]) => {
          const order = ordersData?.find(o => o.id === orderId);
          return {
            order_id: orderId,
            song_title: order?.song_title || order?.music_style || `Música ${orderId.slice(0, 6)}`,
            views
          };
        });
        setTopSongs(topSongsWithTitles);
      }

      // Calculate platform breakdown
      const sharesByPlatform: Record<string, number> = {};
      analyticsData
        .filter(a => a.event_type === 'share' && a.platform)
        .forEach(a => {
          const platform = a.platform || 'direct';
          sharesByPlatform[platform] = (sharesByPlatform[platform] || 0) + 1;
        });

      const platformBreakdown: PlatformData[] = Object.entries(sharesByPlatform)
        .map(([name, value]) => ({
          name: PLATFORM_NAMES[name] || name,
          value,
          color: PLATFORM_COLORS[name] || '#64748B'
        }))
        .sort((a, b) => b.value - a.value);

      setPlatformData(platformBreakdown);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Share2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalShares}</p>
                <p className="text-xs text-muted-foreground">Compartilhamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Eye className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPlays}</p>
                <p className="text-xs text-muted-foreground">Reproduções</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <MousePointer className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCtaClicks}</p>
                <p className="text-xs text-muted-foreground">Cliques CTA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📈 Últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  name="Views" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="plays" 
                  name="Plays" 
                  stroke="#22C55E" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="cta_clicks" 
                  name="CTA Clicks" 
                  stroke="#F97316" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="shares" 
                  name="Shares" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Songs & Platform Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Songs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="w-4 h-4" />
              🏆 Top Músicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSongs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível ainda
              </p>
            ) : (
              <div className="space-y-2">
                {topSongs.map((song, index) => (
                  <div key={song.order_id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {song.song_title}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {song.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📱 Plataformas</CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível ainda
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        dataKey="value"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {platformData.map((platform) => {
                    const total = platformData.reduce((acc, p) => acc + p.value, 0);
                    const percentage = total > 0 ? ((platform.value / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={platform.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: platform.color }}
                          />
                          <span className="text-sm">{platform.name}</span>
                        </div>
                        <span className="text-sm font-medium">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShareAnalytics;
