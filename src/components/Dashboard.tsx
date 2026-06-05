import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { DatabaseState, ASSET_TYPES } from "../types";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, ShieldAlert, Sparkles, AlertCircle, Calendar } from "lucide-react";

interface DashboardProps {
  db: DatabaseState;
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  theme?: "dark" | "light";
}

export default function Dashboard({ db, activeMemberId, setActiveMemberId, theme = "dark" }: DashboardProps) {
  // Selectable time range state
  const [timeRange, setTimeRange] = useState<"all" | "3m" | "6m" | "1y" | "ytd">("all");

  // Base currency code & symbol
  const baseCurrency = db.settings.baseCurrency;
  const baseCurrencyObj = useMemo(() => {
    return db.currencies.find(c => c.code === baseCurrency) || { code: "CNY", symbol: "¥" };
  }, [db.currencies, baseCurrency]);

  // Helper to fetch conversion rate
  const getRate = (code: string) => {
    const curr = db.currencies.find(c => c.code === code);
    return curr ? curr.rateToBase : 1;
  };

  // Convert an asset amount to base currency
  const getConvertedAmount = (amount: number, code: string) => {
    return amount * getRate(code);
  };

  // Filtered Assets based on select owner perspective
  const filteredAssets = useMemo(() => {
    if (activeMemberId === "all") return db.assets;
    return db.assets.filter(a => a.memberId === activeMemberId);
  }, [db.assets, activeMemberId]);

  // Compute the cutoff date based on the selected time resolution
  const cutoffDateStr = useMemo(() => {
    if (timeRange === "all") return "";
    const now = new Date();
    let cutoff = new Date();
    if (timeRange === "3m") {
      cutoff.setMonth(now.getMonth() - 3);
    } else if (timeRange === "6m") {
      cutoff.setMonth(now.getMonth() - 6);
    } else if (timeRange === "1y") {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else if (timeRange === "ytd") {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    return cutoff.toISOString().split("T")[0]; // YYYY-MM-DD
  }, [timeRange]);

  // Filter current active assets updated within this timeframe (with safe fallback)
  const timeFilteredAssets = useMemo(() => {
    if (!cutoffDateStr) return filteredAssets;
    const matched = filteredAssets.filter(asset => asset.updatedAt >= cutoffDateStr);
    // Graceful fallback to avoid rendering blank charts when no updates occurred
    return matched.length > 0 ? matched : filteredAssets;
  }, [filteredAssets, cutoffDateStr]);

  // Check if fallback state is triggered for current asset charts
  const hasFallbackAssets = useMemo(() => {
    if (!cutoffDateStr) return false;
    const matched = filteredAssets.filter(asset => asset.updatedAt >= cutoffDateStr);
    return matched.length === 0;
  }, [filteredAssets, cutoffDateStr]);

  // Calculate stats on filtered data scope
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    timeFilteredAssets.forEach(asset => {
      const convertedValue = getConvertedAmount(asset.amount, asset.currency);
      const isLiability = ASSET_TYPES[asset.type]?.isLiability || false;
      if (isLiability) {
        totalLiabilities += convertedValue;
      } else {
        totalAssets += convertedValue;
      }
    });

    const netWorth = totalAssets - totalLiabilities;
    const liabilityRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liabilityRatio
    };
  }, [timeFilteredAssets, db.currencies]);

  // Chart Data: Assets by Category (for the Category Pie Chart & Breakdown)
  const categoryChartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    Object.keys(ASSET_TYPES).forEach(type => {
      dataMap[type] = 0;
    });

    timeFilteredAssets.forEach(asset => {
      const convertedValue = getConvertedAmount(asset.amount, asset.currency);
      dataMap[asset.type] = (dataMap[asset.type] || 0) + convertedValue;
    });

    return Object.keys(ASSET_TYPES).map(key => ({
      name: ASSET_TYPES[key].label,
      value: Math.round(dataMap[key]),
      color: ASSET_TYPES[key].color,
      isLiability: ASSET_TYPES[key].isLiability
    })).filter(item => item.value > 0);
  }, [timeFilteredAssets, db.currencies]);

  // Chart Data: Assets by Category broken down explicitly for Assets (Non-liability)
  const categoryAssetsOnlyChartData = useMemo(() => {
    return categoryChartData.filter(item => !item.isLiability);
  }, [categoryChartData]);

  // Chart Data: Assets by Member / Individual (for the Individuals aggregate Bar Chart)
  const memberChartData = useMemo(() => {
    const dataMap: Record<string, { assets: number; netWorth: number }> = {};
    db.members.forEach(m => {
      dataMap[m.id] = { assets: 0, netWorth: 0 };
    });

    const assetsToProcess = activeMemberId === "all" ? timeFilteredAssets : timeFilteredAssets.filter(a => a.memberId === activeMemberId);

    assetsToProcess.forEach(asset => {
      const convertedValue = getConvertedAmount(asset.amount, asset.currency);
      const isLiability = ASSET_TYPES[asset.type]?.isLiability || false;
      const memData = dataMap[asset.memberId] || { assets: 0, netWorth: 0 };
      if (isLiability) {
        memData.netWorth -= convertedValue;
      } else {
        memData.assets += convertedValue;
        memData.netWorth += convertedValue;
      }
      dataMap[asset.memberId] = memData;
    });

    return db.members.map(m => ({
      id: m.id,
      name: m.name,
      assets: Math.round(dataMap[m.id]?.assets || 0),
      netWorth: Math.round(dataMap[m.id]?.netWorth || 0),
      color: m.color
    })).filter(m => m.assets > 0);
  }, [timeFilteredAssets, db.members, db.currencies, activeMemberId]);

  // Calculate the ratio of the active member's current holdings to the family's total active holdings
  const memberHoldingsRatio = useMemo(() => {
    if (activeMemberId === "all") {
      return { assetRatio: 1, liabilityRatio: 1 };
    }

    let familyTotalAssets = 0;
    let familyTotalLiabilities = 0;
    let memberTotalAssets = 0;
    let memberTotalLiabilities = 0;

    db.assets.forEach(asset => {
      const rate = db.currencies.find(c => c.code === asset.currency)?.rateToBase || 1;
      const convertedValue = asset.amount * rate;
      const isLiability = ASSET_TYPES[asset.type]?.isLiability || false;

      if (isLiability) {
        familyTotalLiabilities += convertedValue;
        if (asset.memberId === activeMemberId) {
          memberTotalLiabilities += convertedValue;
        }
      } else {
        familyTotalAssets += convertedValue;
        if (asset.memberId === activeMemberId) {
          memberTotalAssets += convertedValue;
        }
      }
    });

    const assetRatio = familyTotalAssets > 0 ? (memberTotalAssets / familyTotalAssets) : 0;
    const liabilityRatio = familyTotalLiabilities > 0 ? (memberTotalLiabilities / familyTotalLiabilities) : 0;

    return { assetRatio, liabilityRatio };
  }, [db.assets, db.currencies, activeMemberId]);

  // History Trend Chart Data (filtered chronologically by selected window)
  const unfilteredTrendData = useMemo(() => {
    const { assetRatio, liabilityRatio } = memberHoldingsRatio;
    return db.history.map(point => {
      const assets = Math.round(point.assetsTotal * assetRatio);
      const liabilities = Math.round(point.liabilitiesTotal * liabilityRatio);
      return {
        name: point.date,
        "总资产": assets,
        "总负债": liabilities,
        "净资产": assets - liabilities
      };
    });
  }, [db.history, memberHoldingsRatio]);

  const filteredTrendData = useMemo(() => {
    if (timeRange === "all" || unfilteredTrendData.length === 0) return unfilteredTrendData;

    const now = new Date();
    let cutoff = new Date();

    if (timeRange === "3m") {
      cutoff.setMonth(now.getMonth() - 3);
    } else if (timeRange === "6m") {
      cutoff.setMonth(now.getMonth() - 6);
    } else if (timeRange === "1y") {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else if (timeRange === "ytd") {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }

    const cutoffStr = cutoff.toISOString().substring(0, 7); // "YYYY-MM"
    return unfilteredTrendData.filter(point => point.name >= cutoffStr);
  }, [unfilteredTrendData, timeRange]);

  // Financial Health Level Audit
  const healthAnalysis = useMemo(() => {
    const ratio = stats.liabilityRatio;
    if (ratio === 0) {
      return { level: "无债一身轻", badge: "SAFE", color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40", desc: "目前没有记录任何家庭或个人性质负债。资产安全性极佳。建议根据财务需求开启少量低配置杠杆以加速理财增益。" };
    } else if (ratio < 20) {
      return { level: "完美低负债", badge: "EXCELLENT", color: "text-indigo-300 bg-indigo-950/30 border-indigo-900/40", desc: "负债率处于 20% 以下的极低区间。家庭财务极其稳健，抗风险杠杆较低。推荐合理配置收益型资产。" };
    } else if (ratio < 45) {
      return { level: "健康稳健型", badge: "HEALTHY", color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40", desc: "负债率处于 20% - 45% 的黄金分割区间。日常房贷或短期还款压力适中，属于健康的财务杠杆结构。" };
    } else if (ratio < 65) {
      return { level: "杠杆偏高警戒", badge: "WARN", color: "text-amber-400 bg-amber-950/30 border-amber-900/40", desc: "负债率处于 45% - 65% 的略高区间。月供或短期流出压力相对显著，建议合理梳理现金流，避免冲动消费或过度负债操作。" };
    } else {
      return { level: "红线超高负债", badge: "CRITICAL", color: "text-rose-400 bg-rose-950/30 border-rose-900/40", desc: "负债率已经逼近或超过 65%。债务压力较大，容易受突发性现金流中断影响。强烈建议提早偿还部分高息贷款或信用卡，节制支出。" };
    }
  }, [stats.liabilityRatio]);

  return (
    <div className="space-y-4">
      {/* Dynamic Member and Time Range Filtering Compass Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-[#1E293B] p-4 rounded border border-slate-800">
        <div>
          <h2 className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            家庭资产与时间周期维度导航
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">控制特定的数据持有人，或锁定特定时间周期维度中的账目起落大势</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Member Selection group */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800/80 p-1 rounded">
            <button
              id="view-all-members"
              onClick={() => setActiveMemberId("all")}
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wide font-bold rounded uppercase transition-all cursor-pointer ${
                activeMemberId === "all"
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-350"
              }`}
            >
              全部汇总
            </button>
            {db.members.map(member => (
              <button
                key={member.id}
                id={`view-member-${member.id}`}
                onClick={() => setActiveMemberId(member.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
                  activeMemberId === member.id
                    ? "bg-slate-800 text-white border border-slate-700/85 shadow-sm"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: member.color }} />
                <span>{member.name}</span>
              </button>
            ))}
          </div>

          {/* Time range selector group */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800/80 p-1 rounded font-mono">
            {[
              { label: "全部", value: "all" },
              { label: "近3月", value: "3m" },
              { label: "近6月", value: "6m" },
              { label: "近1年", value: "1y" },
              { label: "今年内", value: "ytd" }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as any)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                  timeRange === range.value
                    ? "bg-indigo-600 text-white border border-indigo-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fallback Warning Alert Banner */}
      {hasFallbackAssets && (
        <div id="fallback-warning-banner" className="p-3 bg-amber-950/20 text-amber-300 border border-amber-900/40 flex items-start gap-2.5 text-[11px] leading-relaxed rounded">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase font-sans text-[9px] tracking-widest block text-amber-400">数据时间跨度安全插值回放提示</span>
            在您选定的时间范围内（自 {cutoffDateStr} 至今）没有资产发生过核算或登记更新。
            系统目前已自动为您**回滚呈现名下全部资产的最新有效价值**，以确保统计矩阵及结构比例完整不为空。
          </div>
        </div>
      )}

      {/* Main Core Networth and Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Networth Card */}
        <div id="card-networth" className="relative p-4 rounded bg-[#10B981]/15 text-white border border-[#10B981]/30 overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Wallet className="w-20 h-20 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-sans tracking-wider text-emerald-400 uppercase">01 / 核准纯净财富净值</span>
            <span className="px-1.5 py-0.2 bg-[#10B981]/20 text-[#10B981] text-[9px] font-mono font-bold rounded border border-[#10B981]/30">
              人民币
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-sm font-bold text-emerald-400">{baseCurrencyObj.symbol}</span>
            <span className="text-2xl font-black tracking-tight font-mono text-emerald-300">
              {stats.netWorth.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-2 flex items-center gap-1 font-sans">
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>家庭纯净资产安全水位</span>
          </p>
        </div>

        {/* Total Assets Card */}
        <div id="card-total-assets" className="p-4 rounded bg-[#1E293B] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold font-sans tracking-wider uppercase">02 / 登记名下正资产总值</span>
            <div className="w-6 h-6 rounded bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-sm font-bold text-slate-500">{baseCurrencyObj.symbol}</span>
            <span className="text-2xl font-black font-mono text-slate-200">
              {stats.totalAssets.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-sans flex items-center gap-1">
            <span>未扣除家庭负债的原始本资产盘面</span>
          </div>
        </div>

        {/* Total Liabilities Card */}
        <div id="card-total-liabilities" className="p-4 rounded bg-[#1E293B] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold font-sans tracking-wider uppercase">03 / 负债汇总科目额</span>
            <div className="w-6 h-6 rounded bg-rose-950/40 border border-rose-900/50 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-sm font-bold text-rose-500/75">{baseCurrencyObj.symbol}</span>
            <span className="text-2xl font-black font-mono text-rose-400">
              {stats.totalLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-rose-400/80 font-sans flex items-center gap-1">
            <span className="bg-rose-950 px-1 py-0.2 rounded border border-rose-900/60 font-bold">-{((stats.totalLiabilities / (stats.totalAssets || 1)) * 100).toFixed(1)}%</span>
            <span className="text-slate-500">资产整体负债杠杆占比值</span>
          </div>
        </div>

        {/* Asset-Liability Ratio Card */}
        <div id="card-liability-ratio" className="p-4 rounded bg-[#1E293B] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold font-sans tracking-wider uppercase">04 / 债务杠杆级别</span>
            <div className={`w-6 h-6 rounded border flex items-center justify-center ${stats.liabilityRatio > 50 ? "bg-amber-950/30 border-amber-900/60" : "bg-indigo-950/30 border-indigo-900/60"}`}>
              <ShieldAlert className={`w-3.5 h-3.5 ${stats.liabilityRatio > 50 ? "text-amber-400" : "text-indigo-400"}`} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black font-mono text-slate-200">
                {stats.liabilityRatio.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2.5 overflow-hidden border border-slate-850">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.liabilityRatio < 30
                    ? "bg-emerald-500"
                    : stats.liabilityRatio < 50
                    ? "bg-indigo-500"
                    : stats.liabilityRatio < 65
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(stats.liabilityRatio, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-1 text-[9px] text-slate-500 font-sans flex justify-between">
            <span>负债警告预警线: &gt; 50.0%</span>
            <span>核准财务评级: 稳健范围</span>
          </div>
        </div>
      </div>

      {/* Financial Health Analysis Bar */}
      <div id="financial-health-banner" className={`p-4 rounded flex items-start gap-3 border ${healthAnalysis.color}`}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold font-sans uppercase tracking-wider">
              家庭财务杠杆与债务水平安全评估: {healthAnalysis.level}
            </h4>
            <span className="px-1 text-[8px] font-sans bg-slate-900 text-slate-400 border border-slate-800 rounded">{healthAnalysis.badge}</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed font-sans">
            {healthAnalysis.desc}
          </p>
        </div>
      </div>

      {/* Primary Visual Charts Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 1: Unfiltered & Filtered Net Worth History Trend Timeline (8 Columns on desktop) */}
        <div className="lg:col-span-8 bg-[#1E293B] p-4 rounded border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                {activeMemberId === "all"
                  ? "家庭资产负债变动的历史折线大势"
                  : `${db.members.find(m => m.id === activeMemberId)?.name || ""}资产负债变动的历史折线大势`}
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {activeMemberId === "all"
                  ? "展示家庭净资产、总资产和总负债在所选窗口中的复合成长走势"
                  : "展示该成员的净资产、总资产和总负债在所选窗口中的复合成长走势"}
              </p>
            </div>
            <div className="text-[9px] text-[#10B981] font-bold font-sans bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded tracking-widest uppercase">
              {timeRange === "all" ? "全部历史期限" : `${timeRange.toUpperCase()} 过滤周期`}
            </div>
          </div>
          
          <div className="h-64 sm:h-72 w-full mt-2">
            {filteredTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredTrendData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#CBD5E1" : "#334155"} opacity={0.3} vertical={false} />
                  <XAxis dataKey="name" stroke={theme === "light" ? "#475569" : "#64748b"} fontSize={9} tickLine={false} />
                  <YAxis stroke={theme === "light" ? "#475569" : "#64748b"} fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: theme === "light" ? '#FFFFFF' : '#1E293B', 
                      borderRadius: '4px', 
                      borderColor: theme === "light" ? '#CBD5E1' : '#475569', 
                      fontSize: '11px', 
                      color: theme === "light" ? '#0F172A' : '#f1f5f9' 
                    }}
                    itemStyle={{ color: theme === "light" ? '#1E293B' : '#E2E8F0' }}
                    labelStyle={{ color: theme === "light" ? '#475569' : '#94A3B8', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${baseCurrencyObj.symbol}${parseFloat(value).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: theme === "light" ? '#475569' : '#94A3B8' }} />
                  <Area type="monotone" dataKey="净资产" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNetWorth)" />
                  <Area type="monotone" dataKey="总资产" stroke="#6366f1" strokeWidth={1} fillOpacity={1} fill="url(#colorAssets)" />
                  <Area type="monotone" dataKey="总负债" stroke="#f43f5e" strokeWidth={1} fillOpacity={1} fill="url(#colorLiabilities)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-550 text-xs font-sans border border-dashed border-slate-800 rounded">
                <span>在所选时间窗口参数中，未检测到任何历史净资产快照数据</span>
                <span className="text-[11px] text-slate-600 mt-1">请通过右上角进入记账系统设置并追加记录至少一笔财务快照以绘图</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Interactive Categorical Allocation Pie Chart (4 Columns on desktop) */}
        <div id="card-category-pie" className="lg:col-span-4 bg-[#1E293B] p-4 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
              名下各正向资产及物权科目占比饼图
            </h3>
            <p className="text-[10.5px] text-slate-500 mt-0.5">按正向资产类别统计的资金成分流向配比</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center my-4 font-mono">
            {categoryAssetsOnlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryAssetsOnlyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryAssetsOnlyChartData.map((entry, index) => (
                      <Cell key={`cell-category-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: theme === "light" ? '#FFFFFF' : '#1E293B', 
                      borderRadius: '4px', 
                      borderColor: theme === "light" ? '#CBD5E1' : '#475569', 
                      fontSize: '11px', 
                      color: theme === "light" ? '#0F172A' : '#f1f5f9' 
                    }}
                    formatter={(value: any, name: any) => {
                      const totalVal = categoryAssetsOnlyChartData.reduce((acc, cur) => acc + cur.value, 0);
                      const percent = totalVal > 0 ? ((parseFloat(value) / totalVal) * 100).toFixed(1) : "0";
                      return [`${baseCurrencyObj.symbol}${parseFloat(value).toLocaleString()} (${percent}%)`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-550 text-xs font-sans">暂无配属的正向资产底账登记</div>
            )}
          </div>

          {/* Pie Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-800 pt-3 max-h-24 overflow-y-auto font-mono scrollbar-thin">
            {categoryAssetsOnlyChartData.map((item) => {
              const totalVal = categoryAssetsOnlyChartData.reduce((acc, cur) => acc + cur.value, 0);
              const percent = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : "0";
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-350 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-slate-300">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-400 shrink-0 select-all">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Detailed Class Taxonomy Breakdown progress bars (12 Columns on desktop) */}
        <div id="card-taxonomy-breakdown" className="lg:col-span-12 bg-[#1E293B] p-4 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase">家庭各账户和资产负债科目分类维度详情</h3>
            <p className="text-[10.5px] text-slate-500 mt-0.5">按正向资产以及负债科目划分，核查各项底账深度要素</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pr-1">
            {Object.keys(ASSET_TYPES).map(key => {
              const data = categoryChartData.find(d => d.name === ASSET_TYPES[key].label) || { value: 0 };
              const isAssetPos = !ASSET_TYPES[key].isLiability;
              const totalDenominator = isAssetPos ? stats.totalAssets : stats.totalLiabilities;
              const percentage = totalDenominator > 0 ? ((data.value / totalDenominator) * 100).toFixed(1) : "0.0";
              
              return (
                <div key={key} className="p-2.5 border border-slate-800/85 bg-slate-900/60 rounded flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_TYPES[key].color }} />
                      <span className="text-[10.5px] font-bold text-slate-300 font-sans truncate">{ASSET_TYPES[key].label}</span>
                    </div>
                    <span className={`text-[8px] px-1 rounded-sm font-black font-sans shrink-0 tracking-wide uppercase ${isAssetPos ? "text-emerald-400 bg-emerald-950/20 border border-emerald-900/35" : "text-rose-400 bg-rose-950/20 border border-rose-900/35"}`}>
                      {isAssetPos ? "正收益资产" : "负债科目"}
                    </span>
                  </div>
                  
                  <div className="mt-2.5 flex items-baseline justify-between font-mono">
                    <span className="text-[9.5px] text-slate-500">
                      {percentage}% ({isAssetPos ? "正资产比率" : "负债占比值"})
                    </span>
                    <span className="font-bold text-slate-200 text-[11px]">
                      {baseCurrencyObj.symbol}{data.value.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="w-full bg-[#0F172A] h-1 rounded-full mt-2 overflow-hidden border border-slate-800/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: ASSET_TYPES[key].color,
                        width: `${percentage}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
