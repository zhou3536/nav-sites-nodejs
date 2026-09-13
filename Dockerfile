FROM node:22-alpine

WORKDIR /app

# 设置时区和环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

# 安装依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 拷贝应用代码及静态文件
COPY src/ ./src/
COPY public/ ./public/

# 创建数据卷挂载点
RUN mkdir -p /app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "src/server.js"]
