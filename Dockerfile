# 使用轻量级的 Node.js 镜像作为基础
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目代码
COPY . .

# 执行打包
RUN npm run build

# 生产环境运行阶段
FROM node:20-slim

WORKDIR /app

# 只要复制编译好的 dist 目录（包含前端静态文件和 server.cjs）
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 安装生产环境依赖
RUN npm install --production

# 暴露端口
EXPOSE 3000

# 挂载卷的建议：
# 你的数据文件 db.json 默认保存在 /app/data 目录下
VOLUME ["/app/data"]

# 启动命令
CMD ["node", "dist/server.cjs"]
