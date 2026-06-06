import React, { useState } from "react";
import { DatabaseState, Member, Currency, HistoryPoint, MEMBER_ROLES, ASSET_TYPES } from "../types";
import { Users, Coins, Download, Upload, Plus, Trash2, Check, HelpCircle, Save, Calendar, Archive, Trash, Wallet, Pencil, Lock, Key } from "lucide-react";

interface SettingsViewProps {
  db: DatabaseState;
  onSaveState: (newState: DatabaseState) => void;
}

export default function SettingsView({ db, onSaveState }: SettingsViewProps) {
  // Backstage Direct New/Edit Asset Registration State
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [newFundName, setNewFundName] = useState("");
  const [newFundMemberId, setNewFundMemberId] = useState(() => db.members[0]?.id || "");
  const [newFundType, setNewFundType] = useState("cash");
  const [newFundAmount, setNewFundAmount] = useState<number | "">("");
  const [newFundCurrency, setNewFundCurrency] = useState(() => db.settings.baseCurrency);
  const [newFundRemark, setNewFundRemark] = useState("后台直接录入资金");
  const [newFundMaturityDate, setNewFundMaturityDate] = useState("");
  const [newFundInterestRate, setNewFundInterestRate] = useState<number | "">("");
  const [newFundDate, setNewFundDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [newFundStockCode, setNewFundStockCode] = useState("");
  const [newFundShares, setNewFundShares] = useState<number | "">("");
  const [newFundStockPrice, setNewFundStockPrice] = useState<number | "">("");
  const [isQueryingStock, setIsQueryingStock] = useState(false);

  // Filter and search lists
  const [listSearch, setListSearch] = useState("");
  const [listMemberFilter, setListMemberFilter] = useState("all");
  const [listTypeFilter, setListTypeFilter] = useState("all");

  // Members Section
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("father");
  const [newMemberColor, setNewMemberColor] = useState("#a855f7");

  // Currency rates editing
  const [currenciesState, setCurrenciesState] = useState<Currency[]>([...db.currencies]);

  // History record editing
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([...db.history]);
  const [newHistoryDate, setNewHistoryDate] = useState("");
  const [newHistoryWorth, setNewHistoryWorth] = useState<number | "">("");

  // Base currency selection
  const [baseCurrencyCode, setBaseCurrencyCode] = useState(db.settings.baseCurrency);

  // File Upload State
  const [restoreMessage, setRestoreMessage] = useState("");

  // Backstage Administration Password Modification State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (!newPassword.trim()) {
      setPwdMessage({ text: "新密码不能为空！", isError: true });
      return;
    }

    if (newPassword.length < 4) {
      setPwdMessage({ text: "密码长度不能少于4位数字或字符！", isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ text: "两次输入的新密码不一致，请重新核对！", isError: true });
      return;
    }

    const updatedDb: DatabaseState = {
      ...db,
      settings: {
        ...db.settings,
        adminPassword: newPassword
      }
    };

    onSaveState(updatedDb);
    setNewPassword("");
    setConfirmPassword("");
    setPwdMessage({ text: "登录密码更新成功！今后登录后台管理需要输入您设定的新密码。", isError: false });
  };

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

  // Add Family Member
  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      alert("请输入成员名称！");
      return;
    }
    const color = newMemberColor || "#" + Math.floor(Math.random() * 16777215).toString(16);
    const mId = "m_" + Date.now().toString(36);
    const newMember: Member = {
      id: mId,
      name: newMemberName.trim(),
      role: newMemberRole,
      color: color
    };

    const updated = {
      ...db,
      members: [...db.members, newMember]
    };
    onSaveState(updated);
    setNewMemberName("");
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    // Check if member has assets
    const hasAssets = db.assets.some(a => a.memberId === memberId);
    
    const executeDelete = () => {
      const updatedMembers = db.members.filter(m => m.id !== memberId);
      const firstRemainingMember = updatedMembers[0]?.id || "";
      const updatedAssets = db.assets.map(a => {
        if (a.memberId === memberId) {
          return { ...a, memberId: firstRemainingMember };
        }
        return a;
      });

      onSaveState({
        ...db,
        members: updatedMembers,
        assets: updatedAssets
      });
    };

    if (hasAssets) {
      showConfirm({
        title: "确定强制删除该成员账户吗？",
        message: "该成员下关联有具体的资产条目！如果强制删除，这些资产在统计时可能会归位到“未知所有者”。是否确认继续删除？",
        onConfirm: executeDelete
      });
    } else {
      showConfirm({
        title: "确定删除此家庭成员账户吗？",
        message: "此操作是不可逆的。是否确认删除该家庭成员账号账户？",
        onConfirm: executeDelete
      });
    }
  };

  // Save exchange rate modifications
  const handleUpdateCurrencyRate = (code: string, newRate: number) => {
    const updated = currenciesState.map(c => {
      if (c.code === code) {
        return { ...c, rateToBase: newRate };
      }
      return c;
    });
    setCurrenciesState(updated);
    
    // Auto synchronize back
    onSaveState({
      ...db,
      currencies: updated
    });
  };

  // Change Base currency
  const handleChangeBaseCurrency = (code: string) => {
    setBaseCurrencyCode(code);
    
    // adjust base currencies state
    const updated = db.currencies.map(c => {
      return {
        ...c,
        isBase: c.code === code
      };
    });

    onSaveState({
      ...db,
      currencies: updated,
      settings: {
        ...db.settings,
        baseCurrency: code
      }
    });
  };

  // Add new manual Currency
  const [customCurrencyCode, setCustomCurrencyCode] = useState("");
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState("");
  const [customCurrencyRate, setCustomCurrencyRate] = useState<number | "">("");

  const handleAddCustomCurrency = () => {
    const code = customCurrencyCode.toUpperCase().trim();
    if (!code || !customCurrencySymbol.trim() || customCurrencyRate === "") {
      alert("请填写完整的币种编号、符号和折算比例！");
      return;
    }

    if (db.currencies.some(c => c.code === code)) {
      alert("该币种已存在！");
      return;
    }

    const newCurr: Currency = {
      code,
      symbol: customCurrencySymbol.trim(),
      rateToBase: parseFloat(customCurrencyRate.toString()),
      isBase: false
    };

    const updatedCurrencies = [...db.currencies, newCurr];
    onSaveState({
      ...db,
      currencies: updatedCurrencies
    });
    setCurrenciesState(updatedCurrencies);

    setCustomCurrencyCode("");
    setCustomCurrencySymbol("");
    setCustomCurrencyRate("");
  };

  // Delete non-base Currency
  const handleDeleteCurrency = (code: string) => {
    if (code === db.settings.baseCurrency) {
      alert("本位币不可删除！");
      return;
    }
    const hasAssets = db.assets.some(a => a.currency === code);
    if (hasAssets) {
      alert("有资产正在使用此货币，不可将其删除！");
      return;
    }

    showConfirm({
      title: "确定删除此货币记录吗？",
      message: `确认要删除 ${code} 货币记录吗？此币种对应的所有资产折合比例可能会失效。`,
      onConfirm: () => {
        const updatedCurrencies = db.currencies.filter(c => c.code !== code);
        onSaveState({
          ...db,
          currencies: updatedCurrencies
        });
        setCurrenciesState(updatedCurrencies);
      }
    });
  };

  // Calc current total assets inside code to make snapshot calculation automatic
  const computedSnapshotTotals = React.useMemo(() => {
    let assetsTotal = 0;
    let liabilitiesTotal = 0;
    
    db.assets.forEach(a => {
      const curr = db.currencies.find(c => c.code === a.currency);
      const rate = curr ? curr.rateToBase : 1;
      const converted = a.amount * rate;
      if (a.type === "liability") {
        liabilitiesTotal += converted;
      } else {
        assetsTotal += converted;
      }
    });

    const netWorth = assetsTotal - liabilitiesTotal;
    return { assetsTotal, liabilitiesTotal, netWorth };
  }, [db.assets, db.currencies]);

  // Record Today/Current Month as Snapshot Point
  const handleRecordCurrentSnapshot = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // check duplicate date
    const updatedHistory = [...db.history];
    const existingIndex = updatedHistory.findIndex(h => h.date === dateStr);

    const snapshot: HistoryPoint = {
      date: dateStr,
      assetsTotal: Math.round(computedSnapshotTotals.assetsTotal),
      liabilitiesTotal: Math.round(computedSnapshotTotals.liabilitiesTotal),
      netWorth: Math.round(computedSnapshotTotals.netWorth)
    };

    const executeSave = () => {
      const newHistory = [...db.history];
      const idx = newHistory.findIndex(h => h.date === dateStr);
      if (idx !== -1) {
        newHistory[idx] = snapshot;
      } else {
        newHistory.push(snapshot);
      }
      newHistory.sort((a, b) => a.date.localeCompare(b.date));

      onSaveState({
        ...db,
        history: newHistory
      });
      setHistoryPoints(newHistory);
      alert(`成功记录当前月份 [${dateStr}] 资产分析快照！`);
    };

    if (existingIndex !== -1) {
      showConfirm({
        title: "覆盖历史快照确认",
        message: `历史中已存在 [${dateStr}] 的快照记录。是否覆盖该历史节点的账本快照？`,
        isDanger: true,
        onConfirm: executeSave
      });
    } else {
      executeSave();
    }
  };

  // Add customized/manual historic point
  const handleAddManualHistory = () => {
    if (!newHistoryDate || newHistoryWorth === "") {
      alert("请输入完整的历史核算日期（例如 2026-05）和资产总值！");
      return;
    }

    const updatedHistory = [...db.history];
    const histPoint: HistoryPoint = {
      date: newHistoryDate,
      assetsTotal: parseFloat(newHistoryWorth.toString()),
      liabilitiesTotal: 0, // simple historic point can hold assetsTotal or full networth
      netWorth: parseFloat(newHistoryWorth.toString())
    };

    const existingIndex = updatedHistory.findIndex(h => h.date === newHistoryDate);
    if (existingIndex !== -1) {
      updatedHistory[existingIndex] = histPoint;
    } else {
      updatedHistory.push(histPoint);
    }

    updatedHistory.sort((a, b) => a.date.localeCompare(b.date));

    onSaveState({
      ...db,
      history: updatedHistory
    });
    setHistoryPoints(updatedHistory);
    
    setNewHistoryDate("");
    setNewHistoryWorth("");
  };

  // Delete historic point
  const handleDeleteHistoryPoint = (date: string) => {
    showConfirm({
      title: "删除历史财务快照",
      message: `是否确认删除 [${date}] 月度的历史财务快照大势线？此操作无法撤销。`,
      onConfirm: () => {
        const updatedHistory = db.history.filter(h => h.date !== date);
        onSaveState({
          ...db,
          history: updatedHistory
        });
        setHistoryPoints(updatedHistory);
      }
    });
  };

  // Trigger Local file download of database backup
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(db, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `nas_personal_assets_backup_${new Date().toISOString().split("T")[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Handle local restoration of file import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.assets && parsed.members && parsed.currencies) {
          onSaveState(parsed);
          setRestoreMessage("恢复成功！家庭资产数据已全部载入。");
          setTimeout(() => setRestoreMessage(""), 4000);
        } else {
          setRestoreMessage("核心数据失败：导入的文件结构看起来不属于此个人财务资产数据库。");
        }
      } catch (err: any) {
        setRestoreMessage("解析格式错误，请读取标准的 NAS 备份 .json 格式文件。");
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleLookupStockPrice = async (codeToQuery?: string) => {
    const targetCode = (codeToQuery || newFundStockCode).trim();
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
      setNewFundName(data.name);
      
      setNewFundStockCode(data.code.toUpperCase());
      setNewFundStockPrice(data.price);
      
      // Auto calculate amount if shares is already filled
      const sh = parseFloat(newFundShares as string);
      if (!isNaN(sh) && sh > 0) {
        setNewFundAmount(parseFloat((sh * data.price).toFixed(2)));
      }
    } catch (err: any) {
      alert("联络股票查询接口失败: " + err.message);
    } finally {
      setIsQueryingStock(false);
    }
  };

  // Start block editing on an asset
  const handleStartEdit = (asset: any) => {
    setEditingAssetId(asset.id);
    setNewFundName(asset.name);
    setNewFundMemberId(asset.memberId);
    setNewFundType(asset.type);
    setNewFundAmount(asset.amount);
    setNewFundCurrency(asset.currency);
    setNewFundRemark(asset.remark || "");
    setNewFundMaturityDate(asset.maturityDate || "");
    setNewFundInterestRate(asset.interestRate !== undefined ? asset.interestRate : "");
    setNewFundDate(asset.updatedAt);
    setNewFundStockCode(asset.stockCode || "");
    setNewFundShares(asset.shares !== undefined ? asset.shares : "");
    setNewFundStockPrice(asset.stockPrice !== undefined ? asset.stockPrice : "");
  };

  // Cancel editing asset
  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setNewFundName("");
    setNewFundAmount("");
    setNewFundRemark("后台直接录入资金");
    setNewFundMaturityDate("");
    setNewFundInterestRate("");
    setNewFundDate(new Date().toISOString().split("T")[0]);
    setNewFundStockCode("");
    setNewFundShares("");
    setNewFundStockPrice("");
  };

  // Backstage Delete asset
  const handleDeleteAsset = (id: string) => {
    showConfirm({
      title: "确定在后台删除该资产登记吗？",
      message: "确定要在后台删除该项资产登记吗？删除后，该项对应的当前估值将直接从账底中剔除，且不可撤销。",
      onConfirm: () => {
        const updatedAssets = db.assets.filter(a => a.id !== id);
        onSaveState({
          ...db,
          assets: updatedAssets
        });
        if (editingAssetId === id) {
          handleCancelEdit();
        }
      }
    });
  };

  // Handle saving (Create or Update)
  const handleDirectRegisterOrUpdateFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName.trim()) {
      alert("请填入资产所在平台或名称！");
      return;
    }
    if (!newFundMemberId) {
      alert("请先选择该资产科目底账归属的家庭成员账户！");
      return;
    }

    if ((newFundType === "deposit" || newFundType === "liability") && !newFundMaturityDate) {
      alert(`${ASSET_TYPES[newFundType].label}科目必须填写到期时间！`);
      return;
    }

    let amt = parseFloat(newFundAmount as string);
    const isStockOrEquity = newFundType === "equity" || newFundType === "stock";

    if (isStockOrEquity) {
      const sh = parseFloat(newFundShares as string);
      const pr = parseFloat(newFundStockPrice as string);
      if (isNaN(sh) || sh <= 0) {
        alert("请输入大于 0 的持股数量！");
        return;
      }
      if (isNaN(pr) || pr <= 0) {
        alert("请输入或查询大于 0 的单股行情价！");
        return;
      }
      amt = parseFloat((sh * pr).toFixed(2));
    } else {
      if (isNaN(amt) || amt < 0) {
        alert("请输入大于 or 等于 0 的初始资产实值！");
        return;
      }
    }

    if (editingAssetId) {
      const updatedAssets = db.assets.map(asset => {
        if (asset.id === editingAssetId) {
          return {
            ...asset,
            memberId: newFundMemberId,
            name: newFundName.trim(),
            type: newFundType,
            amount: amt,
            currency: newFundCurrency,
            remark: newFundRemark.trim(),
            updatedAt: newFundDate || new Date().toISOString().split("T")[0],
            maturityDate: (newFundType === "deposit" || newFundType === "liability") ? newFundMaturityDate : undefined,
            interestRate: (newFundType === "deposit" || newFundType === "liability") && newFundInterestRate !== "" ? parseFloat(newFundInterestRate.toString()) : undefined,
            stockCode: isStockOrEquity ? newFundStockCode.trim() : undefined,
            shares: isStockOrEquity ? parseFloat(newFundShares as string) : undefined,
            stockPrice: isStockOrEquity ? parseFloat(newFundStockPrice as string) : undefined
          };
        }
        return asset;
      });

      onSaveState({
        ...db,
        assets: updatedAssets
      });

      alert("资产记录更新成功！");
      handleCancelEdit();
    } else {
      const newAsset = {
        id: "asset_" + Date.now().toString(36),
        memberId: newFundMemberId,
        name: newFundName.trim(),
        type: newFundType,
        amount: amt,
        currency: newFundCurrency,
        remark: newFundRemark.trim(),
        updatedAt: newFundDate || new Date().toISOString().split("T")[0],
        ...((newFundType === "deposit" || newFundType === "liability") ? { 
          maturityDate: newFundMaturityDate,
          interestRate: newFundInterestRate !== "" ? parseFloat(newFundInterestRate.toString()) : undefined 
        } : {}),
        ...(isStockOrEquity ? {
          stockCode: newFundStockCode.trim(),
          shares: parseFloat(newFundShares as string),
          stockPrice: parseFloat(newFundStockPrice as string)
        } : {})
      };

      onSaveState({
        ...db,
        assets: [newAsset, ...db.assets]
      });

      alert("后台新建资金登记成功！");
      setNewFundName("");
      setNewFundAmount("");
      setNewFundRemark("后台直接录入资金");
      setNewFundMaturityDate("");
      setNewFundInterestRate("");
      setNewFundStockCode("");
      setNewFundShares("");
      setNewFundStockPrice("");
    }
  };

  // Compute filtered assets for the backstage list
  const filteredAssets = React.useMemo(() => {
    return db.assets.filter(asset => {
      const matchSearch = 
        asset.name.toLowerCase().includes(listSearch.toLowerCase()) ||
        asset.remark.toLowerCase().includes(listSearch.toLowerCase());
      
      const matchMember = listMemberFilter === "all" || asset.memberId === listMemberFilter;
      const matchType = listTypeFilter === "all" || asset.type === listTypeFilter;

      return matchSearch && matchMember && matchType;
    });
  }, [db.assets, listSearch, listMemberFilter, listTypeFilter]);

  return (
    <div className="space-y-4">
      {/* CARD: Backstage Direct Funding Control Hub */}
      <div id="settings-backstage-funding-panel" className="bg-[#1E293B] p-4 rounded border border-slate-800">
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 flex items-center gap-1.5 uppercase">
            <span className="w-2 h-2 rounded bg-indigo-500 animate-pulse" />
            后台全量资产数据库安全维护台
          </h3>
          <p className="text-[10.5px] text-slate-400 mt-1 font-sans">
            对系统内登记的所有实值/隐形资产要素进行后台修正，或随时直接录入一笔全新分类底账科目。
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Column 1: Asset list Backstage (7/12 cols) */}
          <div className="xl:col-span-7 col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">已存底账资产核算列表 ({filteredAssets.length})</span>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-slate-900 border border-slate-800/80 rounded">
              <div>
                <input
                  id="backstage-asset-search"
                  type="text"
                  placeholder="搜索资产所在平台或备注..."
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[10.5px] rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
              <div>
                <select
                  id="backstage-asset-filter-member"
                  value={listMemberFilter}
                  onChange={e => setListMemberFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[10.5px] rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">所有归属人</option>
                  {db.members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  id="backstage-asset-filter-type"
                  value={listTypeFilter}
                  onChange={e => setListTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[10.5px] rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">所有资产大类</option>
                  {Object.keys(ASSET_TYPES).map(key => (
                    <option key={key} value={key}>{ASSET_TYPES[key].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="border border-slate-800 rounded bg-slate-900/60 overflow-hidden">
              <div className="max-h-[385px] overflow-y-auto divide-y divide-slate-800/80">
                {filteredAssets.map(asset => {
                  const member = db.members.find(m => m.id === asset.memberId);
                  const typeInfo = ASSET_TYPES[asset.type] || { label: asset.type, color: "#6b7280", isLiability: false };
                  const isEditingThis = editingAssetId === asset.id;
                  
                  return (
                    <div 
                      key={asset.id} 
                      className={`p-3 flex items-center justify-between transition-all gap-4 ${
                        isEditingThis 
                          ? "bg-indigo-950/25 border-l-2 border-indigo-500" 
                          : "hover:bg-slate-900"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-xs truncate max-w-[140px] md:max-w-none" title={asset.name}>
                            {asset.name}
                          </span>
                          <span 
                            className="text-[9.5px] px-1.5 py-0.5 rounded border leading-none font-bold shrink-0 shadow-sm"
                            style={{ 
                              backgroundColor: typeInfo.color + "15", 
                              borderColor: typeInfo.color + "30", 
                              color: typeInfo.color 
                            }}
                          >
                            {typeInfo.label}
                          </span>
                          
                          {member && (
                            <span 
                              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0" 
                              style={{ 
                                backgroundColor: member.color + "15", 
                                color: member.color 
                              }}
                            >
                              {member.name}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5 flex-wrap">
                          <span className="font-mono text-slate-450">开账日期: {asset.updatedAt}</span>
                          {asset.maturityDate && (
                            <span className={`${asset.type === "liability" ? "text-rose-400" : "text-amber-400"} font-mono flex items-center gap-1 font-bold`}>
                              {asset.type === "liability" ? "还清日期" : "到期时间"}: {asset.maturityDate}
                            </span>
                          )}
                          {asset.interestRate !== undefined && (
                            <span className={`${asset.type === "liability" ? "text-rose-300" : "text-emerald-400"} font-mono flex items-center gap-1 font-bold`}>
                              利率: {asset.interestRate}%
                            </span>
                          )}
                          {asset.stockCode && (
                            <span className="text-emerald-400 font-mono flex items-center gap-1 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
                              证券代码: {asset.stockCode} / {asset.shares} 股 / 单股价格: ¥{asset.stockPrice}
                            </span>
                          )}
                        </div>

                        {asset.remark && (
                          <p className="text-[10px] text-slate-500 mt-1 font-sans truncate max-w-xs md:max-w-md" title={asset.remark}>
                            备注: {asset.remark}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
                        <div className="text-right">
                          <div className={`text-xs font-bold font-mono ${typeInfo.isLiability ? "text-rose-455" : "text-slate-100"}`}>
                            {typeInfo.isLiability ? "-" : ""}{asset.amount.toLocaleString()} {asset.currency}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(asset)}
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              isEditingThis 
                                ? "bg-indigo-650 text-white" 
                                : "hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
                            }`}
                            title="修改编辑该卡别资产要素"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="后台直接注销删除此条目"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredAssets.length === 0 && (
                  <div className="py-12 text-center text-slate-600 text-xs font-sans">
                    没有根据过滤条件检索到后台资产条目
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Form (5/12 cols) */}
          <div className="xl:col-span-5 col-span-1">
            <form onSubmit={handleDirectRegisterOrUpdateFund} className="space-y-3.5 bg-slate-900/60 p-4 rounded border border-slate-800/80 flex flex-col h-full justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${
                    editingAssetId 
                      ? "bg-indigo-950/40 border border-indigo-900/40" 
                      : "bg-emerald-950/40 border border-emerald-900/40"
                  }`}>
                    {editingAssetId ? (
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-200 truncate">
                      {editingAssetId ? "修改编辑下辖资产要素" : "后台直接新增资金科目"}
                    </h4>
                    <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                      {editingAssetId ? "正在后台强制编辑修改现有资产记录参数" : "后台独立录入一笔全新的家庭初始资本项目"}
                    </p>
                  </div>
                  {editingAssetId && (
                    <button
                      type="button"
                      id="btn-cancel-edit"
                      onClick={handleCancelEdit}
                      className="text-[9.5px] bg-slate-800 hover:bg-slate-750 text-slate-400 px-1.5 py-0.5 rounded border border-slate-750 cursor-pointer"
                    >
                      取消修改
                    </button>
                  )}
                </div>

                {/* Grid block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Platform Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">资产所在平台 *</label>
                    <input
                      id="newfund-input-name"
                      type="text"
                      required
                      placeholder="例如: 建设银行、微信零钱通、支付宝、招商银行等"
                      value={newFundName}
                      onChange={e => setNewFundName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  {/* Member select */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">归属人 *</label>
                    <select
                      id="newfund-select-member"
                      required
                      value={newFundMemberId}
                      onChange={e => setNewFundMemberId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="" className="bg-[#1E293B] text-slate-400">选择归属家庭成员</option>
                      {db.members.map(m => (
                        <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subclass category */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">资金对应资产大类 *</label>
                    <select
                      id="newfund-select-type"
                      required
                      value={newFundType}
                      onChange={e => setNewFundType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {Object.keys(ASSET_TYPES).map(key => (
                        <option key={key} value={key} className="bg-slate-900 text-slate-200">
                          {ASSET_TYPES[key].label} ({ASSET_TYPES[key].isLiability ? "负债类" : "资产类"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stock/Equity specific fields vs Normal Amount */}
                  {(newFundType === "equity" || newFundType === "stock") ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">股票/股权简称/代码 *</label>
                        <div className="flex gap-1.5">
                          <input
                            id="newfund-input-stockcode"
                            type="text"
                            required
                            placeholder="A股/港股/美股或名称，例如: sz000001, usAAPL"
                            value={newFundStockCode}
                            onChange={e => setNewFundStockCode(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleLookupStockPrice()}
                            disabled={isQueryingStock}
                            className="px-3 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/15 text-white text-[10.5px] font-bold rounded cursor-pointer shrink-0 transition-colors disabled:opacity-50"
                          >
                            {isQueryingStock ? "查询中..." : "查股价"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">持股数量 (股) *</label>
                        <input
                          id="newfund-input-shares"
                          type="number"
                          step="any"
                          required
                          min="0"
                          placeholder="例如: 2000"
                          value={newFundShares}
                          onChange={e => {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                            setNewFundShares(val);
                            const pr = parseFloat(newFundStockPrice as string);
                            if (!isNaN(pr) && val !== "") {
                              setNewFundAmount(parseFloat((val * pr).toFixed(2)));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">单股价格 (¥) *</label>
                        <input
                          id="newfund-input-stockprice"
                          type="number"
                          step="any"
                          required
                          min="0"
                          placeholder="输入单价或点击查询股价"
                          value={newFundStockPrice}
                          onChange={e => {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                            setNewFundStockPrice(val);
                            const sh = parseFloat(newFundShares as string);
                            if (!isNaN(sh) && val !== "") {
                              setNewFundAmount(parseFloat((sh * val).toFixed(2)));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">核实折合总金额 (¥)</label>
                        <input
                          id="newfund-input-amount"
                          type="number"
                          step="any"
                          required
                          disabled
                          placeholder="自动计算"
                          value={newFundAmount}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-slate-800/80 text-emerald-400 font-bold focus:outline-none font-mono cursor-not-allowed"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">核实金额 (¥) *</label>
                      <input
                        id="newfund-input-amount"
                        type="number"
                        step="any"
                        required
                        min="0"
                        placeholder="例如: 50000"
                        value={newFundAmount}
                        onChange={e => setNewFundAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  )}

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">开账/登记日期</label>
                    <input
                      id="newfund-input-date"
                      type="date"
                      value={newFundDate}
                      onChange={e => setNewFundDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-100 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                    />
                  </div>

                  {/* Conditional Maturity Date and Interest Rate for Deposit or Liability (Mortgage) */}
                  {(newFundType === "deposit" || newFundType === "liability") && (
                    <>
                      <div className="space-y-1 animate-fade-in">
                        <label className={`text-[10px] uppercase font-bold tracking-wider font-sans block font-mono ${newFundType === "liability" ? "text-rose-400" : "text-amber-400"}`}>
                          {newFundType === "liability" ? "贷款还清到期时间 *" : "存款到期时间 *"}
                        </label>
                        <input
                          id="newfund-input-maturity"
                          type="date"
                          required
                          value={newFundMaturityDate}
                          onChange={e => setNewFundMaturityDate(e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs rounded border bg-[#1E293B] font-mono cursor-pointer ${
                            newFundType === "liability" 
                              ? "border-rose-700 text-rose-200 focus:border-rose-500" 
                              : "border-amber-600 text-amber-200 focus:border-amber-500"
                          }`}
                        />
                      </div>
                      <div className="space-y-1 animate-fade-in">
                        <label className={`text-[10px] uppercase font-bold tracking-wider font-sans block font-mono ${newFundType === "liability" ? "text-rose-400" : "text-emerald-400"}`}>
                          {newFundType === "liability" ? "房贷执行年利率 (%)" : "存款年化利率 (%)"}
                        </label>
                        <input
                          id="newfund-input-interest-rate"
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder={newFundType === "liability" ? "例如: 3.25" : "例如: 2.75"}
                          value={newFundInterestRate}
                          onChange={e => setNewFundInterestRate(e.target.value === "" ? "" : parseFloat(e.target.value))}
                          className={`w-full px-2.5 py-1.5 text-xs rounded border bg-[#1E293B] font-mono ${
                            newFundType === "liability" 
                              ? "border-rose-700 text-rose-200 focus:border-rose-500" 
                              : "border-emerald-600/50 text-emerald-300 focus:border-emerald-500"
                          }`}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Remark */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">
                    备注等项目 {(newFundType === "deposit" || newFundType === "liability") && <span className="text-amber-400">({ASSET_TYPES[newFundType].label}推荐详记)</span>}
                  </label>
                  <input
                    id="newfund-input-remark"
                    type="text"
                    placeholder={(newFundType === "deposit" || newFundType === "liability") ? `例如：${newFundType === "liability" ? 'XX银行公积金组合贷款比例、利率变动模式或还清到期时间' : '建设银行三年期大额存单，存期利率2.75%等'}` : "补充输入辅助识别，例如：账号末4位、币种兑换或特殊标记"}
                    value={newFundRemark}
                    onChange={e => setNewFundRemark(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] hover:border-slate-700 text-slate-100 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/85 mt-2 flex justify-end gap-2">
                {editingAssetId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-705 text-slate-300 rounded text-[11px] font-bold font-sans uppercase transition-all cursor-pointer"
                  >
                    放弃修改
                  </button>
                )}
                <button
                  type="submit"
                  id="btn-submit-newfund"
                  className={`px-3.5 py-1.5 rounded text-[11px] font-bold font-sans uppercase shadow-sm transition-all cursor-pointer flex items-center gap-1 ${
                    editingAssetId 
                      ? "bg-indigo-600 hover:bg-indigo-550 border border-indigo-505/15 text-white" 
                      : "bg-emerald-600 hover:bg-emerald-555 border border-emerald-505/15 text-white"
                  }`}
                >
                  {editingAssetId ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-white" />
                      保存修改变动项目
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-white" />
                      开设底账并完成资金新增
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Combined config row: Members registry and Administration authorization security panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Member List manager */}
        <div id="settings-members-card" className="bg-[#1E293B] p-4 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 flex items-center gap-1.5 mb-1 uppercase">
              <Users className="w-4 h-4 text-purple-400" />
              家庭成员账户注册名录
            </h3>
            <p className="text-[10.5px] text-slate-500 mb-3.5">进行家庭持有者注册，并为不同的登记账本持有人指定在分析汇总时的个性专属高对比识别色</p>

            {/* List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-4">
              {db.members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800/80 rounded transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <div>
                      <span className="text-xs font-bold text-slate-200">{m.name}</span>
                    </div>
                  </div>
                  <button
                    id={`btn-del-member-${m.id}`}
                    onClick={() => handleDeleteMember(m.id)}
                    className="p-1 hover:bg-rose-950/40 rounded text-rose-400/85 hover:text-rose-300 transition-colors cursor-pointer"
                    title="删除此成员账户"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/80">
            <h4 className="text-[10px] uppercase font-bold tracking-wider font-sans text-purple-400 mb-2">追加核算注册成员</h4>
            <div className="mb-2.5">
              <input
                id="member-input-name"
                type="text"
                placeholder="成员名称 (如: 爷爷)"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] text-slate-500 font-sans uppercase">专属代表标识色:</span>
                <input
                  id="member-input-color"
                  type="color"
                  value={newMemberColor}
                  onChange={e => setNewMemberColor(e.target.value)}
                  className="w-6 h-5 cursor-pointer border-0 rounded bg-transparent p-0"
                />
              </div>
              <button
                id="member-btn-add"
                onClick={handleAddMember}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold font-sans uppercase cursor-pointer transition-all shrink-0 flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                保存账户成员
              </button>
            </div>
          </div>
        </div>

        {/* Backstage Administration Security Control Panel */}
        <div className="bg-[#1E293B] p-4 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 flex items-center gap-1.5 mb-1 uppercase">
              <Key className="w-4 h-4 text-indigo-400" />
              后台登录安全管理
            </h3>
            <p className="text-[10.5px] text-slate-500 mb-3.5 leading-normal animate-pulse-once">
              修改后台管理系统的全局超级管理员访问验证密码。更改后即时写入持久化底账并全域生效。
            </p>

            <form onSubmit={handleChangePassword} className="p-3 border border-slate-800 bg-slate-900 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block mb-1">
                    请输入新密码
                  </label>
                  <input
                    id="backstage-new-password"
                    type="password"
                    placeholder="建议不少于4位"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] focus:outline-none focus:border-indigo-500 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block mb-1">
                    确认输入新密码
                  </label>
                  <input
                    id="backstage-confirm-password"
                    type="password"
                    placeholder="重复输入并完全一致"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-800 bg-[#1E293B] focus:outline-none focus:border-indigo-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  {pwdMessage && (
                    <span className={`text-[11px] font-bold ${pwdMessage.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {pwdMessage.text}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  id="btn-save-password"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/20 rounded text-[11px] font-bold font-sans text-white uppercase cursor-pointer transition-all"
                >
                  确认修改密码
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Snapshot and History record management */}
      <div className="bg-[#1E293B] p-4 rounded border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3.5">
          <div>
            <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 flex items-center gap-1.5 uppercase">
              <Calendar className="w-4 h-4 text-emerald-400" />
              历史资产起伏趋势大势快照保存矩阵
            </h3>
            <p className="text-[10.5px] text-slate-500 mt-1">
              可随时将账本此刻市值固化为大盘历史趋势分析的一个月度/阶段快照点，用以跟踪离线净资产起落。
            </p>
          </div>

          <div className="flex gap-2">
            <button
              id="btn-trigger-snapshot"
              onClick={handleRecordCurrentSnapshot}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-555 text-white border border-emerald-500/15 rounded text-[11px] font-sans font-bold tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              固化保存当前历史快照点 ({new Date().toISOString().split("T")[0].substring(0, 7)})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Table list of history */}
          <div className="md:col-span-2 space-y-2">
            <span className="text-[10px] uppercase font-bold font-sans tracking-wider text-slate-400 block mb-1">已存档家庭历史财富快照底数清单</span>
            <div className="border border-slate-800 rounded bg-slate-900 overflow-hidden max-h-40 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 font-bold font-sans text-[9px] text-slate-500 uppercase tracking-widest">
                    <th className="py-2 px-3">结算快照年月/日期</th>
                    <th className="py-2 px-3 text-right">名下正资产总额</th>
                    <th className="py-2 px-3 text-right text-rose-450">当期负债扣减额</th>
                    <th className="py-2 px-3 text-right">核准纯净财富值</th>
                    <th className="py-2 px-3 text-center">快照管理</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {db.history.map(point => (
                    <tr key={point.date} className="hover:bg-slate-950/40">
                      <td className="py-2 px-3 font-semibold font-mono text-slate-200">{point.date}</td>
                      <td className="py-2 px-3 text-right text-slate-400 font-mono">{point.assetsTotal.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-rose-400 font-mono">-{point.liabilitiesTotal.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-[#10B981] font-black font-mono">{point.netWorth.toLocaleString()}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          id={`btn-del-history-${point.date}`}
                          onClick={() => handleDeleteHistoryPoint(point.date)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950 flex items-center justify-center mx-auto cursor-pointer"
                          title="丢弃此快照记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {db.history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 px-3 text-center font-sans text-slate-600 text-[11px]">
                        目前没有任何已保存的历史大盘指数快照数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual Input History Point */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">手动注入历史年度和月度老账点</span>
              <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">可通过此处手动补入过去任意月份的财务老旧账，使大势起伏折现大趋势线完美连贯完整。</p>
            </div>
            
            <div className="space-y-2 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold font-mono text-slate-500 block mb-1">月份日期</label>
                  <input
                    id="hist-input-date"
                    type="text"
                    placeholder="2025-06"
                    value={newHistoryDate}
                    onChange={e => setNewHistoryDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold font-mono text-slate-500 block mb-1">本位折算净值</label>
                  <input
                    id="hist-input-worth"
                    type="number"
                    placeholder="3500000"
                    value={newHistoryWorth}
                    onChange={e => setNewHistoryWorth(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-800 bg-[#1E293B] text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
              <button
                id="btn-save-manual-history"
                onClick={handleAddManualHistory}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 rounded text-[11px] font-bold font-sans uppercase cursor-pointer transition-all"
              >
                补入趋势线折线点
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud & Local Backup storage area */}
      <div className="bg-[#1E293B] p-4 rounded border border-slate-800">
        <h3 className="text-xs font-bold font-sans tracking-wider text-slate-300 flex items-center gap-1.5 mb-1 uppercase">
          <Archive className="w-4 h-4 text-slate-400" />
          冷热本地落盘与物理全量容灾数据备份
        </h3>
        <p className="text-[10.5px] text-slate-500 mb-3.5 leading-normal">
          该 NAS 财务记账本主体数据安全落盘保存在持久化盘片路径中。落盘格式为标准的可检索 JSON (落盘路径为 Docker 本地映射的：<code className="bg-[#1B2230] px-1.5 py-0.5 text-[10px] font-mono text-[#10B981] rounded border border-slate-800">/data/db.json</code>)。您同样可全量导出离线备份。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Export card */}
          <div className="p-3 border border-slate-800 bg-slate-900 rounded flex gap-3 items-start hover:border-slate-700 transition-all">
            <div className="w-9 h-9 rounded bg-[#1E293B] text-slate-300 flex items-center justify-center shrink-0">
              <Download className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300">纯前端物理离线导出备用账本 (.json)</h4>
              <p className="text-[10px] text-slate-500 mt-1">下载全量包含名下资产条目、定制持有人标识及快照点在内的全套脱敏 JSON 包。</p>
              <button
                id="btn-export-backup"
                onClick={handleExportBackup}
                className="mt-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/25 rounded text-[11px] font-bold font-sans uppercase text-white cursor-pointer transition-all flex items-center gap-1 shadow-sm"
              >
                下载全量脱敏 JSON 包
              </button>
            </div>
          </div>

          {/* Import card */}
          <div className="p-3 border border-slate-800 bg-slate-900 rounded flex gap-3 items-start hover:border-slate-700 transition-all">
            <div className="w-9 h-9 rounded bg-[#1E293B] text-slate-300 flex items-center justify-center shrink-0">
              <Upload className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300">冷灾备容恢复 / 账目文件一键覆写</h4>
              <p className="text-[10px] text-slate-500 mt-1">选择原系统导出的合法 JSON，即刻替换当前 NAS docker 内部正在使用的热状态数据。</p>
              
              <div className="mt-3">
                <input
                  id="import-backup-file"
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-750 file:text-[10px] file:font-mono file:bg-[#1E293B] file:text-slate-300 hover:file:bg-slate-800"
                />
              </div>
              
              {restoreMessage && (
                <div id="import-message" className="mt-2 text-[10px] text-indigo-400 font-bold bg-[#1E293B] p-1.5 rounded border border-indigo-900/35 font-mono uppercase">
                  {restoreMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Confirm Modal overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
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
