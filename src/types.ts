export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Asset {
  id: string;
  memberId: string;
  name: string;
  type: string;
  amount: number;
  currency: string;
  remark: string;
  updatedAt: string;
  maturityDate?: string;
  stockCode?: string;
  shares?: number;
  stockPrice?: number;
}

export interface Currency {
  code: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
}

export interface HistoryPoint {
  date: string;
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

export interface DatabaseState {
  members: Member[];
  assets: Asset[];
  currencies: Currency[];
  history: HistoryPoint[];
  settings: {
    baseCurrency: string;
    adminPassword?: string;
  };
}

export const ASSET_TYPES: Record<string, { label: string; color: string; isLiability: boolean }> = {
  cash: { label: "活期", color: "#3b82f6", isLiability: false },
  fund: { label: "投资-基金", color: "#06b6d4", isLiability: false },
  stock: { label: "投资-股票", color: "#ec4899", isLiability: false },
  estate: { label: "不动产", color: "#8b5cf6", isLiability: false },
  gold: { label: "贵金属-黄金", color: "#d97706", isLiability: false },
  silver: { label: "贵金属-银", color: "#94a3b8", isLiability: false },
  liability: { label: "房贷", color: "#ef4444", isLiability: true },
  equity: { label: "股权", color: "#10b981", isLiability: false },
  pension: { label: "个人养老", color: "#f59e0b", isLiability: false },
  provident: { label: "隐形资产-公积金", color: "#14b8a6", isLiability: false },
  medical: { label: "隐形资产-医保", color: "#38bdf8", isLiability: false },
  deposit: { label: "定期存款", color: "#22c55e", isLiability: false }
};

export const MEMBER_ROLES = [
  { value: "father", label: "爸爸" },
  { value: "mother", label: "妈妈" },
  { value: "child", label: "子女" },
  { value: "grandparent", label: "长辈" },
  { value: "public", label: "公共账户" },
  { value: "other", label: "其他" }
];
