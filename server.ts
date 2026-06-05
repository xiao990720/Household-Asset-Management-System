import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

// Ensure data directory and default database exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB = {
  members: [
    { id: "m1", name: "张明 (爸爸)", role: "father", color: "#3b82f6" },
    { id: "m2", name: "王芳 (妈妈)", role: "mother", color: "#ec4899" },
    { id: "m3", name: "张小智 (儿子)", role: "child", color: "#10b981" },
    { id: "m4", name: "家庭公共", role: "public", color: "#eab308" }
  ],
  assets: [
    // 活期
    { id: "a1", memberId: "m1", name: "招商银行储蓄卡", type: "cash", amount: 85000, currency: "CNY", remark: "工资及活期备用金", updatedAt: "2026-06-01" },
    { id: "a2", memberId: "m2", name: "微信零钱通", type: "cash", amount: 15400, currency: "CNY", remark: "日常开销零花钱", updatedAt: "2026-06-04" },
    { id: "a3", memberId: "m4", name: "家庭紧急备用金(存现)", type: "cash", amount: 10000, currency: "CNY", remark: "保保存款及防灾备用红利", updatedAt: "2026-05-15" },
    
    // 定期存款
    { id: "a4", memberId: "m2", name: "建设银行三年期存单", type: "deposit", amount: 200000, currency: "CNY", remark: "定存年利息 2.75%", updatedAt: "2026-01-10" },
    { id: "a5", memberId: "m3", name: "微信成长教育理财", type: "deposit", amount: 50000, currency: "CNY", remark: "定期保本定投", updatedAt: "2026-02-18" },
    
    // 投资-股票与投资-基金
    { id: "a6", memberId: "m1", name: "老虎证券港美股科技股底仓", type: "stock", amount: 90625, currency: "CNY", remark: "持有科技类绩优股股票", updatedAt: "2026-06-05" },
    { id: "a7", memberId: "m2", name: "沪深300指数联接基金", type: "fund", amount: 48000, currency: "CNY", remark: "支付宝基金定投", updatedAt: "2026-06-03" },
    
    // 股权
    { id: "a8", memberId: "m1", name: "合伙创业公司持股份额", type: "equity", amount: 76800, currency: "CNY", remark: "创始合伙股权实估折算", updatedAt: "2026-06-05" },
    
    // 不动产
    { id: "a9", memberId: "m4", name: "静安区自住住宅房产", type: "estate", amount: 5500000, currency: "CNY", remark: "当前折旧评估价", updatedAt: "2026-05-20" },
    { id: "a10", memberId: "m1", name: "代步电车 (特斯拉 Model Y)", type: "estate", amount: 200000, currency: "CNY", remark: "折旧评估价", updatedAt: "2026-05-10" },
    
    // 贵金属-黄金 / 贵金属-银
    { id: "a11", memberId: "m2", name: "投资实物金条 50g", type: "gold", amount: 28500, currency: "CNY", remark: "银行实物原原料投资金", updatedAt: "2026-05-30" },
    { id: "a12", memberId: "m2", name: "熊猫精制收藏银币 100g", type: "silver", amount: 3500, currency: "CNY", remark: "收藏纪念银币", updatedAt: "2026-05-30" },
    
    // 房贷 (负债)
    { id: "a13", memberId: "m4", name: "建设银行商业公积金房贷", type: "liability", amount: 1800000, currency: "CNY", remark: "月供 8200 元，还剩 22 年", updatedAt: "2026-06-01" },
    
    // 个人养老与隐形资产
    { id: "a14", memberId: "m1", name: "个人养老金账户累积", type: "pension", amount: 24000, currency: "CNY", remark: "个人养老金抵税上限定投", updatedAt: "2026-06-02" },
    { id: "a15", memberId: "m1", name: "上海公积金账户封存余额", type: "provident", amount: 112000, currency: "CNY", remark: "在职累计住房公积金账户残值", updatedAt: "2026-06-01" },
    { id: "a16", memberId: "m2", name: "个人医保个人共济账户余额", type: "medical", amount: 15600, currency: "CNY", remark: "医保历年账户积累共济金额", updatedAt: "2026-06-01" }
  ],
  currencies: [
    { code: "CNY", symbol: "¥", rateToBase: 1.0, isBase: true }
  ],
  history: [
    { date: "2025-12", assetsTotal: 5800000, liabilitiesTotal: 1950000, netWorth: 3850000 },
    { date: "2026-01", assetsTotal: 5900000, liabilitiesTotal: 1920000, netWorth: 3980000 },
    { date: "2026-02", assetsTotal: 5950000, liabilitiesTotal: 1900000, netWorth: 4050000 },
    { date: "2026-03", assetsTotal: 6050000, liabilitiesTotal: 1880000, netWorth: 4170000 },
    { date: "2026-04", assetsTotal: 6100000, liabilitiesTotal: 1860000, netWorth: 4240000 },
    { date: "2026-05", assetsTotal: 6162300, liabilitiesTotal: 1840000, netWorth: 4322300 },
    { date: "2026-06", assetsTotal: 6220625, liabilitiesTotal: 1887000, netWorth: 4333625 }
  ],
  settings: {
    baseCurrency: "CNY"
  }
};

function readDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      let migrated = false;

      // Migrate assets with old types to the new ones
      if (parsed.assets && Array.isArray(parsed.assets)) {
        parsed.assets = parsed.assets.map((asset: any) => {
          if (asset.type === "investment") {
            if (asset.name && asset.name.includes("基金")) {
              asset.type = "fund";
            } else {
              asset.type = "stock";
            }
            migrated = true;
          } else if (asset.type === "crypto") {
            asset.type = "stock";
            migrated = true;
          } else if (asset.type === "precious") {
            if (asset.name && asset.name.includes("银")) {
              asset.type = "silver";
            } else {
              asset.type = "gold";
            }
            migrated = true;
          } else if (asset.type === "insurance") {
            asset.type = "pension";
            migrated = true;
          } else if (asset.type === "other") {
            asset.type = "equity";
            migrated = true;
          }
          return asset;
        });
      }

      // Ensure currencies has only CNY
      if (parsed.currencies && (parsed.currencies.length > 1 || parsed.currencies[0]?.code !== "CNY")) {
        // Build map of previous exchange rates for migration
        const rates: Record<string, number> = {};
        parsed.currencies.forEach((c: any) => {
          rates[c.code] = c.rateToBase || 1;
        });

        if (parsed.assets) {
          parsed.assets = parsed.assets.map((asset: any) => {
            if (asset.currency && asset.currency !== "CNY") {
              const rate = rates[asset.currency] || 1;
              asset.amount = Math.round(asset.amount * rate);
              asset.currency = "CNY";
              migrated = true;
            }
            return asset;
          });
        }

        parsed.currencies = [
          { code: "CNY", symbol: "¥", rateToBase: 1.0, isBase: true }
        ];
        parsed.settings = {
          ...parsed.settings,
          baseCurrency: "CNY"
        };
        migrated = true;
      }

      if (migrated) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read database file, restoring defaults.", error);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
  return DEFAULT_DB;
}

function writeDatabase(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// REST API for Stock Price Lookup
app.get("/api/stock/price", async (req, res) => {
  try {
    let code = (req.query.code as string || "").trim().toLowerCase();
    if (!code) {
      return res.status(400).json({ error: "股票代码不能为空" });
    }

    // Auto prefix detection if only digits are entered
    if (/^\d+$/.test(code)) {
      if (code.length === 6) {
        if (code.startsWith("60") || code.startsWith("68") || code.startsWith("90")) {
          code = "sh" + code;
        } else if (code.startsWith("00") || code.startsWith("30") || code.startsWith("20")) {
          code = "sz" + code;
        } else if (code.startsWith("30") || code.startsWith("43") || code.startsWith("83") || code.startsWith("87")) {
          code = "bj" + code;
        } else {
          code = "sz" + code;
        }
      } else if (code.length === 5) {
        code = "hk" + code;
      } else if (code.length < 5) {
        // Pad to 5-digit HK stock index
        code = "hk" + code.padStart(5, "0");
      }
    }

    const response = await fetch(`https://qt.gtimg.cn/q=${code}`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态码: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    const text = decoder.decode(arrayBuffer);
    
    const cleanText = text.trim();
    if (cleanText.includes("pv_none_match") || cleanText.length < 10) {
      return res.status(404).json({ error: "未找到该股票数据，请检查代码格式是否正确 (例如: sh600519, sz000001, hk00700, usAAPL)" });
    }

    const eqIndex = cleanText.indexOf("=");
    if (eqIndex === -1) {
      return res.status(404).json({ error: "解析股票数据失败" });
    }

    const quoteStr = cleanText.substring(eqIndex + 2, cleanText.length - 2); // strip v_xxx=" and ";
    const parts = quoteStr.split("~");
    if (parts.length < 4) {
      return res.status(404).json({ error: "股票数据格式异常" });
    }

    const rawPrice = parseFloat(parts[3]);
    let currency = "CNY";
    let exchangeRate = 1.0;
    const name = parts[1] || "未知名";

    if (code.startsWith("us")) {
      currency = "USD";
      exchangeRate = 7.24; // Reference US-to-CNY exchange rate
    } else if (code.startsWith("hk")) {
      currency = "HKD";
      exchangeRate = 0.925; // Reference HKD-to-CNY exchange rate
    }

    const cnyPrice = rawPrice * exchangeRate;

    res.json({
      success: true,
      code: code,
      name: name,
      price: rawPrice,
      currency: currency,
      exchangeRate: exchangeRate,
      cnyPrice: cnyPrice
    });
  } catch (error: any) {
    res.status(500).json({ error: `查询失败: ${error.message}` });
  }
});

// REST API
app.get("/api/db", (req, res) => {
  const data = readDatabase();
  res.json(data);
});

app.post("/api/db/update", (req, res) => {
  try {
    const data = req.body;
    if (!data.assets || !data.members || !data.currencies) {
      return res.status(400).json({ error: "Invalid database structure" });
    }
    writeDatabase(data);
    res.json({ success: true, message: "数据库更新成功" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create backup manual export
app.get("/api/db/backup", (req, res) => {
  try {
    const database = readDatabase();
    res.setHeader("Content-disposition", "attachment; filename=nas_asset_backup.json");
    res.setHeader("Content-type", "application/json");
    res.write(JSON.stringify(database, null, 2));
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NAS Asset Manager Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
