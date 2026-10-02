# Infinite Canvas R2 Media Worker

这是视频工作台的最小公网图片存储网关。R2 Access Key 和 Secret 只保存在 Cloudflare Worker 绑定中，浏览器只请求 Worker 的上传地址。

## 部署

```bash
bun install
npx wrangler login
npx wrangler r2 bucket create infinite-canvas-media
npx wrangler deploy
```

如果 Worker 使用自定义域名或希望返回固定域名，修改 `wrangler.toml` 中的 `PUBLIC_BASE_URL`，例如 `https://media.example.com`。留空时会使用当前 Worker 域名。

部署后的地址支持：

- `POST /upload`：请求体为图片二进制，`Content-Type` 必须是 `image/*`。
- `GET /media/<key>`：公开读取已上传图片。
- `OPTIONS /upload`：浏览器跨域预检。

然后把 Worker 地址配置到前端：

- Docker：`MEDIA_UPLOAD_URL=https://your-worker.workers.dev`
- Vite 构建：`VITE_MEDIA_UPLOAD_URL=https://your-worker.workers.dev`

不要把 R2 API Token、Access Key 或 Secret 放入前端环境变量。
