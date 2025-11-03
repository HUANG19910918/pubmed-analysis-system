# PubMed文献分析系统部署指南

本指南将帮助您将PubMed文献分析系统部署到云端，让您能在任何电脑上访问使用。

## 🚀 推荐部署方案：Vercel云端部署

### 前置准备

1. **注册Vercel账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用GitHub账号注册（推荐）

2. **准备API密钥**
   - DeepSeek API密钥（用于AI分析功能）
   - 访问 [platform.deepseek.com](https://platform.deepseek.com) 获取

### 部署步骤

#### 方法一：通过Vercel CLI部署（推荐）

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录Vercel**
   ```bash
   vercel login
   ```

3. **在项目根目录执行部署**
   ```bash
   vercel
   ```

4. **配置环境变量**
   在Vercel控制台中设置以下环境变量：
   ```
   SUPABASE_URL=https://dmwmlrevtgkkkhpvreth.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtd21scmV2dGdra2tocHZyZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NjgzMTgsImV4cCI6MjA3NzU0NDMxOH0.TysrDvpSNQEm1SOkOWtqVGUo069g44pwcol1y0i_IVQ
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtd21scmV2dGdra2tocHZyZXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk2ODMxOCwiZXhwIjoyMDc3NTQ0MzE4fQ.72XRalLDT4OJ4YGqkYS1-IvCHBuVeFD1GT2h9ax1aGw
   DEEPSEEK_API_KEY=您的DeepSeek API密钥
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   NODE_ENV=production
   JWT_SECRET=您的JWT密钥（建议使用强密码）
   PUBMED_BASE_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
   ```

#### 方法二：通过GitHub集成部署

1. **将代码推送到GitHub**
   ```bash
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. **在Vercel中导入项目**
   - 登录Vercel控制台
   - 点击"New Project"
   - 选择您的GitHub仓库
   - 配置环境变量（同上）

### 部署后验证

1. **访问部署的网站**
   - Vercel会提供一个类似 `https://your-project.vercel.app` 的URL

2. **测试功能**
   - 文献搜索功能
   - AI分析功能
   - 关键词可视化
   - 数据保存和加载

## 🔧 备选部署方案

### 方案二：Netlify部署

1. **注册Netlify账号**
   - 访问 [netlify.com](https://netlify.com)

2. **构建项目**
   ```bash
   npm run build
   ```

3. **手动上传或Git集成**
   - 拖拽dist文件夹到Netlify
   - 或连接GitHub仓库

4. **配置环境变量**
   在Netlify控制台的Environment Variables中设置相同的环境变量

### 方案三：本地网络共享

如果只需要在局域网内访问：

1. **修改开发服务器配置**
   ```bash
   # 在package.json中修改dev脚本
   "client:dev": "vite --host 0.0.0.0"
   ```

2. **启动服务**
   ```bash
   npm run dev
   ```

3. **获取本机IP地址**
   ```bash
   ipconfig
   ```

4. **局域网访问**
   其他设备通过 `http://您的IP地址:5173` 访问

### 方案四：Docker容器化部署

1. **创建Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **构建和运行**
   ```bash
   docker build -t pubmed-analysis .
   docker run -p 3000:3000 pubmed-analysis
   ```

## 🔍 故障排除

### 常见问题

1. **构建失败**
   - 检查Node.js版本（推荐18+）
   - 确保所有依赖正确安装：`npm install`
   - 检查TypeScript编译：`npm run check`

2. **API调用失败**
   - 验证环境变量是否正确设置
   - 检查DeepSeek API密钥是否有效
   - 确认网络连接正常

3. **数据库连接问题**
   - 验证Supabase配置
   - 检查数据库表是否存在
   - 确认API密钥权限

4. **页面加载缓慢**
   - 检查网络连接
   - 优化图片和资源加载
   - 考虑使用CDN

### 性能优化建议

1. **启用缓存**
   - 配置浏览器缓存
   - 使用Vercel的边缘缓存

2. **代码分割**
   - 已配置动态导入
   - 按需加载组件

3. **图片优化**
   - 使用WebP格式
   - 配置响应式图片

## 📞 技术支持

如果遇到部署问题，请检查：

1. **日志信息**
   - Vercel部署日志
   - 浏览器控制台错误
   - 网络请求状态

2. **配置文件**
   - vercel.json配置
   - package.json脚本
   - 环境变量设置

3. **依赖版本**
   - Node.js版本兼容性
   - npm包版本冲突

## 🎉 部署完成

部署成功后，您就可以：

- 在任何设备上访问系统
- 分享链接给其他用户
- 享受云端数据同步
- 获得更好的性能和稳定性

祝您使用愉快！🚀