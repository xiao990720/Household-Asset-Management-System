import React, { useState, useMemo } from "react";
import { DatabaseState, Asset, ASSET_TYPES } from "../types";
import { Search, Plus, Trash2, Edit2, X, Filter, Calendar, HelpCircle, Check, Info } from "lucide-react";

interface AssetListProps {
  db: DatabaseState;
  onSaveState: (newState: DatabaseState) => void;
  activeMemberId: string;
}

export default function AssetList({ db, onSaveState, activeMemberId }: AssetListProps) {
  // Base currency code & symbol
  const baseCurrency = db.settings.baseCurrency;
  const baseCurrencyObj = useMemo(() => {
    return db.currencies.find(c => c.code === baseCurrency) || { code: "CNY", symbol: "¥" };
  }, [db.currencies, baseCurrency]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMemberId, setFilterMemberId] = useState(activeMemberId || "all");
  const [filterType, setFilterType] = useState("all");

  // Sort State
  const [sortField, setSortField] = useState<"name" | "member" | "type" | "amount" | "baseValue" | "updatedAt">("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Handle Sort Toggle
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc (most useful for times, high values, etc)
    }
  };

  // Edit / Add Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formMemberId, setFormMemberId] = useState("");
  const [formType, setFormType] = useState("cash");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formCurrency, setFormCurrency] = useState("CNY");
  const [formRemark, setFormRemark] = useState("");
  const [formMaturityDate, setFormMaturityDate] = useState("");
  const [formInterestRate, setFormInterestRate] = useState<number | "">("");
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [formStockCode, setFormStockCode] = useState("");
  const [formShares, setFormShares] = useState<number | "">("");
  const [formStockPrice, setFormStockPrice] = useState<number | "">("");
  const [isQueryingStock, setIsQueryingStock] = useState(false);

  // Custom dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      isDanger: options.isDanger,
      onConfirm: () => {
        options.onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleLookupStockPrice = async (codeToQuery?: string) => {
    const targetCode = (codeToQuery || formStockCode).trim();
    if (!targetCode) {
      alert("请先输入股票/股权代码！");
      return;
    }
    
    setIsQueryingStock(true);
    try {
      const res = await fetch(`/api/stock/price?code=${encodeURIComponent(targetCode)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "获取股票价格失败");
        return;
      }
      
      // Auto-set the name if it's empty or defaults or was custom filled
      setFormName(data.name);
      
      setFormStockCode(data.code.toUpperCase());
      setFormStockPrice(data.price);
      
      const sh = parseFloat(formShares as string);
      if (!isNaN(sh) && sh > 0) {
        setFormAmount(parseFloat((sh * data.price).toFixed(2)));
      }
    } catch (err: any) {
      alert("联络股票查询接口失败: " + err.message);
    } finally {
      setIsQueryingStock(false);
    }
  };

  // Keep filter synced with parent member scope if parent changes
  useMemo(() => {
    setFilterMemberId(activeMemberId);
  }, [activeMemberId]);

  // Real-time conversion preview
  const liveConversionPreview = useMemo(() => {
    const amt = parseFloat(formAmount as string) || 0;
    const curr = db.currencies.find(c => c.code === formCurrency);
    const rate = curr ? curr.rateToBase : 1;
    return Math.round(amt * rate);
  }, [formAmount, formCurrency, db.currencies]);

  // Handle open form for ADD
  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormName("");
    setFormMemberId(db.members[0]?.id || "");
    setFormType("cash");
    setFormAmount("");
    setFormCurrency("CNY");
    setFormRemark("");
    setFormMaturityDate("");
    setFormInterestRate("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStockCode("");
    setFormShares("");
    setFormStockPrice("");
    setIsFormOpen(true);
  };

  // Handle open form for EDIT
  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormMemberId(asset.memberId);
    setFormType(asset.type);
    setFormAmount(asset.amount);
    setFormCurrency(asset.currency);
    setFormRemark(asset.remark);
    setFormMaturityDate(asset.maturityDate || "");
    setFormInterestRate(asset.interestRate !== undefined ? asset.interestRate : "");
    setFormDate(asset.updatedAt);
    setFormStockCode(asset.stockCode || "");
    setFormShares(asset.shares !== undefined ? asset.shares : "");
    setFormStockPrice(asset.stockPrice !== undefined ? asset.stockPrice : "");
    setIsFormOpen(true);
  };

  // Save asset (new or edited)
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMemberId) {
      alert("请填写完整的资产/登记信息与所属成员！");
      return;
    }

    if ((formType === "deposit" || formType === "liability") && !formMaturityDate) {
      alert(`${ASSET_TYPES[formType].label}科目必须填写到期时间！`);
      return;
    }

    let amt = parseFloat(formAmount.toString());
    const isStockOrEquity = formType === "equity" || formType === "stock";

    if (isStockOrEquity) {
      const sh = parseFloat(formShares.toString());
      const pr = parseFloat(formStockPrice.toString());
      if (isNaN(sh) || sh <= 0) {
        alert("请输入大于 0 的持股数量！");
        return;
      }
      if (isNaN(pr) || pr <= 0) {
        alert("请输入或查询最新大于 0 的单价！");
        return;
      }
      amt = parseFloat((sh * pr).toFixed(2));
    } else {
      if (formAmount === "" || isNaN(amt) || amt < 0) {
        alert("请输入大于 or 等于 0 的初始资产实值！");
        return;
      }
    }

    const updatedAssets = [...db.assets];
    const newAsset: Asset = {
      id: editingAsset ? editingAsset.id : "asset_" + Date.now().toString(36),
      memberId: formMemberId,
      name: formName.trim(),
      type: formType,
      amount: amt,
      currency: formCurrency,
      remark: formRemark.trim(),
      updatedAt: formDate || new Date().toISOString().split("T")[0],
      ...(formType === "deposit" || formType === "liability" ? { 
        maturityDate: formMaturityDate,
        interestRate: formInterestRate !== "" ? parseFloat(formInterestRate.toString()) : undefined
      } : {}),
      ...(isStockOrEquity ? {
        stockCode: formStockCode.trim(),
        shares: parseFloat(formShares.toString()),
        stockPrice: parseFloat(formStockPrice.toString())
      } : {})
    };

    if (editingAsset) {
      // replace
      const idx = updatedAssets.findIndex(a => a.id === editingAsset.id);
      if (idx !== -1) {
        updatedAssets[idx] = newAsset;
      }
    } else {
      // append
      updatedAssets.unshift(newAsset);
    }

    onSaveState({
      ...db,
      assets: updatedAssets
    });

    setIsFormOpen(false);
    setEditingAsset(null);
  };

  // Delete individual asset
  const handleDeleteAsset = (id: string) => {
    showConfirm({
      title: "确定删除此项资产记录吗？",
      message: "您确定要删除该项个人资产记录吗？删除后此项对应的估值将直接从账底中扣除且无法恢复。",
      onConfirm: () => {
        const updatedAssets = db.assets.filter(a => a.id !== id);
        onSaveState({
          ...db,
          assets: updatedAssets
        });
      }
    });
  };

  // Get single member details
  const getMember = (id: string) => {
    return db.members.find(m => m.id === id) || { name: "未知成员", color: "#6b7280" };
  };

  // Convert an asset amount to base currency for the list view
  const getAssetBaseValue = (asset: Asset) => {
    const curr = db.currencies.find(c => c.code === asset.currency);
    const rate = curr ? curr.rateToBase : 1;
    return asset.amount * rate;
  };

  // Filtered Assets list
  const displayAssets = useMemo(() => {
    return db.assets.filter(asset => {
      // Filter by Member search query
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.remark.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMember = filterMemberId === "all" || asset.memberId === filterMemberId;
      const matchesType = filterType === "all" || asset.type === filterType;

      return matchesSearch && matchesMember && matchesType;
    });
  }, [db.assets, searchQuery, filterMemberId, filterType]);

  // Sorted Assets list
  const sortedAssets = useMemo(() => {
    const assetsCopy = [...displayAssets];
    if (!sortField) return assetsCopy;

    return assetsCopy.sort((a, b) => {
      let comparison = 0;

      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name, "zh-CN");
      } else if (sortField === "member") {
        const nameA = db.members.find(m => m.id === a.memberId)?.name || "未知成员";
        const nameB = db.members.find(m => m.id === b.memberId)?.name || "未知成员";
        comparison = nameA.localeCompare(nameB, "zh-CN");
      } else if (sortField === "type") {
        const labelA = ASSET_TYPES[a.type]?.label || a.type;
        const labelB = ASSET_TYPES[b.type]?.label || b.type;
        comparison = labelA.localeCompare(labelB, "zh-CN");
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      } else if (sortField === "baseValue") {
        const isLiabA = ASSET_TYPES[a.type]?.isLiability || false;
        const isLiabB = ASSET_TYPES[b.type]?.isLiability || false;
        const valA = getAssetBaseValue(a) * (isLiabA ? -1 : 1);
        const valB = getAssetBaseValue(b) * (isLiabB ? -1 : 1);
        comparison = valA - valB;
      } else if (sortField === "updatedAt") {
        comparison = a.updatedAt.localeCompare(b.updatedAt);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [displayAssets, sortField, sortDirection, db.currencies, db.members]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Segment */}
      <div className="bg-[#1E293B] p-3.5 rounded border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="search-assets"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索资产名称、卡号或备注..."
            className="w-full pl-8 pr-4 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500 hover:bg-slate-900/80 transition-all placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Owner */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 font-sans">
              <Filter className="w-3 h-3 text-slate-500" />
              名下所有者筛选:
            </span>
            <select
              id="filter-member"
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">全部家庭成员</option>
              {db.members.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">{m.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Category */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-[9px] uppercase font-bold text-slate-500 font-sans">科目分类:</span>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">所有资产种类</option>
              {Object.keys(ASSET_TYPES).map(key => (
                <option key={key} value={key} className="bg-slate-900 text-slate-200">
                  {ASSET_TYPES[key].label} ({ASSET_TYPES[key].isLiability ? "负债" : "资产"})
                </option>
              ))}
            </select>
          </div>


        </div>
      </div>

      {/* Slide down Add / Edit Form Drawer */}
      {isFormOpen && (
        <div id="drawer-asset-form" className="bg-[#1E293B] p-4 rounded border border-slate-700/85">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3.5">
            <div>
              <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase flex items-center gap-1">
                <span>{editingAsset ? "📖 更改已有账单条目属性" : "✨ 录入全新家庭底账数据"}</span>
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {editingAsset ? "修改已有资产在离线账目中的等值金额以及备注" : "请输入详细的资产卡别、币种，并将特定持有者写入数据库进行持久化"}
              </p>
            </div>
            <button
              id="close-drawer"
              onClick={() => {
                setIsFormOpen(false);
                setEditingAsset(null);
              }}
              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSaveAsset} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Asset Platform Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">资产所在平台 *</label>
              <input
                id="input-asset-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：招商银行、微信零钱通、支付宝、建设银行等"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Belonging Member (Owner) */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">归属人 *</label>
              <select
                id="input-asset-member"
                required
                value={formMemberId}
                onChange={(e) => setFormMemberId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="" className="bg-slate-900">请选择名下归属人</option>
                {db.members.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
                ))}
              </select>
            </div>

            {/* Asset category */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">资金对应资产大类 *</label>
              <select
                id="input-asset-type"
                required
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {Object.keys(ASSET_TYPES).map(key => (
                  <option key={key} value={key} className={ASSET_TYPES[key].isLiability ? "text-rose-400 bg-slate-900 font-bold" : "text-slate-200 bg-slate-900"}>
                    {ASSET_TYPES[key].label} ({ASSET_TYPES[key].isLiability ? "负债类" : "资产类"})
                  </option>
                ))}
              </select>
            </div>

            {/* Stock/Equity specific fields vs Normal Amount */}
            {(formType === "equity" || formType === "stock") ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 block">股票/股权简称或代码 *</label>
                  <div className="flex gap-1.5">
                    <input
                      id="input-asset-stockcode"
                      type="text"
                      required
                      placeholder="证券名或代码，如 sz000001, usAAPL"
                      value={formStockCode}
                      onChange={e => setFormStockCode(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleLookupStockPrice()}
                      disabled={isQueryingStock}
                      className="px-3 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/15 text-white text-[10.5px] font-bold rounded cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isQueryingStock ? "查询中..." : "查股价"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 block">持股数量 (股) *</label>
                  <input
                    id="input-asset-shares"
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="持股数，例如: 1500"
                    value={formShares}
                    onChange={e => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                      setFormShares(val);
                      const pr = parseFloat(formStockPrice as string);
                      if (!isNaN(pr) && val !== "") {
                        setFormAmount(parseFloat((val * pr).toFixed(2)));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 block">单股价格 (¥) *</label>
                  <input
                    id="input-asset-stockprice"
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="单股价格（可查股价）"
                    value={formStockPrice}
                    onChange={e => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                      setFormStockPrice(val);
                      const sh = parseFloat(formShares as string);
                      if (!isNaN(sh) && val !== "") {
                        setFormAmount(parseFloat((sh * val).toFixed(2)));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 block">折合最终总资产 (¥)</label>
                  <input
                    id="input-asset-amount"
                    type="number"
                    step="any"
                    required
                    disabled
                    placeholder="自动估值"
                    value={formAmount}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-800 bg-slate-850 text-emerald-400 focus:outline-none font-mono cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">核实金额 (¥) *</label>
                <input
                  id="input-asset-amount"
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  placeholder="例如: 50000"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}

            {/* Special Parameters Zone for Deposits and Mortgages - MOVED HIGHER */}
            {(formType === "deposit" || formType === "liability") && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-amber-500 block">
                    {formType === "deposit" ? "存款到期时间 *" : "贷款还清时间 *"}
                  </label>
                  <input
                    id="input-asset-maturity-date"
                    type="date"
                    required
                    value={formMaturityDate}
                    onChange={(e) => setFormMaturityDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-amber-900 bg-slate-900 text-amber-200 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-emerald-500 block">
                    {formType === "deposit" ? "年化利率 (%)" : "房贷执行利率 (%)"}
                  </label>
                  <input
                    id="input-asset-interest-rate"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder={formType === "liability" ? "例如: 3.2" : "例如: 2.75"}
                    value={formInterestRate}
                    onChange={(e) => setFormInterestRate(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-emerald-900 bg-slate-900 text-emerald-300 placeholder:text-emerald-900/50 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </>
            )}

            {/* Update Date */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">开账/登记日期</label>
              <input
                id="input-asset-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
              />
            </div>

            <div className={`${(formType === "deposit" || formType === "liability") ? "md:col-span-2 lg:col-span-3" : "md:col-span-1"} space-y-1`}>
              <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">
                备注等项目 {(formType === "deposit" || formType === "liability") && <span className="text-amber-400">({ASSET_TYPES[formType].label}推荐详记)</span>}
              </label>
              <input
                id="input-asset-remark"
                type="text"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                placeholder={(formType === "deposit" || formType === "liability") ? `例如：${formType === "liability" ? 'XX银行还清时间、公积金组合贷款比例、利率变动模式等' : '建设银行三年期大额存单，存期利率2.75%等'}` : "辅助识别记录，例如账号末位、币种兑换等"}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Save Buttons */}
            <div className="md:col-span-3 flex justify-end gap-2 border-t border-slate-800 pt-3 mt-1">
              <button
                type="button"
                id="btn-form-cancel"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingAsset(null);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded text-[11px] font-bold font-sans uppercase transition-all cursor-pointer"
              >
                放弃修改
              </button>
              <button
                type="submit"
                id="btn-form-submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 border border-indigo-400/20 text-white rounded text-[11px] font-bold font-sans uppercase shadow-sm transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                保存记账
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid table for assets */}
      <div className="bg-[#1E293B] rounded border border-slate-800 overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div>
            <span className="text-xs font-bold font-sans tracking-wider text-slate-300 uppercase">账目资产大矩阵表 ({displayAssets.length} 行)</span>
            <span className="hidden sm:inline text-[10.5px] text-slate-500 ml-2.5 font-sans">本地家庭各成员的财产细化分配底单，实时汇总</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] text-rose-400 font-sans flex items-center gap-1 bg-rose-950/40 border border-rose-900/45 px-2 py-0.5 rounded uppercase">
              <Info className="w-3 h-3 text-rose-400 shrink-0" />
              提示：负债科目数值在底层统计时将作为负数计算扣除
            </span>
          </div>
        </div>

        {displayAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-500 text-[9.5px] uppercase font-bold tracking-wider font-sans select-none">
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>登记资产及账单详情</span>
                      {sortField === "name" ? (
                        sortDirection === "asc" ? <span className="text-indigo-400 font-bold">▲</span> : <span className="text-indigo-400 font-bold">▼</span>
                      ) : <span className="text-slate-700">▲▲</span>}
                    </div>
                  </th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
                    onClick={() => handleSort("member")}
                  >
                    <div className="flex items-center gap-1">
                      <span>所属持有成员</span>
                      {sortField === "member" ? (
                        sortDirection === "asc" ? <span className="text-indigo-400 font-bold">▲</span> : <span className="text-indigo-400 font-bold">▼</span>
                      ) : <span className="text-slate-700">▲▲</span>}
                    </div>
                  </th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-1">
                      <span>核准资产科目大类</span>
                      {sortField === "type" ? (
                        sortDirection === "asc" ? <span className="text-indigo-400 font-bold">▲</span> : <span className="text-indigo-400 font-bold">▼</span>
                      ) : <span className="text-slate-700">▲▲</span>}
                    </div>
                  </th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
                    onClick={() => handleSort("baseValue")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>评估值金额 (¥)</span>
                      {sortField === "baseValue" ? (
                        sortDirection === "asc" ? <span className="text-indigo-400 font-bold">▲</span> : <span className="text-indigo-400 font-bold">▼</span>
                      ) : <span className="text-slate-700">▲▲</span>}
                    </div>
                  </th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
                    onClick={() => handleSort("updatedAt")}
                  >
                    <div className="flex items-center gap-1">
                      <span>更新及核实时间</span>
                      {sortField === "updatedAt" ? (
                        sortDirection === "asc" ? <span className="text-indigo-400 font-bold">▲</span> : <span className="text-indigo-400 font-bold">▼</span>
                      ) : <span className="text-slate-700">▲▲</span>}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                {sortedAssets.map(asset => {
                  const m = getMember(asset.memberId);
                  const isLiability = ASSET_TYPES[asset.type]?.isLiability || false;
                  const baseValueObj = getAssetBaseValue(asset);
                  const currencySymbol = db.currencies.find(c => c.code === asset.currency)?.symbol || asset.currency;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-900/30 transition-colors">
                      {/* Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-200">{asset.name}</div>
                        {asset.maturityDate && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/35 text-amber-400 text-[10px] font-bold font-mono">
                              <Calendar className="w-3 h-3 text-amber-500 opacity-80" />
                              <span>到期: {asset.maturityDate}</span>
                            </div>
                            {asset.interestRate !== undefined && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/35 text-emerald-400 text-[10px] font-bold font-mono">
                                <span>利率: {asset.interestRate}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        {asset.stockCode && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-950/30 text-emerald-400 text-[10.5px] font-bold mt-1 font-mono hover:bg-emerald-950/60 transition-colors">
                            <span>证券: {asset.stockCode} / {asset.shares} 股 @ ¥{asset.stockPrice}</span>
                          </div>
                        )}
                        {asset.remark && (
                          <div className="text-[10.5px] text-slate-500 mt-1 max-w-xs truncate font-sans" title={asset.remark}>
                            {asset.remark}
                          </div>
                        )}
                      </td>

                      {/* Belonging Member */}
                      <td className="py-2.5 px-3 font-medium">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10.5px] font-bold text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="font-sans">{m.name}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span
                           className="inline-flex items-center gap-1 text-[11px] font-bold"
                          style={{ color: ASSET_TYPES[asset.type]?.color || "#94a3b8" }}
                        >
                          <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: ASSET_TYPES[asset.type]?.color || "#94a3b8" }} />
                          <span>{ASSET_TYPES[asset.type]?.label || asset.type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className={`py-2.5 px-3 text-right font-black font-mono text-xs ${isLiability ? "text-rose-400" : "text-[#10B981]"}`}>
                        {isLiability ? "-" : ""}{baseCurrencyObj.symbol}
                        {asset.amount.toLocaleString(undefined, { minimumFractionDigits: asset.amount < 1 ? 4 : 0 })}
                      </td>

                      {/* Updated Date */}
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[10.5px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-60 text-slate-500" />
                          {asset.updatedAt}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 font-sans">
            <HelpCircle className="w-8 h-8 text-slate-700" />
            <div>
              <p className="font-bold text-slate-400">目前没有任何符合过滤要求的资产或负债明细条目</p>
              <p className="text-[10.5px] text-slate-600 mt-1">您可以试着调整上方的所有者或大类筛选器，或前往 “系统参数设置” 功能中的 “后台资金操作台” 进行充值及开账操作！</p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Confirm Modal overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in animate-duration-150">
          <div className="bg-[#1E293B] border border-slate-800 rounded-lg max-w-sm w-full p-5 shadow-2xl relative animate-scale-up">
            <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${confirmModal.isDanger !== false ? 'bg-rose-500' : 'bg-indigo-500'}`} />
              {confirmModal.title}
            </h4>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-3.5 py-1.5 rounded text-white text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  confirmModal.isDanger !== false
                    ? 'bg-rose-600 hover:bg-rose-550 border border-rose-500/15'
                    : 'bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/15'
                }`}
              >
                {confirmModal.confirmText || "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
