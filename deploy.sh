#!/bin/bash
# ============================================
# TimeBlank 部署脚本
# 用法: bash deploy.sh
# ============================================

set -e

echo "📦 开始构建 TimeBlank..."

# 1. 构建项目
npm run build

# 2. 准备部署目录
DEPLOY_DIR="./deploy-package"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 3. 找到 standalone 中 server.js 的位置（排除 node_modules 下的）
SERVER_JS=$(find .next/standalone -maxdepth 5 -name "server.js" -not -path "*/node_modules/*" | head -1)
SERVER_DIR=$(dirname "$SERVER_JS")

echo "📁 找到 standalone 输出: $SERVER_DIR"

# 4. 复制 standalone 产物
cp -r "$SERVER_DIR/"* "$DEPLOY_DIR/"
# 也复制 .next 子目录（如果在 standalone 里面有）
if [ -d "$SERVER_DIR/.next" ]; then
  cp -r "$SERVER_DIR/.next" "$DEPLOY_DIR/"
fi

# 5. 复制静态资源（standalone 模式不自动包含）
mkdir -p "$DEPLOY_DIR/.next/static"
cp -r .next/static/* "$DEPLOY_DIR/.next/static/"

# 6. 复制 public 目录（如果有）
if [ -d "public" ]; then
  cp -r public "$DEPLOY_DIR/public"
fi

# 7. 确保 better-sqlite3 原生模块存在
if [ ! -d "$DEPLOY_DIR/node_modules/better-sqlite3" ]; then
  echo "📋 补充 better-sqlite3 原生模块..."
  mkdir -p "$DEPLOY_DIR/node_modules"
  cp -r node_modules/better-sqlite3 "$DEPLOY_DIR/node_modules/"
  cp -r node_modules/bindings "$DEPLOY_DIR/node_modules/" 2>/dev/null || true
  cp -r node_modules/file-uri-to-path "$DEPLOY_DIR/node_modules/" 2>/dev/null || true
  cp -r node_modules/node-addon-api "$DEPLOY_DIR/node_modules/" 2>/dev/null || true
fi

# 8. 创建启动脚本
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
# TimeBlank 启动脚本
# 默认端口 3000，可通过环境变量 PORT 修改
export PORT=${PORT:-3000}
export HOSTNAME="0.0.0.0"
echo "🚀 TimeBlank 启动中... 端口: $PORT"
node server.js
EOF
chmod +x "$DEPLOY_DIR/start.sh"

# 9. 创建 PM2 ecosystem 配置
cat > "$DEPLOY_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: "timeblank",
    script: "server.js",
    env: {
      PORT: 3000,
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "production",
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "256M",
  }]
};
EOF

echo ""
echo "✅ 构建完成！部署包位于: $DEPLOY_DIR/"
echo ""
echo "=========================================="
echo "📋 部署到服务器步骤："
echo "=========================================="
echo ""
echo "1. 将 deploy-package/ 整个目录上传到服务器:"
echo "   scp -r deploy-package/ user@your-server:/opt/timeblank"
echo ""
echo "2. SSH 登录服务器，安装 Node.js >= 18:"
echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
echo "   sudo apt install -y nodejs"
echo ""
echo "3. 安装 PM2 并启动:"
echo "   sudo npm install -g pm2"
echo "   cd /opt/timeblank"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup    # 设置开机自启"
echo ""
echo "4. 配置 Nginx 反向代理 (可选，推荐):"
echo "   详见项目中的 nginx.conf.example"
echo ""
echo "5. 访问 http://your-server-ip:3000"
echo "=========================================="
