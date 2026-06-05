import React, { useState, useEffect, useCallback } from "react";
import { DatabaseState } from "./types";
import Dashboard from "./components/Dashboard";
import AssetList from "./components/AssetList";
import SettingsView from "./components/SettingsView";
import { 
  LayoutDashboard, 
  ReceiptText, 
  Sliders, 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  RefreshCcw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "assets" | "settings">("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("nas_app_theme") as "dark" | "light") || "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("nas_app_theme", nextTheme);
  };
  const [activeMemberId, setActiveMemberId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Backend Administration Authentication dimension
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("nas_admin_logged_in") === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = db?.settings?.adminPassword || "123456";
    if (username.trim() === "admin" && password === correctPassword) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem("nas_admin_logged_in", "true");
      sessionStorage.setItem("nas_admin_user", username.trim());
      setLoginError("");
    } else {
      setLoginError("身份校验失败！用户名或密码不正确。");
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("nas_admin_logged_in");
    sessionStorage.removeItem("nas_admin_user");
    setUsername("");
    setPassword("");
  };

  // Fetch full state from backend Express API
  const fetchState = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const response = await fetch("/api/db");
      if (!response.ok) {
        throw new Error(`Failed to fetch database: ${response.statusText}`);
      }
      const data = await response.json();
      setDb(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("数据加载失败，服务可能正在重新启动。请稍后刷新重试！");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Save State back to backend Express API
  const handleSaveState = async (newState: DatabaseState) => {
    try {
      // optimistic update
      setDb(newState);
      
      const response = await fetch("/api/db/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newState)
      });

      if (!response.ok) {
        throw new Error(`Failed to update state: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Update unsuccessful");
      }
    } catch (err: any) {
      console.error("Failed to save state:", err);
      alert(`保存失败，请检查 NAS 连接! 原因: ${err.message}`);
      // restore previous server state
      fetchState();
    }
  };

  if (isLoading && !db) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <h2 className="text-xs font-semibold text-slate-300 font-mono tracking-wider uppercase">正在连接本地 DOCKER 节点...</h2>
          <p className="text-[11px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">挂载路径: "/data/db.json"</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-200 ${theme === "light" ? "light-theme" : ""}`}>
      {/* Container header wrap */}
      <header className="bg-[#1E293B] border-b border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo & Meta info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm border border-indigo-400/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-200 tracking-tight font-sans">
                  家庭资产管理系统
                </h1>
              </div>
            </div>
          </div>

          {/* Nav Links Tabs and Theme Switcher */}
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded border border-slate-800 scroll-x">
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded font-mono transition-all uppercase cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-indigo-600 text-white border border-indigo-400/25 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1 font-sans">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  主页
                </span>
              </button>
              <button
                id="tab-assets"
                onClick={() => setActiveTab("assets")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded font-mono transition-all uppercase cursor-pointer ${
                  activeTab === "assets"
                    ? "bg-indigo-600 text-white border border-indigo-400/25 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1 font-sans">
                  <ReceiptText className="w-3.5 h-3.5" />
                  资产明细
                </span>
              </button>
              <button
                id="tab-settings"
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded font-mono transition-all uppercase cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-indigo-600 text-white border border-indigo-400/25 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1 font-sans">
                  {isAdminAuthenticated ? (
                    <Unlock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-indigo-400/70" />
                  )}
                  后台管理
                  {isAdminAuthenticated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-0.5" />
                  )}
                </span>
              </button>
            </div>

            {/* Quick theme switcher button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 transition-all cursor-pointer flex items-center justify-center shadow-inner shrink-0"
              title={theme === "dark" ? "切换为浅色模式" : "切换为暗黑模式"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#4F46E5]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/70 rounded mb-5 flex items-center justify-between text-rose-200 text-xs font-sans">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              系统异常: {errorMsg}
            </span>
            <button
              id="btn-retry-fetch"
              onClick={fetchState}
              className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800 text-rose-200 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <RefreshCcw className="w-3 h-3" />
              重新连接节点
            </button>
          </div>
        )}

        {db && (
          <div className="space-y-5">
            {activeTab === "dashboard" && (
              <Dashboard
                db={db}
                activeMemberId={activeMemberId}
                setActiveMemberId={setActiveMemberId}
                theme={theme}
              />
            )}

            {activeTab === "assets" && (
              <AssetList
                db={db}
                onSaveState={handleSaveState}
                activeMemberId={activeMemberId}
              />
            )}

            {activeTab === "settings" && (
              isAdminAuthenticated ? (
                <div className="space-y-4">
                  {/* Security session banner */}
                  <div className="bg-indigo-950/40 border border-indigo-900/60 p-3.5 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-indigo-250 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0Inline block" />
                      <span className="font-semibold text-slate-200">系统已解锁授权后台管理会话</span>
                      <span className="text-slate-600 hidden sm:inline">|</span>
                      <span className="text-[11px] text-slate-400">登入用户：{sessionStorage.getItem("nas_admin_user") || "admin"} (拥有一级读写写入特权)</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 bg-rose-950/30 hover:bg-rose-900/45 border border-rose-900/40 hover:border-rose-900/70 text-rose-400 hover:text-rose-300 rounded text-[10.5px] font-sans font-bold flex items-center justify-center gap-1 cursor-pointer transition-all self-end sm:self-auto uppercase tracking-wide shadow-sm"
                      title="锁闭后台退出会话"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      退出安全后台 (锁闭数据)
                    </button>
                  </div>
                  <SettingsView
                    db={db}
                    onSaveState={handleSaveState}
                  />
                </div>
              ) : (
                <div className="max-w-md mx-auto my-8 bg-[#1E293B] border border-slate-800 rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#1B2230] to-[#1E293B] p-5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Lock className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100 font-sans uppercase tracking-wide">
                          后台管理系统安全验证
                        </h3>
                        <p className="text-[10.5px] text-slate-505 font-sans mt-0.5">访问“系统参数设置”与“资金融通操作台”需要身份鉴权</p>
                      </div>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLogin} className="p-5 space-y-4">
                    {loginError && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 text-rose-300 rounded text-xs flex items-center gap-2 font-sans select-none animate-bounce">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">管理员用户名</label>
                      <input
                        type="text"
                        required
                        placeholder="请输入用户名"
                        value={username}
                        onChange={e => {
                          setUsername(e.target.value);
                          setLoginError("");
                        }}
                        className="w-full px-3 py-2 text-xs rounded border border-slate-800 bg-[#0F172A] text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider font-sans text-slate-400 block">系统登录密码</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="请输入密码"
                          value={password}
                          onChange={e => {
                            setPassword(e.target.value);
                            setLoginError("");
                          }}
                          className="w-full px-3 py-2 text-xs rounded border border-slate-800 bg-[#0F172A] text-slate-100 focus:outline-none focus:border-indigo-500 pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 border border-indigo-400/20 text-white rounded text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-300 animate-pulse" />
                      验证密码并登入后台
                    </button>
                    
                    <div className="bg-slate-900/65 border border-slate-850 p-3 rounded text-[10.5px] text-slate-500 leading-normal font-sans space-y-1 select-none">
                      <span className="font-bold text-slate-400 block">系统说明 / 初始认证助理：</span>
                      <p>本款 NAS 账簿节点为纯离线私有容器模式，默认安全访问凭证已经固化为您当前的局域网共享模式：</p>
                      <div className="flex gap-4 font-mono text-[#10B981] bg-slate-950 px-2.5 py-1 rounded border border-slate-850/80 w-max mt-1.5 text-[10px]">
                        <span>用户名: <strong className="text-emerald-400 select-all">admin</strong></span>
                        <span>密码: <strong className="text-emerald-400 select-all">123456</strong></span>
                      </div>
                      <p className="text-[9.5px] text-slate-600 mt-1.5 leading-normal">
                        成功通过密码后，您的管理员权限将存储在 Session 状态中。
                      </p>
                    </div>
                  </form>
                </div>
              )
            )}
          </div>
        )}
      </main>


    </div>
  );
}
